# Roadmap

Veriplane is an alpha. The near-term goal is to make the evidence engine dependable enough that other agent tools can treat it as a neutral project-state service.

## 0.1 — working local MVP (current)

- [x] Graph, event ledger, evidence matching, and deterministic reconciliation
- [x] Weighted progress, blockers, freshness, count rules, and audit transitions
- [x] GitHub and Markdown/Obsidian connector paths
- [x] Multi-provider copilot with local no-key demo
- [x] Dashboard, demo data, API, tests, and container packaging

## 0.2 — trustworthy ingestion

- [ ] GitHub webhook signature verification
- [ ] Per-source ingest keys and event schemas
- [ ] Hash-chained event ledger and signed evidence export
- [ ] Replay, out-of-order, and contradictory-evidence policies
- [ ] Connector fixture conformance suite

## 0.3 — useful ecosystem

- [ ] Notion and Google Drive production adapters
- [ ] MCP server and generic MCP event bridge
- [ ] Vercel, Linear, Jira, Slack, and browser-QA connectors
- [ ] YAML project/evidence policy loader and JSON Schema
- [ ] Connector SDK with contract-test harness

## 0.4 — teams

- [ ] PostgreSQL store and migrations
- [ ] Workspaces, users, RBAC, and scoped service tokens
- [ ] Approvals, policy ownership, and evidence retention controls
- [ ] Hosted deployment guide and observability

## Later

- Agent-to-agent delegation is intentionally later than trustworthy state.
- Cost-aware model routing will be added only with reproducible evaluation data.
- Cloud sync and commercial features will not weaken the self-hosted evidence core.

Roadmap order may change based on real contributor and operator feedback. No date or unbuilt integration is promised.
