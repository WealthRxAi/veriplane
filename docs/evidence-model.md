# Evidence model

Veriplane separates four concepts that typical project tools collapse:

- **Event** — something a source system observed (`ci.run`, `deployment.success`, `payment.test`)
- **Criterion** — a task’s predeclared definition of proof
- **Evidence** — a specific event matched to a specific criterion
- **State** — the deterministic result of reconciling all current evidence

## Criterion contract

```ts
interface EvidenceCriterion {
  id: string;
  label: string;
  eventType: string;
  source?: string;
  match?: Record<string, string | number | boolean>;
  required?: boolean; // defaults to true
  minCount?: number; // defaults to 1
  maxAgeHours?: number; // measured from source occurrence time
}
```

Matching is intentionally boring: exact event type, optional exact source, and exact primitive values at dotted payload paths. This is auditable and safe to inspect. A richer policy language can be added after the trust model is mature.

## State rules

| State         | Rule                                                                              |
| ------------- | --------------------------------------------------------------------------------- |
| `unverified`  | No matching evidence and no active blocker                                        |
| `in_progress` | At least one receipt exists, but one or more required criteria are unmet or stale |
| `verified`    | Every required criterion has enough current supporting receipts                   |
| `blocked`     | The latest targeted blocker event is newer than the latest unblock event          |

Contradicting receipts are preserved but do not satisfy criteria. Optional criteria enrich evidence without preventing verification.

## Progress

Each task has a weight. A verified task contributes 100%, partially evidenced work contributes its derived partial percentage, blocked work preserves already observed partial progress, and unverified work contributes zero. Project progress is the weighted average of task percentages.

This is an operational signal, not a promise about calendar time or business outcome.

## Trust guidance

- Prefer receipts produced by the system that owns the fact.
- Bind sensitive criteria to a source (`source: "github"`) instead of accepting any connector.
- Use freshness for health, authorization, deployment, and access checks.
- Require multiple receipts when quantity matters.
- Treat human approval as a distinct source and event type.
- Never map `assistant.claimed_complete` or conversational text to completion criteria.

See [Security](security.md) before exposing ingestion beyond localhost.
