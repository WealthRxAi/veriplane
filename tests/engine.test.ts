import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EvidenceEngine } from "../src/core/engine.js";
import { VeriplaneStore } from "../src/core/store.js";
import type { ProjectGraph } from "../src/core/types.js";

const project: ProjectGraph = {
  project: {
    id: "launch",
    name: "Launch",
    objective: "Ship a verified release",
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
  nodes: [
    {
      id: "goal",
      projectId: "launch",
      kind: "goal",
      title: "Ship",
      weight: 0,
      status: "unverified",
      progress: 0,
      criteria: [],
    },
    {
      id: "deploy",
      projectId: "launch",
      kind: "task",
      title: "Deploy",
      weight: 3,
      status: "unverified",
      progress: 0,
      criteria: [
        {
          id: "ci",
          label: "CI passed",
          eventType: "ci.run",
          match: { nodeId: "deploy", conclusion: "success" },
        },
        {
          id: "health",
          label: "Health check passed",
          eventType: "healthcheck.passed",
          match: { nodeId: "deploy", status: 200 },
          maxAgeHours: 24,
        },
      ],
    },
    {
      id: "announce",
      projectId: "launch",
      kind: "task",
      title: "Announce",
      weight: 1,
      status: "unverified",
      progress: 0,
      criteria: [
        {
          id: "post",
          label: "Post published",
          eventType: "social.published",
          match: { nodeId: "announce" },
        },
      ],
    },
  ],
  edges: [
    {
      id: "e1",
      projectId: "launch",
      from: "goal",
      to: "deploy",
      relation: "contains",
    },
    {
      id: "e2",
      projectId: "launch",
      from: "goal",
      to: "announce",
      relation: "contains",
    },
  ],
};

describe("EvidenceEngine", () => {
  let store: VeriplaneStore;
  let engine: EvidenceEngine;
  beforeEach(() => {
    store = new VeriplaneStore(":memory:");
    store.upsertGraph(project);
    engine = new EvidenceEngine(store);
  });
  afterEach(() => store.close());

  it("requires every declared check before verifying a task", () => {
    engine.ingest({
      id: "ci-1",
      projectId: "launch",
      source: "github",
      type: "ci.run",
      payload: { nodeId: "deploy", conclusion: "success" },
    });
    expect(
      store.getGraph("launch")!.nodes.find((node) => node.id === "deploy")!
        .status,
    ).toBe("in_progress");
    const result = engine.ingest({
      id: "health-1",
      projectId: "launch",
      source: "browser-qa",
      type: "healthcheck.passed",
      payload: { nodeId: "deploy", status: 200 },
    });
    expect(
      store.getGraph("launch")!.nodes.find((node) => node.id === "deploy")!
        .status,
    ).toBe("verified");
    expect(result.progress).toBe(75);
  });

  it("is idempotent when a connector retries a delivery", () => {
    const input = {
      id: "ci-retry",
      projectId: "launch",
      source: "github",
      type: "ci.run",
      payload: { nodeId: "deploy", conclusion: "success" },
    } as const;
    expect(engine.ingest(input).duplicate).toBe(false);
    expect(engine.ingest(input).duplicate).toBe(true);
    expect(store.listEvents("launch")).toHaveLength(1);
    expect(store.listEvidence("launch")).toHaveLength(1);
  });

  it("does not treat an agent assertion as completion evidence", () => {
    engine.ingest({
      projectId: "launch",
      source: "model",
      type: "assistant.claimed_complete",
      payload: { nodeId: "deploy", conclusion: "success", status: 200 },
    });
    expect(
      store.getGraph("launch")!.nodes.find((node) => node.id === "deploy")!
        .status,
    ).toBe("unverified");
    expect(store.listEvidence("launch")).toHaveLength(0);
  });

  it("marks and clears explicit blockers in event order", () => {
    engine.ingest({
      id: "blocked",
      projectId: "launch",
      source: "github",
      type: "task.blocked",
      occurredAt: "2026-08-21T10:00:00.000Z",
      payload: { nodeId: "announce", reason: "Missing approval" },
    });
    expect(
      store.getGraph("launch")!.nodes.find((node) => node.id === "announce")!
        .status,
    ).toBe("blocked");
    engine.ingest({
      id: "clear",
      projectId: "launch",
      source: "human-review",
      type: "task.unblocked",
      occurredAt: "2026-08-21T11:00:00.000Z",
      payload: { nodeId: "announce" },
    });
    expect(
      store.getGraph("launch")!.nodes.find((node) => node.id === "announce")!
        .status,
    ).toBe("unverified");
  });

  it("rejects stale evidence for freshness-gated checks", () => {
    engine.ingest({
      id: "old-health",
      projectId: "launch",
      source: "browser-qa",
      type: "healthcheck.passed",
      occurredAt: "2025-01-01T00:00:00.000Z",
      payload: { nodeId: "deploy", status: 200 },
    });
    engine.ingest({
      id: "ci-new",
      projectId: "launch",
      source: "github",
      type: "ci.run",
      payload: { nodeId: "deploy", conclusion: "success" },
    });
    expect(
      store.getGraph("launch")!.nodes.find((node) => node.id === "deploy")!
        .status,
    ).toBe("in_progress");
  });

  it("tracks partial receipt counts without claiming verification", () => {
    store.reset();
    store.upsertGraph({
      project: {
        id: "assets",
        name: "Assets",
        objective: "Render four assets",
        createdAt: "2026-08-20T00:00:00.000Z",
        updatedAt: "2026-08-20T00:00:00.000Z",
      },
      nodes: [
        {
          id: "render",
          projectId: "assets",
          kind: "task",
          title: "Render assets",
          weight: 1,
          status: "unverified",
          progress: 0,
          criteria: [
            {
              id: "renders",
              label: "Four assets rendered",
              eventType: "asset.rendered",
              match: { nodeId: "render" },
              minCount: 4,
            },
          ],
        },
      ],
      edges: [],
    });
    engine.ingest({
      id: "asset-1",
      projectId: "assets",
      source: "renderer",
      type: "asset.rendered",
      payload: { nodeId: "render", asset: "one" },
    });
    engine.ingest({
      id: "asset-2",
      projectId: "assets",
      source: "renderer",
      type: "asset.rendered",
      payload: { nodeId: "render", asset: "two" },
    });
    const task = store
      .getGraph("assets")!
      .nodes.find((node) => node.id === "render")!;
    expect(task.status).toBe("in_progress");
    expect(task.progress).toBe(43);
  });
});
