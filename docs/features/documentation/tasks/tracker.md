# Tracker — documentation

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Add `typedoc.json` + devDependency + `docs:build` script | infra | associate2coder | S | — | done |
| T2 | Audit and mark all internal-only exports `@internal` | docs | associate2coder | M | — | done |
| T3 | TSDoc the core client | docs | associate2coder | S | T2 | done |
| T4 | TSDoc `common` + `address` modules | docs | associate2coder | M | T2 | done |
| T5 | TSDoc `counterparty` + `internet-document` modules | docs | associate2coder | M | T2 | done |
| T6 | TSDoc `tracking-document` + `scan-sheet` + `additional-service` modules | docs | associate2coder | M | T2 | done |
| T7 | Add documentation-coverage step to `ci.yml`, report-only | wiring | associate2coder | S | T1 | done |
| T8 | Run the validation spike, then flip to hard-fail | tests | associate2coder | M | T3, T4, T5, T6, T7 | done |
| T9 | Add docs-deploy job to `release.yml` | wiring | associate2coder | M | T1 | todo |

**Total:** 9 tasks, ~7 person-days.
