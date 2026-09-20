---
status: living
updated_at: "2026-09-21"
---

# Roadmap — nova-poshta-lib

> **A decomposition, not a promise.** The overall idea broken into incremental steps: what each
> step is, where it comes from, how big it is — or that nobody has looked at it yet — and in which
> order, and parallel lanes, we walk them. **No dates** (except shipped history), **no scores** —
> order is the prioritization. The *solution* for any step lives in its `docs/features/<slug>/`
> spec, not here.

## Destination

Every Nova Poshta API domain — reference data, addresses, counterparties, shipment creation,
tracking, scan-sheet batching, and post-creation service actions (returns/redirects/edits) — is
available as a typed, tested module in `nova-poshta-lib`, published to npm.

## Steps

| # | Step | Source | Size | Status |
|---|---|---|:---:|---|
| 1 | common — typed reference-list module (15 methods: cargo types, payment forms, service types, …) | `docs/features/common/spec.md` §1 | S | shipped |
| 2 | address — typed Address domain module (11 methods + `findCityByName` convenience) | `docs/features/address/spec.md` §1 | S | shipped |
| 3 | counterparty — typed Counterparty + ContactPerson module (11 methods + `findCounterparty` convenience) | `docs/features/counterparty/spec.md` §1 | S | shipped |
| 4 | internet-document — typed shipment/waybill creation module, built on address + counterparty `Ref`s and common's reference types | `docs/features/counterparty/spec.md` §1; `docs/features/address/spec.md` §1; `docs/architecture-map.md` §Module inventory (target) | M | idea |
| 5 | tracking-document — typed module for tracking a shipment by document number + phone, independent of internet-document | `docs/architecture-map.md` §Module inventory (target) | S | idea |
| 6 | scan-sheet — typed module for batching waybills into a scan sheet for courier handoff | `docs/architecture-map.md` §Constraints & known tech-debt | S | idea |
| 7 | additional-service — typed module for post-creation shipment actions: returns, redirections, waybill edits | `docs/architecture-map.md` §Constraints & known tech-debt | M | idea |

Sizing note: 4 and 7 are called **M** rather than **S** like their shipped precedents because each
has a genuinely broader method surface than `common`/`address`/`counterparty` — 4 adds
creation + pricing/date-calculator + report/printing sub-flows; 7 adds five distinct write-payload
shapes (plain return, return-to-new-address, return-to-new-warehouse, redirect, waybill edit) —
even though PR count may land near the S/M border same as the shipped modules.

## Not yet specified

*(none — the full 7-domain target list is closed per `docs/architecture-map.md`'s
Constraints & known tech-debt note, cross-checked against two independent community SDKs since
Nova Poshta's own docs portal still blocks automated fetches)*

## Out of scope

- Extending the shared core client (`src/client.ts`) to expose Nova Poshta's pagination metadata
  (`totalCount`) and success-path warnings — repeatedly deferred as a non-goal across all three
  shipped specs' §3 non-goals; tracked as an open question in each, not a roadmap step of its own.

## Open decisions

*(none currently blocking — each step's own spec §8 open questions, once that step is specified,
is where its unresolved detail lives)*

## Decisions so far

- Modules ship one Nova Poshta API domain at a time, each mirroring `address`'s structural
  precedent (one factory per domain, dual ESM+CJS build, one `NovaPoshtaApiError` reused
  unchanged) → [`docs/architecture-map.md`](architecture-map.md) §Conventions
- Write methods resolve to `T | undefined` rather than throwing when Nova Poshta reports success
  with an empty result — set by `address`, reused by `counterparty`, and explicitly scoped to
  extend to future write-capable modules (shipment creation named directly) →
  [`docs/features/address/adr/0001-return-undefined-on-empty-write-response.md`](features/address/adr/0001-return-undefined-on-empty-write-response.md)
- The full 8-model Nova Poshta API surface (7 domains beyond what this library groups as
  `counterparty`, which folds in `ContactPerson`) is closed, cross-checked against
  `platx/go-nova-poshta` + `maddsua/NovaPoshtaREST` →
  [`docs/architecture-map.md`](architecture-map.md) §Constraints & known tech-debt

## Dependency graph

```mermaid
flowchart LR
  s1["1 · common"] -->|reuses PaymentForm/ServiceType/CargoType/Pallet/Tray/TireWheel/PayerType types| s4["4 · internet-document"]
  s1 -->|reuses DocumentStatus type| s5["5 · tracking-document"]
  s2["2 · address"] -->|needs city/street/warehouse Ref| s4
  s3["3 · counterparty"] -->|needs sender/recipient/contact-person Ref| s4
  s4 -->|InsertDocuments/RemoveDocuments need waybill Refs| s6["6 · scan-sheet"]
  s3 -->|GetScanSheet needs a counterparty Ref| s6
  s4 -->|every write needs an IntDocNumber (waybill) Ref| s7["7 · additional-service"]
  s2 -->|SaveReturnNewAddress needs settlement/street Refs| s7
  s3 -->|SaveRedirecting needs a recipient counterparty Ref| s7
```

## Execution path

| Wave | Steps | Zone per step (why parallel-safe) | Unlocks |
|:---:|---|---|---|
| 1 | 1 ∥ 2 ∥ 3 | 1: `src/modules/common` · 2: `src/modules/address` · 3: `src/modules/counterparty` (disjoint) | 4, 5 |
| 2 | 4 ∥ 5 | 4: `src/modules/internet-document` (new) · 5: `src/modules/tracking-document` (new) (disjoint) | 6, 7 |
| 3 | 6 ∥ 7 | 6: `src/modules/scan-sheet` (new) · 7: `src/modules/additional-service` (new) (disjoint) | — |

Wave 1 is history (already shipped) — shown for completeness so waves 2–3 read against a full
picture, not a headless graph.

## Shipped

| Step | Shipped | Link |
|---|---|---|
| common | 2026-09-20 | [PR #1](https://github.com/associate2coder/nova-poshta-lib/pull/1) |
| address | 2026-09-20 | [PR #3](https://github.com/associate2coder/nova-poshta-lib/pull/3) |
| counterparty | 2026-09-20 | [PR #4](https://github.com/associate2coder/nova-poshta-lib/pull/4) |
