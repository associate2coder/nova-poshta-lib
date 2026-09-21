---
id: T1
title: "Define internet-document domain types"
layer: "domain"
deps: []
acs: ["AC-02", "AC-05", "AC-06", "AC-07", "AC-08"]
files_hint: ["src/types/internet-document.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T1 — Define internet-document domain types

## Why

The full request/response type surface for all 8 methods, derived from
[contracts/public-api.md §2–§3](../contracts/public-api.md), [sad.md §4 decisions 7–8](../sad.md),
[ADR-0001](../adr/0001-compose-service-type-and-cargo-type-as-two-intersected-type-sets.md), and
[ADR-0002](../adr/0002-per-ref-outcome-array-for-batch-delete.md). This is the first module in the
library whose write payload must stay a discriminated union across **two** independent axes — landing
it before any method implementation means T2–T5 only wire calls into an already-typed shape, no type
design happens inside an app task.

## What

In `src/types/internet-document.ts`:
- `ServiceType` (4 literal values, ADR-0001), `CargoType` (4 literal values, ADR-0001), `PayerType`,
  `PaymentMethod`, `BackwardDeliveryData`.
- The 4 hand-written `ServiceType`-leg variants (`SaveWarehouseToWarehousePayload`/
  `SaveWarehouseToDoorsPayload`/`SaveDoorsToWarehousePayload`/`SaveDoorsToDoorsPayload`), unioned into
  `SaveInternetDocumentPayload` — never collapsed to a single flat shape with every field optional,
  never a single distributive-conditional formula. **Superseded (review remediation, 2026-09-21):**
  originally planned as this union intersected with a `CargoType` discriminant (ADR-0001); ADR-0004
  narrows `CargoType` to a plain field on `SaveInternetDocumentPayload`, not a second structural axis —
  no intersection with a separate `CargoType`-leg union.
- `UpdateInternetDocumentPayload` — `Required<SaveInternetDocumentPayload> & { Ref: string }`, per the
  full-replace convention (AC-06): an omitted `BackwardDeliveryData` on update must type-check as
  clearing it, never as "leave unchanged".
- `SavedInternetDocument` (the `save`/`update` response record).
- `DeleteInternetDocumentPayload` (`{ Documents: string[] }`) and `DeletedInternetDocumentOutcome`
  (`{ Ref, Removed, Reason? }`) — a per-Ref outcome array, never `T | undefined` (ADR-0002).
- `GetDocumentListFilters`/`WaybillListItem`, `GetDocumentPricePayload`/`DocumentPriceEstimate`,
  `GetDocumentDeliveryDatePayload`/`DocumentDeliveryDateEstimate`, `PrintLinkPayload`.

No runtime code in this task — types only.

## Definition of Done

- [ ] `src/types/internet-document.ts` compiles with zero `any`.
- [ ] `SaveInternetDocumentPayload` is the `ServiceType`-leg union (not a single flat shape, not a
      distributive conditional type), with `CargoType` as a plain discriminant field on each variant,
      not a second intersected axis — verified by inspection in review, per ADR-0004 (superseding
      ADR-0001's original two-axis plan).
- [ ] `UpdateInternetDocumentPayload` is derived from `SaveInternetDocumentPayload` via `Required<>`,
      not a hand-written duplicate.
- [ ] `DeletedInternetDocumentOutcome` is an array-element shape (never wrapped in `T | undefined`),
      matching ADR-0002.
- [ ] `tsc --noEmit` passes.
- [ ] lint clean.

## Notes

This is the one task every app task (T2–T5) depends on — keep it strictly type-only so it can land
first without waiting on any method's implementation. A discriminated-union mistake here (e.g.
collapsing the `ServiceType`-leg union to shared fields, or reinstating a `CargoType`-leg intersection
ADR-0004 rejected) silently reopens AC-02, so give that shape extra review attention.
`contracts/public-api.md` §10 flags that the real wire `ServiceType`/`CargoType` enums carry more
values (6/8) than the accepted 4/4 — this task builds to the already-Accepted set, not the wider one;
widening is a future ADR revision, not this task's scope.
