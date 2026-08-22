import type { Connector, ConnectorContext, ConnectorResult } from "./types.js";

export class CredentialConnectorStub implements Connector {
  readonly mode = "stub" as const;
  constructor(
    readonly id: string,
    readonly label: string,
    private readonly envName: string,
  ) {}
  configured(): boolean {
    return Boolean(process.env[this.envName]);
  }
  async sync(_context: ConnectorContext): Promise<ConnectorResult> {
    return {
      connector: this.id,
      events: [],
      warnings: [
        `${this.label} adapter contract is ready; live sync requires ${this.envName}.`,
      ],
    };
  }
}
