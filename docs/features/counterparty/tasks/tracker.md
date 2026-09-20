# Tracker — counterparty

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Define counterparty domain types | domain | associate2coder | M | — | todo |
| T2 | Implement counterparty and contact-person lookups | app | associate2coder | S | T1 | todo |
| T3 | Implement cross-module address + options lookups | app | associate2coder | S | T1 | todo |
| T4 | Implement counterparty write methods | app | associate2coder | M | T1 | todo |
| T5 | Implement contact-person write methods | app | associate2coder | M | T1 | todo |
| T6 | Implement `findCounterparty` convenience method | app | associate2coder | S | T2 | todo |
| T7 | Wire `counterparty` module into the public package surface | wiring | associate2coder | S | T2, T3, T4, T5, T6 | todo |
| T8 | Unit test suite for `counterparty` | tests | associate2coder | M | T7 | todo |
| T9 | Extend published-build type-surface check | tests | associate2coder | S | T7 | todo |
| T10 | Update README usage example | docs | associate2coder | S | T7 | todo |

**Total:** 10 tasks, ~5–6 person-days (fits the S sizing's ~1-week budget, `sad.md` §2).
