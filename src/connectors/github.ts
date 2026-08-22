import type { IncomingEvent } from "../core/types.js";
import type { Connector, ConnectorContext, ConnectorResult } from "./types.js";

interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  updated_at: string;
  head_sha: string;
}
interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { date: string } };
  author?: { login?: string };
}

export class GitHubConnector implements Connector {
  readonly id = "github";
  readonly label = "GitHub";
  readonly mode = "live" as const;
  constructor(private readonly token = process.env.GITHUB_TOKEN) {}
  configured(): boolean {
    return Boolean(this.token);
  }

  async sync(context: ConnectorContext): Promise<ConnectorResult> {
    const repository = context.config.repository;
    if (typeof repository !== "string")
      throw new Error(
        "GitHub connector requires config.repository as owner/name",
      );
    if (!this.token)
      return {
        connector: this.id,
        events: [],
        warnings: [
          "GITHUB_TOKEN is not configured; webhook normalization remains available.",
        ],
      };
    const headers = {
      authorization: `Bearer ${this.token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    };
    const [commitsResponse, runsResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${repository}/commits?per_page=15`, {
        headers,
      }),
      fetch(
        `https://api.github.com/repos/${repository}/actions/runs?per_page=15`,
        { headers },
      ),
    ]);
    if (!commitsResponse.ok)
      throw new Error(`GitHub commits returned ${commitsResponse.status}`);
    if (!runsResponse.ok)
      throw new Error(`GitHub Actions returned ${runsResponse.status}`);
    const commits = (await commitsResponse.json()) as GitHubCommit[];
    const runs = (
      (await runsResponse.json()) as { workflow_runs: GitHubWorkflowRun[] }
    ).workflow_runs;
    const events: IncomingEvent[] = [
      ...commits.map((commit) => ({
        id: `github_commit_${commit.sha}`,
        projectId: context.projectId,
        source: "github",
        type: "git.commit",
        occurredAt: commit.commit.author.date,
        actor: commit.author?.login,
        payload: {
          sha: commit.sha,
          message: commit.commit.message,
          url: commit.html_url,
          repository,
          summary: `Commit ${commit.sha.slice(0, 7)}: ${commit.commit.message.split("\n")[0]}`,
        },
      })),
      ...runs.map((run) => ({
        id: `github_run_${run.id}`,
        projectId: context.projectId,
        source: "github",
        type: "ci.run",
        occurredAt: run.updated_at,
        payload: {
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          sha: run.head_sha,
          url: run.html_url,
          repository,
          summary: `${run.name} ${run.conclusion ?? run.status}`,
        },
      })),
    ];
    return { connector: this.id, events, warnings: [] };
  }

  fromWebhook(
    projectId: string,
    eventName: string,
    deliveryId: string,
    payload: Record<string, unknown>,
  ): IncomingEvent[] {
    if (eventName === "push") {
      const commits = Array.isArray(payload.commits)
        ? (payload.commits as Array<Record<string, unknown>>)
        : [];
      return commits.map((commit) => ({
        id: `github_${deliveryId}_${String(commit.id).slice(0, 12)}`,
        projectId,
        source: "github",
        type: "git.commit",
        occurredAt: String(commit.timestamp ?? new Date().toISOString()),
        actor:
          typeof commit.author === "object"
            ? String(
                (commit.author as Record<string, unknown>).username ?? "github",
              )
            : "github",
        payload: {
          sha: commit.id,
          message: commit.message,
          url: commit.url,
          summary: `Commit ${String(commit.id).slice(0, 7)}: ${String(commit.message).split("\n")[0]}`,
        },
      }));
    }
    if (eventName === "workflow_run") {
      const run = payload.workflow_run as Record<string, unknown> | undefined;
      if (!run) return [];
      return [
        {
          id: `github_${deliveryId}`,
          projectId,
          source: "github",
          type: "ci.run",
          occurredAt: String(run.updated_at ?? new Date().toISOString()),
          payload: {
            id: run.id,
            name: run.name,
            status: run.status,
            conclusion: run.conclusion,
            sha: run.head_sha,
            url: run.html_url,
            summary: `${String(run.name)} ${String(run.conclusion ?? run.status)}`,
          },
        },
      ];
    }
    return [];
  }
}
