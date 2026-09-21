---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-21"
feature_size: "M"
---

# Data model — internet-document

## No schema change

`internet-document` introduces no schema and no migrations. This is a legitimate outcome of the
skill's protocol (step 9), not a shortcut — confirmed by three independent sources:

- `docs/architecture-map.md` §Migrations: "N/A — no schema, no database."
- `sad.md` §2 (Constraints): "No datastore — `internet-document` is stateless — the Nova Poshta
  API is the sole backing store."
- `CLAUDE.md`: "No persistence: the library holds no state and no IDs of its own — it passes
  through whatever the Nova Poshta API returns (refs, waybill numbers)."

`internet-document`'s 8 methods (6 delegated through the shared core client, plus the 2 print
methods routed through their own `fetch`-based helper, ADR-0003) all resolve to a call against the
Nova Poshta API, which is the sole backing store. There is no local entity, no local aggregate
root, and no local FK graph for this feature to model — every "record" this feature touches (a
saved waybill's `Ref`/`IntDocNumber`, a price estimate, a delivery-date estimate, a print-ready
link) lives and is identified entirely on Nova Poshta's side (`spec.md` AC-17). `sad.md §6`'s
persist notes describe Nova Poshta, not this library, as the data store for every one of the four
drawn flows, including the write flow (`save`/`update`) and the batch-delete reconciliation flow —
the reconciliation itself (ADR-0002) is an in-memory comparison against the submitted Ref set, not
a persisted record.

## ER diagram

N/A — no entities owned by this feature.

## Entities

N/A.

## Indexes

N/A — no local queries to index; all filtering (`getDocumentList`'s date-range and other
parameters) and all calculation happen server-side on Nova Poshta's own API (`spec.md` AC-09,
AC-10: the library performs no client-side re-filtering, no auto-pagination).

## Test fixtures

No database fixtures. `test/unit/modules/internet-document` stubs `fetch` responses shaped like
Nova Poshta's documented envelopes for the 6 JSON-enveloped methods, plus a mocked `fetch` for the
print methods' construct-then-verify check (ADR-0003) — per `docs/adr/0003-testing-strategy.md` —
not database rows.

## Migrations

Zero staged migration files — none needed. No `docs/features/internet-document/migrations/`
directory is created (matching `address`'s and `counterparty`'s identical N/A outcome).

**Note for `api`:** per the size-matrix fast lane, `api` would also have accepted an N/A
fast-lane skip on this same "no schema change" basis — but `internet-document`'s contract (8 typed
methods, including the two print methods' non-JSON response shape and the batch-delete per-Ref
outcome array) still needs to be derived from `sad.md §6` and `spec.md §5`, so
`api internet-document` should run normally, not skip.
