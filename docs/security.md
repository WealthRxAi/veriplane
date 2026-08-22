# Security

Veriplane is alpha software. Run it on localhost and use non-production credentials while evaluating it.

## Current controls

- Server binds to `127.0.0.1` by default.
- Provider and connector keys are read from environment variables and are not written to SQLite.
- Event bodies are limited to 1 MB.
- `VERIPLANE_INGEST_TOKEN` can require bearer authentication for generic event ingestion.
- SQLite foreign keys are enabled and connector retries are deduplicated.
- Provider output cannot write project state.
- Canonical event representations receive SHA-256 integrity hashes.

## Before network exposure

Add authenticated user/workspace boundaries, TLS at the proxy, per-source credentials, request rate limits, GitHub webhook signature verification, connector-specific scopes, encrypted secret storage, and an explicit CORS policy. The demo server currently allows cross-origin API reads for local development.

## Evidence threats

- **Forged source:** bind important criteria to a source and authenticate ingestion.
- **Replay:** use stable source delivery IDs; the ledger is idempotent.
- **Stale success:** add `maxAgeHours` to checks whose truth expires.
- **Model self-attestation:** do not define criteria against conversational or model-only events.
- **Secret leakage:** connectors must strip tokens, headers, and full credential-bearing URLs before emitting payloads.
- **History editing:** event hashes reveal changes to exported canonical events; hash chaining and external anchoring are roadmap items.

Report vulnerabilities privately as described in the root [SECURITY.md](../SECURITY.md).
