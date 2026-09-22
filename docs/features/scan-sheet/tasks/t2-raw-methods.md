---
id: T2
title: "Implement the 5 raw ScanSheet pass-through methods"
layer: "app"
deps: ["T1"]
acs: ["AC-01", "AC-02", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09", "AC-10", "AC-11", "AC-12", "AC-13"]
files_hint: ["src/modules/scan-sheet/index.ts"]
owner: "<TBD lead>"
estimate: "M"
status: "todo"
---

# T2 — Implement the 5 raw ScanSheet pass-through methods

## Why

[sad.md §4 decision 2](../sad.md) fixes that every raw method delegates straight to
`client.request()` — no `requestEnvelope()` use, since each method's per-item outcome already
carries its own `Error`/`Errors` field. [sad.md §6 Flow 1, 3, 4, 5, 6](../sad.md) draw the exact
request/response shape and error branches for `insertDocuments`, `getScanSheet`,
`getScanSheetList`, `removeDocuments`, and `deleteScanSheet` respectively.

## What

In `src/modules/scan-sheet/index.ts`, implement:

- `insertDocuments(payload)` → `client.request<InsertDocumentsItem[]>("ScanSheet",
  "insertDocuments", payload)`, `Ref` defaulting to `""` when omitted (AC-01), an existing `Ref`
  adding to that sheet (AC-02).
- `getScanSheet(payload)` → passes `Ref` or `CounterpartyRef` through unmodified, whichever is
  supplied (AC-04, AC-05).
- `getScanSheetList()` → no arguments, returns every visible sheet (AC-06).
- `removeDocuments(payload)` → passes `Ref`/`DocumentRefs` through unmodified, no split/cap/reorder
  (AC-07); never calls any waybill-invalidating endpoint (AC-08).
- `deleteScanSheet(payload)` → passes `ScanSheetRefs` through unmodified (AC-09); never calls any
  waybill-invalidating endpoint (AC-10).

`client.request<T>()`'s existing array-shape-checked, error-throwing contract already covers
AC-11/AC-12/AC-13 for all five — no extra error handling needed in this module.

## Definition of Done

- [ ] Each of the 5 methods delegates straight to `client.request()`, no module-local `fetch`.
- [ ] Mocked-fetch unit test per method asserts the request body shape matches its payload exactly.
- [ ] Mocked-fetch unit test confirms a declined/malformed/network-failed call throws
      `NovaPoshtaApiError` for at least one of the five (AC-11/AC-12/AC-13 — full sweep across all
      five lands in T5's suite).
- [ ] lint + vet clean.

## Notes

This task shares `src/modules/scan-sheet/index.ts` with T3 (`addToTodaysScanSheet`) — same lane,
serialized by the overlapping `files_hint`. No client-side cap, split, or reorder of any
`DocumentRefs`/`ScanSheetRefs` array (`spec.md` §3 non-goal) — a Hard Rule, not a style choice.
