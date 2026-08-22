# HTTP API

The alpha API is JSON over HTTP and is intentionally small. It has no stability guarantee before v1.

| Method | Path                                 | Purpose                                                |
| ------ | ------------------------------------ | ------------------------------------------------------ |
| `GET`  | `/api/health`                        | Runtime health and version                             |
| `GET`  | `/api/projects`                      | Project summaries and weighted progress                |
| `GET`  | `/api/projects/:id`                  | Graph, evidence, events, transitions, and summary      |
| `POST` | `/api/projects/:id/reconcile`        | Idempotently rerun policy reconciliation               |
| `POST` | `/api/events`                        | Ingest one canonical event                             |
| `GET`  | `/api/providers`                     | Provider availability without exposing keys            |
| `POST` | `/api/chat`                          | Ask a provider with grounded read-only project context |
| `GET`  | `/api/connectors`                    | Connector modes and configuration state                |
| `POST` | `/api/connectors/:id/sync`           | Run one connector sync and ingest returned events      |
| `POST` | `/api/webhooks/github?projectId=:id` | Normalize supported GitHub webhook payloads            |

## Ingest response

`POST /api/events` returns HTTP 202 with the normalized event, whether it was a duplicate, new evidence receipts, state transitions, and new project progress.

```json
{
  "projectId": "northstar-launch",
  "progress": 71,
  "transitions": [],
  "matchedEvidence": [],
  "event": {
    "id": "evt_...",
    "integrityHash": "..."
  },
  "duplicate": false
}
```

Set `VERIPLANE_INGEST_TOKEN` to require `Authorization: Bearer <token>` on generic event ingestion. Connector routes should not be exposed publicly in the alpha server.
