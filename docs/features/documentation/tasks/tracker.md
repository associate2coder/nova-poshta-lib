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
| T9 | Add docs-deploy job to `release.yml` | wiring | associate2coder | M | T1 | done* |
| T10 | Fix `Area`/`WarehouseType` unbrowsable aliases | docs | associate2coder | XS | — | todo |
| T11 | Export `ReferenceRecordBase`, fix 8 unbrowsable common aliases, re-enable `notExported` | docs | associate2coder | S | — | todo |
| T12 | Export `DeleteBatchInternetDocumentPayload` from `src/index.ts` | docs | associate2coder | XS | — | todo |
| T13 | Add `contents: read` to `docs-deploy` job | wiring | associate2coder | XS | — | todo |
| T14 | Add `enablement: true` to `configure-pages` step | wiring | associate2coder | XS | — | todo |
| T15 | Automated test for AC-02's exact-symbol-name behavior | tests | associate2coder | S | — | todo |
| T16 | Fix stale report-only test | tests | associate2coder | XS | — | todo |
| T17 | Add `docs:check` script, use it from `ci.yml` | wiring | associate2coder | XS | — | todo |
| T18 | Add `includeVersion` to `typedoc.json` | infra | associate2coder | XS | — | todo |

**Total:** 9 tasks, ~7 person-days, +9 follow-up tasks from `_review/review-2026-09-23.md` (CHANGES REQUESTED).

\* T9: structural DoD verified; the live end-to-end check (actual npm publish → site update ≤5min)
is not verifiable in an implementation session — confirm against the first 3 real releases (spec §7 KPI).
