import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { IncomingEvent } from "../core/types.js";
import type { Connector, ConnectorContext, ConnectorResult } from "./types.js";

async function walk(
  directory: string,
  root: string,
  projectId: string,
  events: IncomingEvent[],
): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, root, projectId, events);
    else if (/\.(md|mdx|txt)$/i.test(entry.name)) {
      const info = await stat(absolute);
      const path = absolute.slice(root.length + 1);
      events.push({
        id: `markdown_${projectId}_${path}_${info.mtimeMs}`,
        projectId,
        source: "markdown",
        type: "document.updated",
        occurredAt: info.mtime.toISOString(),
        payload: { path, bytes: info.size, summary: `${path} updated` },
      });
    }
  }
}

export class MarkdownConnector implements Connector {
  readonly id = "markdown";
  readonly label = "Markdown / Obsidian";
  readonly mode = "local" as const;
  configured(): boolean {
    return true;
  }
  async sync(context: ConnectorContext): Promise<ConnectorResult> {
    const rawPath = context.config.path;
    if (typeof rawPath !== "string")
      throw new Error("Markdown connector requires config.path");
    const root = resolve(rawPath);
    const events: IncomingEvent[] = [];
    await walk(root, root, context.projectId, events);
    return { connector: this.id, events, warnings: [] };
  }
}
