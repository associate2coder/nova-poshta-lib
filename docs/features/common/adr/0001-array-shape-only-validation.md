---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-20"
feature_size: "S"
ticket: ""
---

# 0001 — Validate only that reference-list data is array-shaped

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** User (project owner) + Architect (design session)

## Context

`spec.md` AC-03 requires `common` to fail loudly when a Nova Poshta reference-list response is genuinely unusable, rather than silently handing back typed-but-wrong data. Today's scaffolded core client (`src/client.ts`) casts a parsed response straight to its declared type with no runtime check at all. Real production experience with the Nova Poshta API (`spec.md` §1 Decision override, 2026-09-20) is that individual records routinely omit or vary documented fields — normal API noise, not a defect worth blocking a delivery-vendor integration over. The check has to draw a line between "genuinely broken" and "normal Nova Poshta messiness."

## Decision drivers

- `spec.md` §6 NFR (Error-contract coverage): 100% throw `NovaPoshtaApiError` on a declined/non-list response, but explicitly 0% throw on a per-field/per-record inconsistency.
- `spec.md` §6 NFR (Library-added overhead): median ≤5ms per call, including the shape-check cost — the check has to be cheap.
- `spec.md` §1 Decision override: when in doubt, pass through whatever Nova Poshta sent rather than blocking the call.
- `architecture-map.md`: the library carries zero runtime dependencies today.

## Considered options

1. **Structural array-shape check only, as a shared core-client utility.** Confirm `data` is an array before returning it; no per-field/per-record validation at all.
2. **Full per-field/per-record structural validation, hand-rolled** (scoped either shared or per-module) — check every documented field's presence and basic type.
3. **Adopt a schema-validation library (e.g. Zod)** — define each reference list's shape once, validate and derive the TypeScript type from the same schema.

## Decision outcome

**Chosen:** Option 1. It is the cheapest check that still satisfies AC-03 (data that isn't a navigable list is a real failure), stays inside the 5ms overhead budget by construction, adds zero new dependency, and directly implements the project owner's pragmatic-tolerance decision — every future domain module gets the same guard for free by calling the same core-client function, without inheriting a validation burden the spec deliberately doesn't want.

## Consequences

**Positive**
- Extremely cheap — effectively free against the 5ms budget.
- Zero new runtime dependency; keeps the library's current zero-dependency footprint.
- Reusable: any future `src/modules/<domain>/` gets the same array-shape guard by calling the same core-client check, without reinventing it.
- Matches the deliberate business priority: never block a delivery-vendor integration over normal Nova Poshta API noise.

**Negative**
- Does not catch a record that's technically array-shaped but individually garbled (e.g. every field `null`) — such a record is still returned to the developer, typed with all-optional fields; the developer must handle absent data defensively.

**Neutral**
- Adding stricter per-field validation later (Option 2 or 3) remains possible without a breaking type change, since every documented field is already optional-shaped — it would only add runtime strictness on top of an unchanged public type.

## Links

- Spec: [[../spec.md]] AC-03, §1 Decision override
- SAD: [[../sad.md]] §4
- Related ADR: [[0002-open-value-typing-with-fallback]] (the paired decision — both stem from the same pragmatic-tolerance override)
