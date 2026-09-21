# Tracker — internet-document

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Define internet-document domain types | domain | associate2coder | M | — | done |
| T2 | Implement save and update methods | app | associate2coder | M | T1 | done |
| T3 | Implement delete with per-Ref outcome reconciliation | app | associate2coder | M | T1 | done |
| T4 | Implement list/price/delivery-date methods | app | associate2coder | M | T1 | done |
| T5 | Implement printDocument/printMarkings via construct-then-verify | app | associate2coder | M | T1 | done |
| T6 | Wire `internet-document` module into the public package surface | wiring | associate2coder | S | T2, T3, T4, T5 | done |
| T7 | Unit test suite for `internet-document` | tests | associate2coder | L | T6 | done |
| T8 | Extend published-build type-surface check | tests | associate2coder | S | T6 | done |
| T9 | Update README usage example | docs | associate2coder | S | T6 | done |

**Total:** 9 tasks, ~8–10 person-days (fits the M sizing's 1–2 sprint budget, `sad.md` §2).

## Post-review follow-ups (`/sdd:review` 2026-09-21)

10 findings resolved via `/sdd:implement` (no new task IDs — fixes to the tasks above): AC-02 sender-leg
+ CargoType-axis correction (T1), `apiKey` non-enumerability regression (T6), AC-08 real rejection
reason (T3), print-link URL test/HEAD-request fixes (T5), README AC-05 guard (T9), AC-06 test fix
(T7), and a scoped integration suite covering AC-09 only (T7 — see `test-plan.md`'s integration-tier
deferral note for AC-01/03/04/06/07/10/11/12, owner: Tech Lead). AC-19's shallow build-surface check
(T8) deferred to `spec.md` §8 as a cross-module, address/counterparty-shared gap. See
`_review/review-2026-09-21.md` for the full findings table.
