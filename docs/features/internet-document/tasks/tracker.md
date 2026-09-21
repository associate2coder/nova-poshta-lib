# Tracker — internet-document

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Define internet-document domain types | domain | associate2coder | M | — | todo |
| T2 | Implement save and update methods | app | associate2coder | M | T1 | todo |
| T3 | Implement delete with per-Ref outcome reconciliation | app | associate2coder | M | T1 | todo |
| T4 | Implement list/price/delivery-date methods | app | associate2coder | M | T1 | todo |
| T5 | Implement printDocument/printMarkings via construct-then-verify | app | associate2coder | M | T1 | todo |
| T6 | Wire `internet-document` module into the public package surface | wiring | associate2coder | S | T2, T3, T4, T5 | todo |
| T7 | Unit test suite for `internet-document` | tests | associate2coder | L | T6 | todo |
| T8 | Extend published-build type-surface check | tests | associate2coder | S | T6 | todo |
| T9 | Update README usage example | docs | associate2coder | S | T6 | todo |

**Total:** 9 tasks, ~8–10 person-days (fits the M sizing's 1–2 sprint budget, `sad.md` §2).
