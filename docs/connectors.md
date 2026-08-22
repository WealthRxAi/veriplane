# Connectors

Connectors translate source-specific payloads into `IncomingEvent`. They never write task status directly.

## Current support

| Connector           | Status         | What works                                                              | Credential                               |
| ------------------- | -------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| GitHub              | Functional MVP | Poll recent commits/workflow runs; normalize push and workflow webhooks | `GITHUB_TOKEN` for polling               |
| Markdown / Obsidian | Functional MVP | Recursively emit document update events for `.md`, `.mdx`, and `.txt`   | Local path only                          |
| Notion              | Adapter stub   | Registry/config surface and explicit warning                            | `NOTION_TOKEN` reserved                  |
| Google Drive        | Adapter stub   | Registry/config surface and explicit warning                            | `GOOGLE_DRIVE_CREDENTIALS_JSON` reserved |
| MCP event bridge    | Adapter stub   | Registry/config surface and explicit warning                            | `VERIPLANE_MCP_ENDPOINT` reserved        |

“Functional MVP” means the code path is implemented and tested locally; it does not imply every vendor event or enterprise authentication mode.

## Connector interface

```ts
interface Connector {
  id: string;
  label: string;
  mode: "live" | "local" | "stub";
  configured(): boolean;
  sync(context: ConnectorContext): Promise<ConnectorResult>;
}
```

To add a connector:

1. Implement the interface in `src/connectors/<name>.ts`.
2. Normalize vendor fields into stable event types and compact payloads.
3. Use vendor delivery IDs or immutable object IDs for event IDs.
4. Never include credentials in event payloads.
5. Add the connector to `ConnectorRegistry`.
6. Add fixture-based normalization and retry/idempotency tests.
7. Update the status table above without overstating coverage.

## Generic ingestion

Any system can integrate without a dedicated adapter:

```http
POST /api/events
Authorization: Bearer $VERIPLANE_INGEST_TOKEN
Content-Type: application/json
```

The token is optional for a localhost demo and should always be set if the server is reachable by another host.
