export type NodeKind =
  "goal" | "milestone" | "task" | "artifact" | "integration";
export type NodeStatus = "unverified" | "in_progress" | "verified" | "blocked";
export type EdgeRelation = "contains" | "depends_on" | "produces" | "uses";
export type EvidenceVerdict = "supports" | "contradicts";

export interface EvidenceCriterion {
  id: string;
  label: string;
  eventType: string;
  source?: string;
  match?: Record<string, string | number | boolean>;
  required?: boolean;
  minCount?: number;
  maxAgeHours?: number;
}

export interface ProjectNode {
  id: string;
  projectId: string;
  kind: NodeKind;
  title: string;
  description?: string;
  weight: number;
  status: NodeStatus;
  progress: number;
  blockedReason?: string;
  criteria: EvidenceCriterion[];
  metadata?: Record<string, unknown>;
}

export interface ProjectEdge {
  id: string;
  projectId: string;
  from: string;
  to: string;
  relation: EdgeRelation;
}

export interface Project {
  id: string;
  name: string;
  objective: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectGraph {
  project: Project;
  nodes: ProjectNode[];
  edges: ProjectEdge[];
}

export interface IncomingEvent {
  id?: string;
  projectId: string;
  source: string;
  type: string;
  occurredAt?: string;
  actor?: string;
  payload: Record<string, unknown>;
}

export interface ProjectEvent extends Required<Omit<IncomingEvent, "actor">> {
  actor?: string;
  observedAt: string;
  integrityHash: string;
}

export interface Evidence {
  id: string;
  projectId: string;
  nodeId: string;
  criterionId: string;
  eventId: string;
  source: string;
  summary: string;
  verdict: EvidenceVerdict;
  confidence: number;
  observedAt: string;
  payload: Record<string, unknown>;
}

export interface StateTransition {
  id: string;
  projectId: string;
  nodeId: string;
  fromStatus: NodeStatus;
  toStatus: NodeStatus;
  reason: string;
  occurredAt: string;
}

export interface ProjectSummary extends Project {
  progress: number;
  verifiedTasks: number;
  totalTasks: number;
  blockedTasks: number;
  nextAction?: string;
}

export interface ReconciliationResult {
  projectId: string;
  progress: number;
  transitions: StateTransition[];
  matchedEvidence: Evidence[];
}
