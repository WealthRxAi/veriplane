# Architecture

Veriplane is a local-first project state engine with a dashboard, not an autonomous execution framework. Existing agents and source systems emit events; Veriplane decides whether those events satisfy predeclared evidence policy.

## Authority boundary

The central design rule is simple:

> A probabilistic model may interpret state, but only deterministic policy may change verified state.

The provider registry receives a compact, read-only project snapshot. Provider output is returned to the user and is not ingested as evidence. If an agent performs real work, the resulting source system—CI, deployment platform, payment test, browser QA, or explicit human review—must emit the receipt.

## Components

1. **Project graph** — Typed nodes (`goal`, `milestone`, `task`, `artifact`, `integration`) and edges (`contains`, `depends_on`, `produces`, `uses`). MVP progress is calculated over weighted task nodes.
2. **Event ledger** — Normalized external facts in SQLite. Canonical JSON is hashed with SHA-256. Connector-supplied IDs make retries idempotent.
3. **Evidence matcher** — Matches event type, optional source, exact payload paths, minimum count, and maximum age against task criteria.
4. **State reconciler** — Derives `unverified`, `in_progress`, `verified`, and `blocked`, records every transition, and recomputes weighted progress.
5. **Connectors** — Translate vendor payloads into the minimal `IncomingEvent` contract. Connectors do not set task state.
6. **Provider registry** — Gives the copilot interchangeable access to supported model APIs. Provider adapters do not write to the evidence ledger.
7. **API and dashboard** — Expose state, evidence, transitions, ingestion, connector sync, and grounded project Q&A.

## Storage model

The MVP uses one local SQLite database with WAL mode and foreign keys. Tables are normalized for projects, nodes, edges, events, evidence, and state transitions. JSON is used only for connector payloads, criteria, and open-ended metadata.

SQLite keeps setup to one command and makes local evaluation honest. The repository boundary is narrow enough to add a PostgreSQL store later without changing engine or connector contracts.

## Event flow

```text
connector payload
    ↓ normalize
IncomingEvent
    ↓ canonicalize + hash + deduplicate
ProjectEvent
    ↓ match task criteria
Evidence receipt(s)
    ↓ reconcile every task
State transition(s)
    ↓ weighted roll-up
ProjectSummary
```

Reconciliation is safe to rerun. Evidence has a unique `(node, criterion, event)` constraint, so repeated connector polling does not inflate counts.

## Deliberate MVP limits

- One local workspace; no user accounts or RBAC
- Connector tokens come from environment variables
- Exact payload matching rather than arbitrary policy expressions
- No cryptographic connector signature verification except an optional shared ingest token
- SHA-256 event hashes detect representation changes but are not yet chained or externally anchored
- Goal and milestone statuses are visual graph nodes; percentage roll-up currently uses task weights

These are visible roadmap items, not implied production features.
