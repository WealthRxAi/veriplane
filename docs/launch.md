# Launch kit

This is a quality-and-clarity launch plan, not a promise of GitHub Trending placement. Trending depends on genuine external adoption.

## Positioning

**Category:** AI project control plane

**One line:** Veriplane reconstructs what is actually done from source-system evidence—across models, agents, and tools.

**Contrast:** It is not a second brain, unified chat wrapper, or autonomous agent framework. It is the neutral project-state layer those tools can write receipts to and read truth from.

**Signature line:** Don’t ask the model if the work is done. Ask the evidence.

## GitHub release title

`Veriplane v0.1 — evidence-backed project state across AI agents and tools`

## Hacker News draft

**Title:** `Show HN: Veriplane – project progress that AI agents cannot mark complete themselves`

**Opening:**

> I built Veriplane because project state kept getting scattered across model chats, commits, deployments, files, and agent runs. The difficult problem wasn’t memory; it was knowing what was actually finished. Veriplane is a local-first control plane where tasks declare evidence criteria and only matching source-system events can verify them. Models can recommend work, but cannot promote their own output to done. The demo needs no keys and includes a SQLite ledger, project graph, GitHub/Markdown connector paths, multi-provider abstraction, and a dashboard. I’d especially value feedback on the evidence contract and adversarial cases.

## Social post

> Open-sourcing Veriplane: a project control plane for humans + AI agents. It rebuilds progress from commits, tests, deployments, files, and approvals—so a model cannot simply declare its own task done. Local-first, SQLite, no-key demo. Don’t ask the model if the work is done. Ask the evidence.

## Launch sequence

1. Create the public repository and apply `.github/REPOSITORY_METADATA.md`.
2. Confirm CI is green on `main` from a fresh clone.
3. Upload `assets/social-preview.png` in repository settings.
4. Create an annotated `v0.1.0` release from `CHANGELOG.md`.
5. Publish one short product demo captured from the included seed data.
6. Post to communities where project/agent infrastructure feedback is relevant; answer technical questions directly.
7. Turn repeated feedback into labeled issues and publish a small follow-up release quickly.

Avoid coordinated star requests, paid engagement, fake accounts, fabricated benchmarks, and unverified claims. Optimize the conversion surface—setup time, demo clarity, issue responsiveness, and useful releases—not the metric.
