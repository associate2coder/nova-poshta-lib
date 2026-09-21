---
id: T4
title: "Implement list/price/delivery-date methods"
layer: "app"
deps: ["T1"]
acs: ["AC-03", "AC-04", "AC-09", "AC-10"]
files_hint: ["src/modules/internet-document/index.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T4 — Implement list/price/delivery-date methods

## Why

Derives from [contracts/public-api.md §3.4–3.6](../contracts/public-api.md) and [sad.md §6 Flow
4](../sad.md) — the three read/calculate methods that share one shape (single request, single typed
response, no write-return complexity), bundled into one task because none of the three needs its own
reconciliation or discriminant logic.

## What

In `src/modules/internet-document/index.ts`:
- `getDocumentList(filters?)` — delegates to `client.request()`; every documented filter
  (`DateTimeFrom`/`DateTimeTo`/`Page`) stays optional and is passed through unmodified when supplied —
  no default injected, no auto-paging, no client-side re-filtering (AC-09, AC-10, matching
  `address`/`counterparty`'s identical pagination limitation).
- `getDocumentPrice(payload)` — delegates to `client.request()`, returns exactly Nova Poshta's
  calculated price, no client-side recalculation, no link stored to a later `save` call (AC-03,
  `spec.md` §3 non-goal).
- `getDocumentDeliveryDate(payload)` — same shape as `getDocumentPrice`, for the delivery-date
  calculation (AC-04).

## Definition of Done

- [ ] `getDocumentList` has a mocked-`fetch` unit test for the no-filter call and a second test
      asserting a supplied `DateTimeFrom`/`DateTimeTo` filter reaches the request unmodified and the
      response is typed identically to the unfiltered call (AC-09, AC-10).
- [ ] `getDocumentPrice` and `getDocumentDeliveryDate` each have a happy-path mocked-`fetch` unit test
      asserting the typed result and that no state is retained/cached between the calculator call and
      any later call.
- [ ] lint + `tsc --noEmit` clean.

## Notes

Shares `src/modules/internet-document/index.ts` with T2/T3/T5 — `implement` serializes this lane via
the overlapping `files_hint`. No AC-14/15/16 error-path test here; covered once across all 8 methods
in T7.
