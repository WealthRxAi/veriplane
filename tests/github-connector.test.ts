import { describe, expect, it } from "vitest";
import { GitHubConnector } from "../src/connectors/github.js";

describe("GitHub webhook normalizer", () => {
  it("turns push commits into canonical project events", () => {
    const connector = new GitHubConnector();
    const events = connector.fromWebhook("launch", "push", "delivery-1", {
      commits: [
        {
          id: "abc123456789",
          message: "Ship checkout",
          timestamp: "2026-08-22T01:00:00.000Z",
          url: "https://github.com/acme/repo/commit/abc",
          author: { username: "octocat" },
        },
      ],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      projectId: "launch",
      source: "github",
      type: "git.commit",
      actor: "octocat",
    });
  });
});
