export type NodeStatus = "unverified" | "in_progress" | "verified" | "blocked";

export interface Summary {
  id: string;
  name: string;
  objective: string;
  description?: string;
  progress: number;
  verifiedTasks: number;
  totalTasks: number;
  blockedTasks: number;
  nextAction?: string;
  updatedAt: string;
}

export interface Criterion {
  id: string;
  label: string;
  required?: boolean;
  minCount?: number;
}
export interface ProjectNode {
  id: string;
  kind: "goal" | "milestone" | "task" | "artifact" | "integration";
  title: string;
  description?: string;
  weight: number;
  status: NodeStatus;
  progress: number;
  blockedReason?: string;
  criteria: Criterion[];
}
export interface ProjectEdge {
  id: string;
  from: string;
  to: string;
  relation: "contains" | "depends_on" | "produces" | "uses";
}
export interface Evidence {
  id: string;
  nodeId: string;
  criterionId: string;
  source: string;
  summary: string;
  verdict: "supports" | "contradicts";
  confidence: number;
  observedAt: string;
  payload: Record<string, unknown>;
}
export interface ProjectEvent {
  id: string;
  source: string;
  type: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  integrityHash: string;
}
export interface ProjectDetail {
  project: {
    id: string;
    name: string;
    objective: string;
    description?: string;
  };
  summary: Summary;
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  evidence: Evidence[];
  events: ProjectEvent[];
}
export interface Provider {
  id: string;
  label: string;
  available: boolean;
}
export interface Connector {
  id: string;
  label: string;
  mode: string;
  configured: boolean;
}
