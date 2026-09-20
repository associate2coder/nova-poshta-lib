# Tracker — common

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Rename envelope types; add array-shape check | infra | \<TBD lead\> | S | — | todo |
| T2 | Define the 15 reference-list types | domain | \<TBD lead\> | M | T1 | todo |
| T3 | Implement createCommonModule | ports | \<TBD lead\> | M | T2 | todo |
| T4 | Wire public exports | wiring | \<TBD lead\> | S | T3 | todo |
| T5 | Behavior + error-contract tests + benchmark | tests | \<TBD lead\> | L | T1, T3 | todo |
| T6 | Build-surface completeness check | tests | \<TBD lead\> | S | T4 | todo |

**Total:** 6 tasks, ~1 week (S size, per `sad.md` §2 effort budget).
