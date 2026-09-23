# Tracker — additional-service

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Define additional-service domain types | domain | TBD lead | L | — | done |
| T2 | Add `requestFirst<T>()` + `info` exposure to the core client | infra | TBD lead | S | — | done |
| T3 | Refactor internet-document onto shared `requestFirst<T>()` | app | TBD lead | S | T2 | done |
| T4 | `checkReturnPossible` / `checkReturnEditPossible` | app | TBD lead | M | T1, T2 | done |
| T5 | `createReturn` / `calculateReturn` | app | TBD lead | L | T1, T2 | done |
| T6 | `updateReturn` | app | TBD lead | S | T1, T2 | done |
| T7 | Return list/reason reads | app | TBD lead | S | T1, T2 | done |
| T8 | `checkRedirectPossible` / `checkRedirectEditPossible` | app | TBD lead | M | T1, T2 | done |
| T9 | `createRedirect` / `calculateRedirect` | app | TBD lead | M | T1, T2 | done |
| T10 | `updateRedirect` / `getRedirectionOrdersList` | app | TBD lead | M | T1, T2 | done |
| T11 | Waybill-edit group | app | TBD lead | M | T1, T2 | done |
| T12 | `deleteAdditionalServiceOrder` | app | TBD lead | S | T1, T2 | done |
| T13 | `createReturnIfPossible` | app | TBD lead | M | T4, T5 | todo |
| T14 | Wire into public package surface | wiring | TBD lead | S | T4, T5, T6, T7, T8, T9, T10, T11, T12, T13 | todo |
| T15 | Unit test suite (shared error contract) | tests | TBD lead | L | T14 | todo |
| T16 | Build-surface check | tests | TBD lead | S | T14 | todo |
| T17 | README usage example | docs | TBD lead | S | T14 | todo |

**Total:** 17 tasks, ~7–8 person-days (L≈1.5d, M≈1d, S≈0.5d, rough).
