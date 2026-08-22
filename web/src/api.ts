import type { Connector, ProjectDetail, Provider, Summary } from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  bootstrap: () =>
    Promise.all([
      request<{ projects: Summary[] }>("/api/projects"),
      request<{ providers: Provider[] }>("/api/providers"),
      request<{ connectors: Connector[] }>("/api/connectors"),
    ]),
  project: (id: string) =>
    request<ProjectDetail>(`/api/projects/${encodeURIComponent(id)}`),
  chat: (projectId: string, prompt: string, provider: string) =>
    request<{ content: string; provider: string; model: string }>("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, prompt, provider }),
    }),
};
