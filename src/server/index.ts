import { createReadStream, existsSync, statSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { ConnectorRegistry } from "../connectors/registry.js";
import { GitHubConnector } from "../connectors/github.js";
import { EvidenceEngine } from "../core/engine.js";
import { VeriplaneStore } from "../core/store.js";
import { seedDemo } from "../demo.js";
import { ProviderRegistry } from "../providers/registry.js";
import { chatSchema, connectorSyncSchema, eventSchema } from "./schema.js";

const port = Number(process.env.VERIPLANE_PORT ?? 4317);
const host = process.env.VERIPLANE_HOST ?? "127.0.0.1";
const dbPath = process.env.VERIPLANE_DB_PATH ?? ".veriplane/demo.db";
const store = new VeriplaneStore(dbPath);
if (store.listProjects().length === 0) seedDemo(store);
const engine = new EvidenceEngine(store);
const providers = new ProviderRegistry();
const connectors = new ConnectorRegistry();
const webRoot = resolve(process.cwd(), "dist/web");

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  response.end(JSON.stringify(body));
}

async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > 1_000_000) throw new Error("Request body exceeds 1 MB");
    chunks.push(value);
  }
  return chunks.length
    ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
    : {};
}

function detail(projectId: string): unknown {
  const graph = store.getGraph(projectId);
  if (!graph) return undefined;
  return {
    ...graph,
    summary: store.listProjects().find((project) => project.id === projectId),
    evidence: store.listEvidence(projectId),
    events: store.listEvents(projectId, 100),
    transitions: store.listTransitions(projectId, 100),
  };
}

function stateContext(projectId: string): string {
  const data = detail(projectId) as ReturnType<typeof detail> & {
    summary?: { progress?: number };
    nodes?: Array<{
      kind: string;
      status: string;
      title: string;
      blockedReason?: string;
    }>;
  };
  if (!data) throw new Error(`Unknown project: ${projectId}`);
  const tasks = data.nodes?.filter((node) => node.kind === "task") ?? [];
  const blockers =
    tasks
      .filter((node) => node.status === "blocked")
      .map((node) => `${node.title}: ${node.blockedReason ?? "blocked"}`)
      .join("; ") || "none";
  const state = tasks
    .map((node) => `- ${node.title}: ${node.status}`)
    .join("\n");
  return `You are Veriplane's project copilot. Never claim completion without recorded evidence.\nPROJECT PROGRESS: ${data.summary?.progress ?? 0}%\nBLOCKERS: ${blockers}\nTASK STATE:\n${state}`;
}

async function api(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (url.pathname === "/api/health" && request.method === "GET") {
    json(response, 200, {
      ok: true,
      service: "veriplane",
      version: "0.1.0",
      database: dbPath,
    });
    return true;
  }
  if (url.pathname === "/api/projects" && request.method === "GET") {
    json(response, 200, { projects: store.listProjects() });
    return true;
  }
  const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch && request.method === "GET") {
    const data = detail(decodeURIComponent(projectMatch[1]!));
    json(response, data ? 200 : 404, data ?? { error: "Project not found" });
    return true;
  }
  const reconcileMatch = url.pathname.match(
    /^\/api\/projects\/([^/]+)\/reconcile$/,
  );
  if (reconcileMatch && request.method === "POST") {
    json(
      response,
      200,
      engine.reconcile(decodeURIComponent(reconcileMatch[1]!)),
    );
    return true;
  }
  if (url.pathname === "/api/events" && request.method === "POST") {
    const token = process.env.VERIPLANE_INGEST_TOKEN;
    if (token && request.headers.authorization !== `Bearer ${token}`) {
      json(response, 401, { error: "Invalid ingest token" });
      return true;
    }
    const parsed = eventSchema.parse(await body(request));
    json(response, 202, engine.ingest(parsed));
    return true;
  }
  if (url.pathname === "/api/providers" && request.method === "GET") {
    json(response, 200, { providers: await providers.list() });
    return true;
  }
  if (url.pathname === "/api/connectors" && request.method === "GET") {
    json(response, 200, { connectors: connectors.list() });
    return true;
  }
  const connectorMatch = url.pathname.match(
    /^\/api\/connectors\/([^/]+)\/sync$/,
  );
  if (connectorMatch && request.method === "POST") {
    const connector = connectors.get(decodeURIComponent(connectorMatch[1]!));
    if (!connector) {
      json(response, 404, { error: "Connector not found" });
      return true;
    }
    const parsed = connectorSyncSchema.parse(await body(request));
    const result = await connector.sync(parsed);
    const ingested = result.events.map((item) => engine.ingest(item));
    json(response, 200, { ...result, ingested: ingested.length });
    return true;
  }
  if (url.pathname === "/api/webhooks/github" && request.method === "POST") {
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      json(response, 400, { error: "projectId query parameter is required" });
      return true;
    }
    const eventName = String(request.headers["x-github-event"] ?? "");
    const delivery = String(request.headers["x-github-delivery"] ?? "unknown");
    const normalizer = connectors.get("github") as GitHubConnector;
    const normalized = normalizer.fromWebhook(
      projectId,
      eventName,
      delivery,
      (await body(request)) as Record<string, unknown>,
    );
    normalized.forEach((item) => engine.ingest(item));
    json(response, 202, { accepted: normalized.length });
    return true;
  }
  if (url.pathname === "/api/chat" && request.method === "POST") {
    const parsed = chatSchema.parse(await body(request));
    const result = await providers.generate(parsed.provider, {
      model: parsed.model,
      messages: [
        { role: "system", content: stateContext(parsed.projectId) },
        { role: "user", content: parsed.prompt },
      ],
    });
    json(response, 200, result);
    return true;
  }
  return false;
}

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function staticFile(response: ServerResponse, pathname: string): void {
  const requested =
    pathname === "/"
      ? "index.html"
      : normalize(pathname)
          .replace(/^(\.\.[/\\])+/, "")
          .replace(/^[/\\]/, "");
  let file = join(webRoot, requested);
  if (
    !file.startsWith(webRoot) ||
    !existsSync(file) ||
    statSync(file).isDirectory()
  )
    file = join(webRoot, "index.html");
  if (!existsSync(file)) {
    json(response, 404, { error: "Web build not found. Run pnpm build:web." });
    return;
  }
  response.writeHead(200, {
    "content-type": mime[extname(file)] ?? "application/octet-stream",
    "cache-control": file.endsWith("index.html")
      ? "no-cache"
      : "public, max-age=31536000, immutable",
  });
  createReadStream(file).pipe(response);
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    });
    response.end();
    return;
  }
  try {
    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? "localhost"}`,
    );
    if (await api(request, response, url)) return;
    staticFile(response, url.pathname);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    json(response, message.includes("Unknown project") ? 404 : 400, {
      error: message,
    });
  }
});

server.listen(port, host, () => {
  console.log(`Veriplane running at http://${host}:${port}`);
});

function shutdown(): void {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
