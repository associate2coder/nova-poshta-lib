---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-20"
feature_size: "S"
---

# Data model — address

## No schema change

`address` introduces no schema and no migrations. This is a legitimate outcome of the skill's
protocol (step 9), not a shortcut — confirmed by three independent sources:

- `docs/architecture-map.md` §Migrations: "N/A — no schema, no database."
- `sad.md` §2 (Constraints): "No datastore — `address` is stateless — the Nova Poshta API is the
  sole backing store."
- `CLAUDE.md`: "No persistence: the library holds no state and no IDs of its own — it passes
  through whatever the Nova Poshta API returns (refs, waybill numbers)."

`address`'s 11 methods (8 lookups + 3 writes) all resolve to a single synchronous call into the
shared core client (`src/client.ts`), which talks to the Nova Poshta API as the sole backing
store. There is no local entity, no local aggregate root, and no local FK graph for this feature
to model — every "record" (`save`'s saved address, a city, a warehouse) lives and is identified
(`Ref`) entirely on Nova Poshta's side. `sad.md §6`'s persist notes describe Nova Poshta as the
data store, not this library.

## ER diagram

N/A — no entities owned by this feature.

## Entities

N/A.

## Indexes

N/A — no local queries to index; all filtering/search happens server-side on Nova Poshta's own
API (`spec.md` AC-02, AC-11: the library performs no client-side re-filtering).

## Test fixtures

No database fixtures. `test/unit/modules/address` stubs `fetch` responses shaped like Nova
Poshta's documented envelopes (per `docs/adr/0003-testing-strategy.md`), not database rows.

## Migrations

Zero staged migration files — none needed. `docs/features/address/migrations/` is intentionally
empty.

**Note for `api`:** per the size-matrix fast lane, `api` would also have accepted an N/A
fast-lane skip on this same "no schema change" basis — but `address`'s contract (11 typed
methods + the two irregular response shapes) still needs to be derived from `sad.md §6` and
`spec.md §5`, so `api address` should run normally, not skip.
