import type { IncomingEvent } from "../core/types.js";

export interface ConnectorContext {
  projectId: string;
  config: Record<string, unknown>;
}

export interface ConnectorResult {
  connector: string;
  events: IncomingEvent[];
  cursor?: string;
  warnings: string[];
}

export interface Connector {
  id: string;
  label: string;
  mode: "live" | "local" | "stub";
  configured(): boolean;
  sync(context: ConnectorContext): Promise<ConnectorResult>;
}
