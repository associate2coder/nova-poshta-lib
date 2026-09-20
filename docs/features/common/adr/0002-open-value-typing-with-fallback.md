---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-20"
feature_size: "S"
ticket: ""
---

# 0002 — Type reference values as known-literals with an open string fallback

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** User (project owner) + Architect (design session)

## Context

Nova Poshta can add a new value to any reference list's value-bearing fields (e.g. a new payment-form code) at any time, outside this library's release cycle. `spec.md` §1 already commits to treating reference values as provisional, not a closed/frozen enum, and `spec.md` §7 sets a KPI of zero GitHub issues in 90 days reporting that TypeScript rejected a value the live API actually accepts. The concrete TypeScript technique for this was left open for `design` to pick.

## Decision drivers

- `spec.md` §7 KPI (Stale-enum issue rate): 0 issues in 90 days from TypeScript rejecting a value the live API accepts.
- `spec.md` §2 Goal: typed, discoverable access — editor autocomplete for known values.
- `spec.md` §1 Decision override: pass through whatever Nova Poshta sends when in doubt.

## Considered options

1. **Known-values string-literal union with an open fallback** (the `"A" | "B" | (string & {})` TypeScript idiom) — known values autocomplete in the editor; any other string still satisfies the type.
2. **Plain `string`** for every value-bearing field — always compiles, but no autocomplete or typo-catching at all.
3. **Closed string-literal union, manually regenerated over time** — the strongest autocomplete, but rejects (at the type level, and breaks any exhaustive `switch`) a legitimately new live value until the library is republished.

## Decision outcome

**Chosen:** Option 1. It is the only option that satisfies both the discoverability goal (§2) and the stale-enum KPI (§7) at the same time, and it directly implements the project owner's "pass through whatever chaos we get" tie-breaker: a brand-new value from Nova Poshta always compiles and passes through, never a build break for a consumer.

## Consequences

**Positive**
- A new Nova Poshta value never breaks a consumer's build or CI.
- Consumers still get real editor autocomplete for every value known at the time of writing.

**Negative**
- TypeScript cannot stop a consumer from passing a value that was never real — the open fallback accepts any string, so this is a weaker compile-time guarantee than a closed union, by design.

**Neutral**
- The known-values list itself will drift over time as Nova Poshta's docs/live data change — the same "re-verify before release" maintenance loop already flagged as a `sad.md` §11 risk, not a new one introduced by this decision.

## Links

- Spec: [[../spec.md]] §1, §7 KPI
- SAD: [[../sad.md]] §4
- Related ADR: [[0001-array-shape-only-validation]] (the paired decision)
