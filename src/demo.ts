import type { IncomingEvent, ProjectGraph, ProjectNode } from "./core/types.js";
import { EvidenceEngine } from "./core/engine.js";
import { VeriplaneStore } from "./core/store.js";

const iso = (hoursAgo: number): string =>
  new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

function node(
  projectId: string,
  id: string,
  kind: ProjectNode["kind"],
  title: string,
  weight: number,
  criteria: ProjectNode["criteria"] = [],
  description?: string,
): ProjectNode {
  return {
    id,
    projectId,
    kind,
    title,
    weight,
    criteria,
    status: "unverified",
    progress: 0,
    ...(description ? { description } : {}),
  };
}

export function demoGraphs(): ProjectGraph[] {
  const now = new Date().toISOString();
  return [
    {
      project: {
        id: "northstar-launch",
        name: "Northstar launch",
        objective:
          "Launch a paid analytics workspace with a verified purchase path.",
        description:
          "Product, commerce, and go-to-market work tracked from source systems.",
        createdAt: iso(240),
        updatedAt: now,
      },
      nodes: [
        node(
          "northstar-launch",
          "northstar-goal",
          "goal",
          "Launch Northstar",
          0,
        ),
        node(
          "northstar-launch",
          "northstar-product",
          "milestone",
          "Product ready",
          0,
        ),
        node(
          "northstar-launch",
          "northstar-gtm",
          "milestone",
          "Go-to-market ready",
          0,
        ),
        node(
          "northstar-launch",
          "task-web",
          "task",
          "Deploy production website",
          3,
          [
            {
              id: "web-deployed",
              label: "Production deployment succeeded",
              eventType: "deployment.success",
              match: { nodeId: "task-web", environment: "production" },
              maxAgeHours: 720,
            },
            {
              id: "web-health",
              label: "Production health check passed",
              eventType: "healthcheck.passed",
              match: { nodeId: "task-web", status: 200 },
              maxAgeHours: 168,
            },
          ],
        ),
        node(
          "northstar-launch",
          "task-checkout",
          "task",
          "Verify checkout",
          3,
          [
            {
              id: "checkout-tests",
              label: "Checkout integration tests passed",
              eventType: "test.suite",
              match: { nodeId: "task-checkout", conclusion: "success" },
              maxAgeHours: 168,
            },
            {
              id: "payment-created",
              label: "Test payment completed",
              eventType: "payment.test",
              match: { nodeId: "task-checkout", status: "succeeded" },
              maxAgeHours: 168,
            },
          ],
        ),
        node(
          "northstar-launch",
          "task-content",
          "task",
          "Produce launch assets",
          2,
          [
            {
              id: "launch-assets",
              label: "Five launch assets rendered",
              eventType: "asset.rendered",
              match: { nodeId: "task-content" },
              minCount: 5,
            },
          ],
        ),
        node(
          "northstar-launch",
          "task-social",
          "task",
          "Connect publishing channel",
          2,
          [
            {
              id: "channel-auth",
              label: "Channel authorization is valid",
              eventType: "connector.auth",
              match: { nodeId: "task-social", status: "valid" },
              maxAgeHours: 24,
            },
            {
              id: "first-post",
              label: "First launch post published",
              eventType: "social.published",
              match: { nodeId: "task-social" },
            },
          ],
        ),
      ],
      edges: [
        {
          id: "e-ns-1",
          projectId: "northstar-launch",
          from: "northstar-goal",
          to: "northstar-product",
          relation: "contains",
        },
        {
          id: "e-ns-2",
          projectId: "northstar-launch",
          from: "northstar-goal",
          to: "northstar-gtm",
          relation: "contains",
        },
        {
          id: "e-ns-3",
          projectId: "northstar-launch",
          from: "northstar-product",
          to: "task-web",
          relation: "contains",
        },
        {
          id: "e-ns-4",
          projectId: "northstar-launch",
          from: "northstar-product",
          to: "task-checkout",
          relation: "contains",
        },
        {
          id: "e-ns-5",
          projectId: "northstar-launch",
          from: "northstar-gtm",
          to: "task-content",
          relation: "contains",
        },
        {
          id: "e-ns-6",
          projectId: "northstar-launch",
          from: "northstar-gtm",
          to: "task-social",
          relation: "contains",
        },
        {
          id: "e-ns-7",
          projectId: "northstar-launch",
          from: "task-web",
          to: "task-checkout",
          relation: "depends_on",
        },
        {
          id: "e-ns-8",
          projectId: "northstar-launch",
          from: "task-content",
          to: "task-social",
          relation: "depends_on",
        },
      ],
    },
    {
      project: {
        id: "signal-report",
        name: "Signal report",
        objective: "Publish an evidence-linked market report.",
        description:
          "Research and editorial delivery across agents, Drive, and GitHub.",
        createdAt: iso(168),
        updatedAt: iso(2),
      },
      nodes: [
        node("signal-report", "signal-goal", "goal", "Publish report", 0),
        node(
          "signal-report",
          "task-sources",
          "task",
          "Collect primary sources",
          2,
          [
            {
              id: "sources",
              label: "Eight primary sources captured",
              eventType: "research.source",
              match: { nodeId: "task-sources", primary: true },
              minCount: 8,
            },
          ],
        ),
        node(
          "signal-report",
          "task-draft",
          "task",
          "Complete editorial draft",
          3,
          [
            {
              id: "draft",
              label: "Draft artifact approved",
              eventType: "artifact.approved",
              match: { nodeId: "task-draft" },
            },
          ],
        ),
        node("signal-report", "task-publish", "task", "Publish report", 2, [
          {
            id: "page",
            label: "Public report returns 200",
            eventType: "healthcheck.passed",
            match: { nodeId: "task-publish", status: 200 },
          },
        ]),
      ],
      edges: [
        {
          id: "e-sr-1",
          projectId: "signal-report",
          from: "signal-goal",
          to: "task-sources",
          relation: "contains",
        },
        {
          id: "e-sr-2",
          projectId: "signal-report",
          from: "signal-goal",
          to: "task-draft",
          relation: "contains",
        },
        {
          id: "e-sr-3",
          projectId: "signal-report",
          from: "signal-goal",
          to: "task-publish",
          relation: "contains",
        },
        {
          id: "e-sr-4",
          projectId: "signal-report",
          from: "task-sources",
          to: "task-draft",
          relation: "depends_on",
        },
        {
          id: "e-sr-5",
          projectId: "signal-report",
          from: "task-draft",
          to: "task-publish",
          relation: "depends_on",
        },
      ],
    },
    {
      project: {
        id: "mobile-beta",
        name: "Mobile beta",
        objective: "Put a stable beta in the hands of 20 testers.",
        description:
          "Build, distribution, and feedback evidence in one state model.",
        createdAt: iso(360),
        updatedAt: iso(5),
      },
      nodes: [
        node("mobile-beta", "mobile-goal", "goal", "Ship mobile beta", 0),
        node("mobile-beta", "task-build", "task", "Pass release build", 3, [
          {
            id: "build",
            label: "Release build passed",
            eventType: "ci.run",
            match: { nodeId: "task-build", conclusion: "success" },
          },
        ]),
        node("mobile-beta", "task-distribute", "task", "Distribute beta", 3, [
          {
            id: "distribution",
            label: "Beta uploaded",
            eventType: "release.published",
            match: { nodeId: "task-distribute", channel: "beta" },
          },
        ]),
        node("mobile-beta", "task-testers", "task", "Onboard 20 testers", 2, [
          {
            id: "testers",
            label: "Twenty testers activated",
            eventType: "tester.activated",
            match: { nodeId: "task-testers" },
            minCount: 20,
          },
        ]),
      ],
      edges: [
        {
          id: "e-mb-1",
          projectId: "mobile-beta",
          from: "mobile-goal",
          to: "task-build",
          relation: "contains",
        },
        {
          id: "e-mb-2",
          projectId: "mobile-beta",
          from: "mobile-goal",
          to: "task-distribute",
          relation: "contains",
        },
        {
          id: "e-mb-3",
          projectId: "mobile-beta",
          from: "mobile-goal",
          to: "task-testers",
          relation: "contains",
        },
        {
          id: "e-mb-4",
          projectId: "mobile-beta",
          from: "task-build",
          to: "task-distribute",
          relation: "depends_on",
        },
      ],
    },
  ];
}

function event(
  id: string,
  projectId: string,
  source: string,
  type: string,
  hoursAgo: number,
  payload: Record<string, unknown>,
): IncomingEvent {
  return { id, projectId, source, type, occurredAt: iso(hoursAgo), payload };
}

export function demoEvents(): IncomingEvent[] {
  const results: IncomingEvent[] = [
    event(
      "evt-deploy-prod",
      "northstar-launch",
      "vercel",
      "deployment.success",
      28,
      {
        nodeId: "task-web",
        environment: "production",
        url: "https://northstar.example",
        summary: "Production deployment is ready",
      },
    ),
    event(
      "evt-health-prod",
      "northstar-launch",
      "browser-qa",
      "healthcheck.passed",
      27,
      {
        nodeId: "task-web",
        status: 200,
        url: "https://northstar.example",
        summary: "Homepage returned 200 in 184 ms",
      },
    ),
    event(
      "evt-checkout-tests",
      "northstar-launch",
      "github",
      "test.suite",
      20,
      {
        nodeId: "task-checkout",
        conclusion: "success",
        tests: 18,
        summary: "18 checkout integration tests passed",
      },
    ),
    event("evt-asset-1", "northstar-launch", "canva", "asset.rendered", 18, {
      nodeId: "task-content",
      asset: "launch-hero.png",
      summary: "Launch hero rendered",
    }),
    event("evt-asset-2", "northstar-launch", "canva", "asset.rendered", 17, {
      nodeId: "task-content",
      asset: "feature-grid.png",
      summary: "Feature grid rendered",
    }),
    event("evt-asset-3", "northstar-launch", "canva", "asset.rendered", 16, {
      nodeId: "task-content",
      asset: "social-card.png",
      summary: "Social card rendered",
    }),
    event(
      "evt-social-block",
      "northstar-launch",
      "instagram",
      "task.blocked",
      5,
      {
        nodeId: "task-social",
        reason: "Instagram authorization expired",
        summary: "Publishing token expired",
      },
    ),
    ...Array.from({ length: 8 }, (_, index) =>
      event(
        `evt-source-${index + 1}`,
        "signal-report",
        "research-agent",
        "research.source",
        48 - index,
        {
          nodeId: "task-sources",
          primary: true,
          sourceId: index + 1,
          summary: `Primary source ${index + 1} captured`,
        },
      ),
    ),
    event(
      "evt-report-draft",
      "signal-report",
      "human-review",
      "artifact.approved",
      12,
      {
        nodeId: "task-draft",
        artifact: "market-signal-v1.md",
        summary: "Editorial draft approved by reviewer",
      },
    ),
    event("evt-mobile-build", "mobile-beta", "github", "ci.run", 30, {
      nodeId: "task-build",
      conclusion: "success",
      workflow: "iOS Release",
      summary: "iOS release build passed",
    }),
    event(
      "evt-mobile-release",
      "mobile-beta",
      "testflight",
      "release.published",
      24,
      {
        nodeId: "task-distribute",
        channel: "beta",
        build: "47",
        summary: "Build 47 uploaded to beta channel",
      },
    ),
    ...Array.from({ length: 7 }, (_, index) =>
      event(
        `evt-tester-${index + 1}`,
        "mobile-beta",
        "testflight",
        "tester.activated",
        20 - index,
        {
          nodeId: "task-testers",
          tester: `tester-${index + 1}`,
          summary: `Tester ${index + 1} activated`,
        },
      ),
    ),
  ];
  return results;
}

export function seedDemo(store: VeriplaneStore, reset = false): void {
  if (reset) store.reset();
  for (const graph of demoGraphs()) store.upsertGraph(graph);
  const engine = new EvidenceEngine(store);
  for (const item of demoEvents()) engine.ingest(item);
}
