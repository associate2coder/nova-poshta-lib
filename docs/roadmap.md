---
status: living
updated_at: "2026-09-22"
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
available as a typed, tested, documented module in `nova-poshta-lib`, published to npm.

## Steps

| # | Step | Source | Size | Status |
|---|---|---|:---:|---|
| 1 | common — typed reference-list module (15 methods: cargo types, payment forms, service types, …) | `docs/features/common/spec.md` §1 | S | shipped |
| 2 | address — typed Address domain module (11 methods + `findCityByName` convenience) | `docs/features/address/spec.md` §1 | S | shipped |
| 3 | counterparty — typed Counterparty + ContactPerson module (11 methods + `findCounterparty` convenience) | `docs/features/counterparty/spec.md` §1 | S | shipped |
| 4 | internet-document — typed shipment/waybill creation module, built on address + counterparty `Ref`s and common's reference types | [`docs/features/internet-document/spec.md`](features/internet-document/spec.md) | M | shipped |
| 5 | tracking-document — typed module (1 raw method + 1 single-waybill convenience) for tracking a shipment by waybill number + optional phone, independent of internet-document and `common` | [`docs/features/tracking-document/spec.md`](features/tracking-document/spec.md) | S | shipped |
| 6 | scan-sheet — typed module (5 raw methods + `addToTodaysScanSheet` convenience) for batching waybills into a scan sheet for courier handoff | [`docs/features/scan-sheet/spec.md`](features/scan-sheet/spec.md) | S | shipped |
| 7 | additional-service — typed module (18 raw methods + `createReturnIfPossible` convenience) for post-creation shipment actions: returns, redirections, waybill edits | [`docs/features/additional-service/spec.md`](features/additional-service/spec.md) | M | spec'd |
| 8 | documentation — TSDoc comments on every exported symbol across all modules + TypeDoc-generated static API reference, wired into CI/publish | `docs/architecture-map.md` §Intent ("documented" listed as a foundation requirement; no step covers it — the README has usage snippets but no generated reference) | S | idea |

Sizing note: 4 and 7 are called **M** rather than **S** like their shipped precedents because each
has a genuinely broader method surface than `common`/`address`/`counterparty` — 4 adds
creation + pricing/date-calculator + report/printing sub-flows; 7 adds five distinct write-payload
shapes (plain return, return-to-new-address, return-to-new-warehouse, redirect, waybill edit) —
even though PR count may land near the S/M border same as the shipped modules. **Updated
(2026-09-23, `additional-service` specify session):** now that step 7 is spec'd, its confirmed
surface against Nova Poshta's official docs is 19 typed methods (18 raw + 1 convenience) — broader
than originally framed, but still **M**, not L: every method lives in one new, self-contained
module folder, touches no shared infrastructure, and breaks no existing consumer (the criteria that
would actually push it to L); the 19 methods also decompose into a handful of structurally repeated
shapes (4 near-identical possibility checks, 3 list reads, 2 reason lookups, 2 pricing calculators
mirroring their sibling create calls, 1 shared delete) rather than 19 independently novel designs —
see `docs/features/additional-service/spec.md` §1's decision override. 8 is **S**: no new
module/API/migration and no breaking changes, just a TSDoc pass over the existing public surface
plus a TypeDoc + CI publish step (2–5 PRs).

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
- `tracking-document` does **not** depend on `common`, reversing this graph's original
  "reuses `DocumentStatus` type" edge below — nothing confirms `common.getDocumentStatuses()`'s
  values correspond to `TrackingDocument`'s own status code, and the library already had a third,
  independent status representation (`internet-document`'s `StateId`/`StateName`) the original edge
  didn't account for either. `tracking-document` defines its own status representation instead,
  matching the hardcode-and-hand-sync precedent `internet-document` set for `ServiceType`/`CargoType`
  → [`docs/features/tracking-document/spec.md`](features/tracking-document/spec.md) §1 Decision override

## Dependency graph

```mermaid
flowchart LR
  s1["1 · common"] -->|reuses PaymentForm/ServiceType/CargoType/Pallet/Tray/TireWheel/PayerType types| s4["4 · internet-document"]
  s5["5 · tracking-document"]
  s2["2 · address"] -->|needs city/street/warehouse Ref| s4
  s3["3 · counterparty"] -->|needs sender/recipient/contact-person Ref| s4
  s4 -->|InsertDocuments/RemoveDocuments need waybill Refs| s6["6 · scan-sheet"]
  s3 -->|GetScanSheet needs a counterparty Ref| s6
  s4 -->|every write needs an IntDocNumber (waybill) Ref| s7["7 · additional-service"]
  s2 -->|SaveReturnNewAddress needs settlement/street Refs| s7
  s3 -->|SaveRedirecting needs a recipient counterparty Ref| s7
  s1 -->|documents the complete public surface only once every module has shipped| s8["8 · documentation"]
  s2 --> s8
  s3 --> s8
  s4 --> s8
  s5 --> s8
  s6 --> s8
  s7 --> s8
```

## Execution path

| Wave | Steps | Zone per step (why parallel-safe) | Unlocks |
|:---:|---|---|---|
| 1 | 1 ∥ 2 ∥ 3 | 1: `src/modules/common` · 2: `src/modules/address` · 3: `src/modules/counterparty` (disjoint) | 4, 5 |
| 2 | 4 ∥ 5 | 4: `src/modules/internet-document` (new) · 5: `src/modules/tracking-document` (new) (disjoint) | 6, 7 |
| 3 | 6 ∥ 7 | 6: `src/modules/scan-sheet` (new) · 7: `src/modules/additional-service` (new) (disjoint) | 8 |
| 4 | 8 | 8: cross-cutting — TSDoc comments in every `src/modules/*` + new `typedoc.json` + `.github/workflows/*` docs-publish step (whole repo, not disjoint with anything — runs alone) | — |

Wave 1 is history (already shipped) — shown for completeness so waves 2–4 read against a full
picture, not a headless graph.

## Shipped

| Step | Shipped | Link |
|---|---|---|
| common | 2026-09-20 | [PR #1](https://github.com/associate2coder/nova-poshta-lib/pull/1) |
| address | 2026-09-20 | [PR #3](https://github.com/associate2coder/nova-poshta-lib/pull/3) |
| counterparty | 2026-09-20 | [PR #4](https://github.com/associate2coder/nova-poshta-lib/pull/4) |
| internet-document | 2026-09-22 | [PR #6](https://github.com/associate2coder/nova-poshta-lib/pull/6) |
| tracking-document | 2026-09-22 | [PR #9](https://github.com/associate2coder/nova-poshta-lib/pull/9) |
| scan-sheet | 2026-09-22 | [PR #10](https://github.com/associate2coder/nova-poshta-lib/pull/10) |
