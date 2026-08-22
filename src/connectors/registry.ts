import { GitHubConnector } from "./github.js";
import { MarkdownConnector } from "./markdown.js";
import { CredentialConnectorStub } from "./stubs.js";
import type { Connector } from "./types.js";

export class ConnectorRegistry {
  readonly connectors: Connector[] = [
    new GitHubConnector(),
    new MarkdownConnector(),
    new CredentialConnectorStub("notion", "Notion", "NOTION_TOKEN"),
    new CredentialConnectorStub(
      "google-drive",
      "Google Drive",
      "GOOGLE_DRIVE_CREDENTIALS_JSON",
    ),
    new CredentialConnectorStub(
      "mcp",
      "MCP event bridge",
      "VERIPLANE_MCP_ENDPOINT",
    ),
  ];
  list(): Array<{
    id: string;
    label: string;
    mode: string;
    configured: boolean;
  }> {
    return this.connectors.map((connector) => ({
      id: connector.id,
      label: connector.label,
      mode: connector.mode,
      configured: connector.configured(),
    }));
  }
  get(id: string): Connector | undefined {
    return this.connectors.find((connector) => connector.id === id);
  }
}
