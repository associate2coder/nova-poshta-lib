---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-20"
feature_size: ""
ticket: ""
---

# 0003 — Vitest with mocked HTTP for CI, opt-in integration suite against the real API

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** User (project owner) + Architect (survey session)

## Context

The library's entire job is calling an external HTTP API it doesn't control. The user asked for the
library to be "tested" as a hard requirement before it's trustworthy enough to depend on from other
projects, but CI cannot depend on a live third-party API key being available or the network being reachable.

## Decision drivers

- CI runs on every PR and must be fast and deterministic — no flakiness from a third-party network call.
- Real API behavior (actual field names, actual error shapes) still needs to be verified at least occasionally, or the mocks silently drift from reality.
- TypeScript-native test runner reduces build-step friction (no separate ts-jest config).

## Considered options

1. **Vitest, `test/unit` mocking `fetch` (always runs in CI) + opt-in `test/integration` behind an env-var API key (skipped when absent).**
2. **Jest with `ts-jest`** — mature and widely known, but slower and needs extra config to work smoothly with native ESM + `tsup` output.
3. **Unit tests only, no integration suite at all** — simplest, but the request/response envelope assumptions are never checked against the real API, so a Nova Poshta API change could go unnoticed indefinitely.

## Decision outcome

**Chosen:** Option 1. Vitest matches the TypeScript/ESM stack with the least configuration; the
mocked unit suite is what CI runs on every PR (fast, deterministic), and the integration suite exists
so a maintainer holding a real API key can run it manually (or via a scheduled/opt-in CI job) to catch
drift between the mocks and the actual Nova Poshta API.

## Consequences

**Positive**
- CI stays fast and never flakes on third-party network issues.
- The integration suite gives a real, if manual, check against API drift — better than pure mocks with no live verification path at all.

**Negative**
- The integration suite requires a maintainer to hold a valid Nova Poshta API key and run it deliberately; it will not catch API drift automatically unless someone wires a scheduled CI job with a secret later.

**Neutral**
- Enabling the integration suite in CI later is a config-only change (add the secret, remove the skip condition) — no code restructuring needed.

## Links

- Spec: N/A — greenfield foundation, predates any feature spec.
- SAD: N/A — captured directly in [[../architecture-map.md]].
- Related ADR: [[0001-typescript-node-stack]]
