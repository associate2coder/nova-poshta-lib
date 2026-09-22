---
id: T7
title: "Opt-in integration smoke test"
layer: "tests"
deps: ["T4"]
acs: ["AC-01", "AC-04", "AC-06", "AC-09"]
files_hint: ["test/integration/scan-sheet.test.ts"]
owner: "<TBD lead>"
estimate: "M"
status: "todo"
---

# T7 — Opt-in integration smoke test

## Why

[spec.md Test plan → Test data](../spec.md) fixes the strategy: `insertDocuments`/`removeDocuments`
take a waybill `Ref` (UUID), not a printed waybill number, so this module's integration test creates
its own throwaway waybill via `internet-document`'s `save()` rather than depending on a pre-existing
one — corrected during the critic pass on `spec.md`.

## What

Create `test/integration/scan-sheet.test.ts`, gated by `NOVA_POSHTA_TEST_API_KEY` (same convention
as every other `test/integration/**` file):

1. Create a throwaway waybill via `internet-document`'s `save()` to obtain a real `Ref`.
2. `insertDocuments` that `Ref` into a new scan sheet (AC-01).
3. `getScanSheet` by the returned sheet `Ref`, confirm it appears (AC-04).
4. `getScanSheetList`, confirm the sheet appears (AC-06).
5. `deleteScanSheet` the sheet (AC-09); confirm a following `getScanSheetList` no longer includes it.
6. Clean up: delete the throwaway waybill via `internet-document`'s `delete`.

## Definition of Done

- [ ] Test is skipped automatically (not failed) when `NOVA_POSHTA_TEST_API_KEY` is absent.
- [ ] Never wired into a CI job that lacks the key.
- [ ] Both the scan sheet and the waybill are deleted at the end of the run, success or failure.

## Notes

Whether a saved-then-deleted waybill is genuinely free of charge on a live account is an open
question (`spec.md §8`) — proceed with the create-then-delete design as specified; if it proves
costly, that's a follow-up, not a blocker for this task.
