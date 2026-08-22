# Contributing to Veriplane

Thank you for helping make project state more trustworthy.

## Start locally

```bash
pnpm install
pnpm demo:seed
pnpm dev
```

Before opening a pull request:

```bash
pnpm check
pnpm format:check
```

## Good contributions

- Connector normalizers with scrubbed fixtures and retry tests
- Evidence-engine edge cases, especially adversarial ones
- Small accessibility and responsive-layout improvements
- Documentation that makes a contract more precise
- Project-policy examples based on real systems of record

Please open an issue before large architectural changes. Keep provider SDKs out of the core; the current adapters intentionally use `fetch` to keep the dependency and secret surface small.

## Connector standard

A connector contribution must include:

- A stable event naming scheme
- Deterministic IDs from vendor delivery/object identifiers
- No secrets or unnecessary personal data in payloads
- Tests for representative payloads and retries
- Honest documentation of covered and uncovered vendor events

## Pull requests

Keep changes focused. Explain the user-visible behavior, authority/security implications, and verification performed. By contributing, you agree that your contribution is licensed under Apache-2.0.
