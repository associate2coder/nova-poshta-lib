# Tracker — scan-sheet

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Define scan-sheet domain types | domain | Tech Lead | S | — | done |
| T2 | Implement the 5 raw pass-through methods | app | Tech Lead | M | T1 | done |
| T3 | Implement addToTodaysScanSheet | app | Tech Lead | M | T2 | done |
| T4 | Wire public exports | wiring | Tech Lead | S | T2, T3 | done |
| T5 | Unit test suite | tests | Tech Lead | M | T4 | done |
| T6 | Build-surface completeness check | tests | Tech Lead | S | T4 | done |
| T7 | Opt-in integration smoke test | tests | Tech Lead | M | T4 | done |
| T8 | README usage example | docs | Tech Lead | S | T4 | done |
| T9 | Format-agnostic addToTodaysScanSheet date match + malformed-field guard | app | Tech Lead | S | T4 | done |
| T10 | Fix README/changeset Ref-vs-tracking-number examples | docs | Tech Lead | S | T8 | done |
| T11 | Fix integration test Kyiv-timezone helper + document env vars | tests | Tech Lead | S | T7 | done |
| T12 | Missing unit coverage: insertDocuments Errors, empty-request, delete-then-list | tests | Tech Lead | S | T9 | done |
| T13 | Record review sign-off, close ship gates | docs | Tech Lead | S | T9, T10, T11, T12 | done |

**Total:** 13 tasks (8 original + 5 review follow-ups, `_review/review-2026-09-22.md`), ~1 person-week.
