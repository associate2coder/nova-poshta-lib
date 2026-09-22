---
id: T5
title: "Unit test suite for scan-sheet"
layer: "tests"
deps: ["T4"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09", "AC-10", "AC-11", "AC-12", "AC-13"]
files_hint: ["test/unit/modules/scan-sheet.test.ts"]
owner: "<TBD lead>"
estimate: "M"
status: "todo"
---

# T5 — Unit test suite for scan-sheet

## Why

[spec.md Test plan → AC coverage](../spec.md) maps all 13 ACs to unit-level tests; the
`quick`-route test plan is kept inline in `spec.md`, not a separate `test-plan.md` (size S).

## What

Create `test/unit/modules/scan-sheet.test.ts`, mocking `fetch` (no real network), covering:

- AC-01/AC-02: `insertDocuments` creates vs. adds to an existing sheet.
- AC-03: `addToTodaysScanSheet`'s match/create/propagate-failure branches (may reuse T3's fixtures).
- AC-04/AC-05: `getScanSheet` by `Ref` and by `CounterpartyRef`, plus an empty-array (no match) case.
- AC-06: `getScanSheetList` returns every visible sheet.
- AC-07/AC-08: `removeDocuments` happy path + a per-item `Error` fixture that resolves normally.
- AC-09/AC-10: `deleteScanSheet` happy path + a per-item `Error` fixture.
- AC-11/AC-12/AC-13: declined / non-list / network-failure branches throw `NovaPoshtaApiError`,
  swept across all 6 methods.
- ADR-0001: a dedicated empty-but-successful-array fixture for `insertDocuments`,
  `removeDocuments`, and `deleteScanSheet` each — asserts `[]` is returned, not thrown.
- `spec.md` §6 NFR row 5: median library-added overhead ≤5ms across ≥30 stubbed single-item calls
  to a raw method (`addToTodaysScanSheet` excluded), `fetch` stubbed to near-zero latency.

## Definition of Done

- [ ] All 13 ACs have ≥1 passing test.
- [ ] The ADR-0001 empty-array fixture passes for all three write methods.
- [ ] The NFR-5 overhead benchmark passes and always runs in CI.
- [ ] `npm test` green; lint + vet clean.

## Notes

Distinguish carefully between "declined at the envelope level" (throws) and "per-item `Error` in an
otherwise-successful batch" (never throws) — conflating the two is the exact bug class QG-1
(`sad.md §10`) guards against.
