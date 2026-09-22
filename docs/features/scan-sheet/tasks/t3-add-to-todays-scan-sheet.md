---
id: T3
title: "Implement addToTodaysScanSheet (convenience, match-or-create)"
layer: "app"
deps: ["T2"]
acs: ["AC-03"]
files_hint: ["src/modules/scan-sheet/index.ts"]
owner: "<TBD lead>"
estimate: "M"
status: "todo"
---

# T3 — Implement addToTodaysScanSheet (convenience, match-or-create)

## Why

[spec.md AC-03](../spec.md) and [sad.md §4 decision 3 / §6 Flow 2](../sad.md) fix the exact
mechanism: compose this module's own `getScanSheetList` + `insertDocuments` internally, matching
`internet-document`'s `deleteBatch`→`delete` composition precedent (ADR-0005). No legitimate
alternative was open to this design pass.

## What

In `src/modules/scan-sheet/index.ts`, implement `addToTodaysScanSheet(documentRefs)`:

1. Compute today's Europe/Kyiv calendar date via a module-local (not exported)
   `Intl.DateTimeFormat` helper with `timeZone: "Europe/Kyiv"` — no new runtime dependency.
2. Call `getScanSheetList()` exactly once.
3. Filter to today's still-unprinted (`Printed === "0"`) sheets; if ≥1 match, pick the one with the
   highest `DateTime`.
4. Call `insertDocuments` exactly once with `DocumentRefs: documentRefs`, `Ref: matchedRef ?? ""`,
   `Date: today` — an empty-string `Ref` creates a new sheet when no match exists.
5. Return the same typed result `insertDocuments` returns.

A failed `getScanSheetList` call must propagate its `NovaPoshtaApiError` immediately — never fall
through to step 4 and create a new sheet.

## Definition of Done

- [ ] Mocked-fetch unit test: 2+ unprinted today-sheets in the `getScanSheetList` fixture → the
      newest `DateTime` is chosen and passed as `Ref` to `insertDocuments`.
- [ ] Mocked-fetch unit test: zero matching sheets → `insertDocuments` called with `Ref: ""`.
- [ ] Mocked-fetch unit test: `getScanSheetList` throws → `addToTodaysScanSheet` propagates the same
      error without ever calling `insertDocuments`.
- [ ] `getScanSheetList` is called exactly once and `insertDocuments` exactly once per successful
      invocation (no extra calls).
- [ ] lint + vet clean.

## Notes

Shares `src/modules/scan-sheet/index.ts` with T2 — same lane. The two-call TOCTOU race (another
caller inserting into or printing the matched sheet between the two calls) is accepted by design
(`sad.md §11`) — not something this task guards against. `Printed === "0"` as the "still unprinted"
sentinel is a best-guess flagged in `sad.md §11` as a pre-`sdd:ship` open question — implement
against it as specified, don't invent your own sentinel.
