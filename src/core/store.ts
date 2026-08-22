import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  Evidence,
  Project,
  ProjectEdge,
  ProjectEvent,
  ProjectGraph,
  ProjectNode,
  ProjectSummary,
  StateTransition,
} from "./types.js";

type Row = Record<string, unknown>;

function parse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asNode(row: Row): ProjectNode {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    kind: row.kind as ProjectNode["kind"],
    title: String(row.title),
    ...(row.description ? { description: String(row.description) } : {}),
    weight: Number(row.weight),
    status: row.status as ProjectNode["status"],
    progress: Number(row.progress),
    ...(row.blocked_reason
      ? { blockedReason: String(row.blocked_reason) }
      : {}),
    criteria: parse(row.criteria_json, []),
    metadata: parse(row.metadata_json, {}),
  };
}

function asEvent(row: Row): ProjectEvent {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    source: String(row.source),
    type: String(row.type),
    occurredAt: String(row.occurred_at),
    ...(row.actor ? { actor: String(row.actor) } : {}),
    observedAt: String(row.observed_at),
    integrityHash: String(row.integrity_hash),
    payload: parse(row.payload_json, {}),
  };
}

function asEvidence(row: Row): Evidence {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    nodeId: String(row.node_id),
    criterionId: String(row.criterion_id),
    eventId: String(row.event_id),
    source: String(row.source),
    summary: String(row.summary),
    verdict: row.verdict as Evidence["verdict"],
    confidence: Number(row.confidence),
    observedAt: String(row.observed_at),
    payload: parse(row.payload_json, {}),
  };
}

export class VeriplaneStore {
  readonly db: DatabaseSync;

  constructor(
    path = process.env.VERIPLANE_DB_PATH ?? ".veriplane/veriplane.db",
  ) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        objective TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        weight REAL NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'unverified',
        progress REAL NOT NULL DEFAULT 0,
        blocked_reason TEXT,
        criteria_json TEXT NOT NULL DEFAULT '[]',
        metadata_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS nodes_project_idx ON nodes(project_id);
      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        from_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        to_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        relation TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        actor TEXT,
        occurred_at TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        integrity_hash TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_project_time_idx ON events(project_id, occurred_at DESC);
      CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        criterion_id TEXT NOT NULL,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        source TEXT NOT NULL,
        summary TEXT NOT NULL,
        verdict TEXT NOT NULL,
        confidence REAL NOT NULL,
        observed_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        UNIQUE(node_id, criterion_id, event_id)
      );
      CREATE INDEX IF NOT EXISTS evidence_node_idx ON evidence(node_id, observed_at DESC);
      CREATE TABLE IF NOT EXISTS state_transitions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      );
    `);
  }

  close(): void {
    this.db.close();
  }

  reset(): void {
    this.db.exec(
      "DELETE FROM state_transitions; DELETE FROM evidence; DELETE FROM events; DELETE FROM edges; DELETE FROM nodes; DELETE FROM projects;",
    );
  }

  upsertGraph(graph: ProjectGraph): void {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(
          `
        INSERT INTO projects (id, name, objective, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, objective=excluded.objective,
          description=excluded.description, updated_at=excluded.updated_at
      `,
        )
        .run(
          graph.project.id,
          graph.project.name,
          graph.project.objective,
          graph.project.description ?? null,
          graph.project.createdAt,
          graph.project.updatedAt,
        );

      const nodeStatement = this.db.prepare(`
        INSERT INTO nodes (id, project_id, kind, title, description, weight, status, progress, blocked_reason, criteria_json, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, title=excluded.title,
          description=excluded.description, weight=excluded.weight, criteria_json=excluded.criteria_json,
          metadata_json=excluded.metadata_json
      `);
      for (const node of graph.nodes) {
        nodeStatement.run(
          node.id,
          node.projectId,
          node.kind,
          node.title,
          node.description ?? null,
          node.weight,
          node.status,
          node.progress,
          node.blockedReason ?? null,
          JSON.stringify(node.criteria),
          JSON.stringify(node.metadata ?? {}),
        );
      }

      const edgeStatement = this.db.prepare(`
        INSERT INTO edges (id, project_id, from_node_id, to_node_id, relation)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET from_node_id=excluded.from_node_id, to_node_id=excluded.to_node_id, relation=excluded.relation
      `);
      for (const edge of graph.edges)
        edgeStatement.run(
          edge.id,
          edge.projectId,
          edge.from,
          edge.to,
          edge.relation,
        );
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  hasProject(projectId: string): boolean {
    return Boolean(
      this.db.prepare("SELECT 1 FROM projects WHERE id = ?").get(projectId),
    );
  }

  getGraph(projectId: string): ProjectGraph | undefined {
    const row = this.db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(projectId) as Row | undefined;
    if (!row) return undefined;
    const project: Project = {
      id: String(row.id),
      name: String(row.name),
      objective: String(row.objective),
      ...(row.description ? { description: String(row.description) } : {}),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
    const nodes = (
      this.db
        .prepare(
          "SELECT * FROM nodes WHERE project_id = ? ORDER BY kind, title",
        )
        .all(projectId) as Row[]
    ).map(asNode);
    const edges = (
      this.db
        .prepare("SELECT * FROM edges WHERE project_id = ?")
        .all(projectId) as Row[]
    ).map((edge): ProjectEdge => ({
      id: String(edge.id),
      projectId: String(edge.project_id),
      from: String(edge.from_node_id),
      to: String(edge.to_node_id),
      relation: edge.relation as ProjectEdge["relation"],
    }));
    return { project, nodes, edges };
  }

  listProjects(): ProjectSummary[] {
    const projects = this.db
      .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
      .all() as Row[];
    return projects.map((row) => {
      const projectId = String(row.id);
      const tasks = this.db
        .prepare(
          "SELECT status, progress, weight, title FROM nodes WHERE project_id = ? AND kind = 'task'",
        )
        .all(projectId) as Row[];
      const weight =
        tasks.reduce((sum, task) => sum + Number(task.weight), 0) || 1;
      const progress = Math.round(
        tasks.reduce(
          (sum, task) => sum + Number(task.progress) * Number(task.weight),
          0,
        ) / weight,
      );
      const blocked = tasks.filter((task) => task.status === "blocked");
      const next =
        tasks.find((task) => task.status === "in_progress") ??
        tasks.find((task) => task.status === "unverified") ??
        blocked[0];
      return {
        id: projectId,
        name: String(row.name),
        objective: String(row.objective),
        ...(row.description ? { description: String(row.description) } : {}),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        progress,
        verifiedTasks: tasks.filter((task) => task.status === "verified")
          .length,
        totalTasks: tasks.length,
        blockedTasks: blocked.length,
        ...(next ? { nextAction: String(next.title) } : {}),
      };
    });
  }

  appendEvent(event: ProjectEvent): boolean {
    const result = this.db
      .prepare(
        `
      INSERT OR IGNORE INTO events (id, project_id, source, type, actor, occurred_at, observed_at, integrity_hash, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        event.id,
        event.projectId,
        event.source,
        event.type,
        event.actor ?? null,
        event.occurredAt,
        event.observedAt,
        event.integrityHash,
        JSON.stringify(event.payload),
      );
    return Number(result.changes) > 0;
  }

  listEvents(projectId: string, limit = 100): ProjectEvent[] {
    return (
      this.db
        .prepare(
          "SELECT * FROM events WHERE project_id = ? ORDER BY occurred_at DESC LIMIT ?",
        )
        .all(projectId, limit) as Row[]
    ).map(asEvent);
  }

  addEvidence(evidence: Evidence): boolean {
    const result = this.db
      .prepare(
        `
      INSERT OR IGNORE INTO evidence (id, project_id, node_id, criterion_id, event_id, source, summary, verdict, confidence, observed_at, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        evidence.id,
        evidence.projectId,
        evidence.nodeId,
        evidence.criterionId,
        evidence.eventId,
        evidence.source,
        evidence.summary,
        evidence.verdict,
        evidence.confidence,
        evidence.observedAt,
        JSON.stringify(evidence.payload),
      );
    return Number(result.changes) > 0;
  }

  listEvidence(projectId: string, nodeId?: string): Evidence[] {
    const rows = nodeId
      ? this.db
          .prepare(
            "SELECT * FROM evidence WHERE project_id = ? AND node_id = ? ORDER BY observed_at DESC",
          )
          .all(projectId, nodeId)
      : this.db
          .prepare(
            "SELECT * FROM evidence WHERE project_id = ? ORDER BY observed_at DESC",
          )
          .all(projectId);
    return (rows as Row[]).map(asEvidence);
  }

  updateNode(
    nodeId: string,
    status: ProjectNode["status"],
    progress: number,
    blockedReason?: string,
  ): void {
    this.db
      .prepare(
        "UPDATE nodes SET status = ?, progress = ?, blocked_reason = ? WHERE id = ?",
      )
      .run(status, progress, blockedReason ?? null, nodeId);
  }

  addTransition(transition: StateTransition): void {
    this.db
      .prepare(
        `
      INSERT OR IGNORE INTO state_transitions (id, project_id, node_id, from_status, to_status, reason, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        transition.id,
        transition.projectId,
        transition.nodeId,
        transition.fromStatus,
        transition.toStatus,
        transition.reason,
        transition.occurredAt,
      );
  }

  listTransitions(projectId: string, limit = 100): StateTransition[] {
    return (
      this.db
        .prepare(
          "SELECT * FROM state_transitions WHERE project_id = ? ORDER BY occurred_at DESC LIMIT ?",
        )
        .all(projectId, limit) as Row[]
    ).map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      nodeId: String(row.node_id),
      fromStatus: row.from_status as StateTransition["fromStatus"],
      toStatus: row.to_status as StateTransition["toStatus"],
      reason: String(row.reason),
      occurredAt: String(row.occurred_at),
    }));
  }
}
