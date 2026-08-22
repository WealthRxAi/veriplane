import { randomUUID } from "node:crypto";
import { sha256 } from "./hash.js";
import { VeriplaneStore } from "./store.js";
import type {
  Evidence,
  EvidenceCriterion,
  IncomingEvent,
  NodeStatus,
  ProjectEvent,
  ProjectNode,
  ReconciliationResult,
  StateTransition,
} from "./types.js";

function getPath(payload: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, payload);
}

function criterionMatches(
  criterion: EvidenceCriterion,
  event: ProjectEvent,
): boolean {
  if (criterion.eventType !== event.type) return false;
  if (criterion.source && criterion.source !== event.source) return false;
  return Object.entries(criterion.match ?? {}).every(
    ([path, expected]) => getPath(event.payload, path) === expected,
  );
}

function isFresh(
  evidence: Evidence,
  criterion: EvidenceCriterion,
  now: Date,
  eventsById: Map<string, ProjectEvent>,
): boolean {
  if (!criterion.maxAgeHours) return true;
  const sourceEvent = eventsById.get(evidence.eventId);
  const age =
    now.getTime() -
    new Date(sourceEvent?.occurredAt ?? evidence.observedAt).getTime();
  return age <= criterion.maxAgeHours * 3_600_000;
}

function evidenceSummary(
  event: ProjectEvent,
  criterion: EvidenceCriterion,
): string {
  const explicit = event.payload.summary;
  if (typeof explicit === "string" && explicit.trim()) return explicit;
  return `${criterion.label} confirmed by ${event.source}`;
}

function statusFor(
  node: ProjectNode,
  evidence: Evidence[],
  events: ProjectEvent[],
  now: Date,
): {
  status: NodeStatus;
  progress: number;
  reason: string;
  blockedReason?: string;
} {
  const relevantBlockers = events.filter(
    (event) =>
      event.type === "task.blocked" && event.payload.nodeId === node.id,
  );
  const relevantClears = events.filter(
    (event) =>
      event.type === "task.unblocked" && event.payload.nodeId === node.id,
  );
  const lastBlocked = relevantBlockers[0];
  const lastCleared = relevantClears[0];
  if (
    lastBlocked &&
    (!lastCleared ||
      new Date(lastBlocked.occurredAt) > new Date(lastCleared.occurredAt))
  ) {
    const blockedReason =
      typeof lastBlocked.payload.reason === "string"
        ? lastBlocked.payload.reason
        : "External dependency is blocked";
    return {
      status: "blocked",
      progress: Math.max(node.progress, 15),
      reason: blockedReason,
      blockedReason,
    };
  }

  const required = node.criteria.filter(
    (criterion) => criterion.required !== false,
  );
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const criterionScores = required.map((criterion) => {
    const matches = evidence.filter(
      (item) =>
        item.criterionId === criterion.id &&
        item.verdict === "supports" &&
        isFresh(item, criterion, now, eventsById),
    );
    return Math.min(1, matches.length / (criterion.minCount ?? 1));
  });
  const met = criterionScores.filter((score) => score === 1).length;
  if (required.length > 0 && met === required.length) {
    return {
      status: "verified",
      progress: 100,
      reason: `${met}/${required.length} required checks have current evidence`,
    };
  }
  if (evidence.length > 0) {
    const ratio = required.length
      ? criterionScores.reduce((sum, score) => sum + score, 0) / required.length
      : 0.35;
    return {
      status: "in_progress",
      progress: Math.max(20, Math.round(ratio * 85)),
      reason: `${met}/${required.length} required checks are fully evidenced`,
    };
  }
  return {
    status: "unverified",
    progress: 0,
    reason: "No matching evidence observed",
  };
}

export class EvidenceEngine {
  constructor(private readonly store: VeriplaneStore) {}

  ingest(
    input: IncomingEvent,
  ): ReconciliationResult & { event: ProjectEvent; duplicate: boolean } {
    if (!this.store.hasProject(input.projectId))
      throw new Error(`Unknown project: ${input.projectId}`);
    const observedAt = new Date().toISOString();
    const occurredAt = input.occurredAt ?? observedAt;
    const core = {
      projectId: input.projectId,
      source: input.source,
      type: input.type,
      occurredAt,
      actor: input.actor,
      payload: input.payload,
    };
    const integrityHash = sha256(core);
    const event: ProjectEvent = {
      id: input.id ?? `evt_${integrityHash.slice(0, 20)}`,
      projectId: input.projectId,
      source: input.source,
      type: input.type,
      occurredAt,
      observedAt,
      integrityHash,
      payload: input.payload,
      ...(input.actor ? { actor: input.actor } : {}),
    };
    const inserted = this.store.appendEvent(event);
    const result = this.reconcile(input.projectId);
    return { ...result, event, duplicate: !inserted };
  }

  reconcile(projectId: string): ReconciliationResult {
    const graph = this.store.getGraph(projectId);
    if (!graph) throw new Error(`Unknown project: ${projectId}`);
    const events = this.store.listEvents(projectId, 10_000);
    const matchedEvidence: Evidence[] = [];

    for (const node of graph.nodes.filter((item) => item.kind === "task")) {
      for (const criterion of node.criteria) {
        for (const event of events.filter((item) =>
          criterionMatches(criterion, item),
        )) {
          const evidence: Evidence = {
            id: `evd_${sha256([node.id, criterion.id, event.id]).slice(0, 20)}`,
            projectId,
            nodeId: node.id,
            criterionId: criterion.id,
            eventId: event.id,
            source: event.source,
            summary: evidenceSummary(event, criterion),
            verdict:
              event.payload.verdict === "contradicts"
                ? "contradicts"
                : "supports",
            confidence:
              typeof event.payload.confidence === "number"
                ? event.payload.confidence
                : 1,
            observedAt: event.observedAt,
            payload: event.payload,
          };
          if (this.store.addEvidence(evidence)) matchedEvidence.push(evidence);
        }
      }
    }

    const now = new Date();
    const transitions: StateTransition[] = [];
    const refreshed = this.store.getGraph(projectId)!;
    for (const node of refreshed.nodes.filter((item) => item.kind === "task")) {
      const evidence = this.store.listEvidence(projectId, node.id);
      const next = statusFor(node, evidence, events, now);
      if (node.status !== next.status) {
        const transition: StateTransition = {
          id: `trn_${randomUUID()}`,
          projectId,
          nodeId: node.id,
          fromStatus: node.status,
          toStatus: next.status,
          reason: next.reason,
          occurredAt: now.toISOString(),
        };
        this.store.addTransition(transition);
        transitions.push(transition);
      }
      this.store.updateNode(
        node.id,
        next.status,
        next.progress,
        next.blockedReason,
      );
    }

    const summary = this.store
      .listProjects()
      .find((project) => project.id === projectId);
    return {
      projectId,
      progress: summary?.progress ?? 0,
      transitions,
      matchedEvidence,
    };
  }
}
