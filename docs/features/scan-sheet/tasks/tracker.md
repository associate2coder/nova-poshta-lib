# Tracker — scan-sheet

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Define scan-sheet domain types | domain | \<TBD lead\> | S | — | todo |
| T2 | Implement the 5 raw pass-through methods | app | \<TBD lead\> | M | T1 | todo |
| T3 | Implement addToTodaysScanSheet | app | \<TBD lead\> | M | T2 | todo |
| T4 | Wire public exports | wiring | \<TBD lead\> | S | T2, T3 | todo |
| T5 | Unit test suite | tests | \<TBD lead\> | M | T4 | todo |
| T6 | Build-surface completeness check | tests | \<TBD lead\> | S | T4 | todo |
| T7 | Opt-in integration smoke test | tests | \<TBD lead\> | M | T4 | todo |
| T8 | README usage example | docs | \<TBD lead\> | S | T4 | todo |

**Total:** 8 tasks, ~1 person-week.
