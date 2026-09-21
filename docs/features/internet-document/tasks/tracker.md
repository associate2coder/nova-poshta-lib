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

## Post-re-review follow-ups (`/sdd:review` 2026-09-21, second pass)

7 findings resolved via `/sdd:implement`, verifying the round above's fixes and closing what they
introduced/missed (no new task IDs): ADR-0004/client.ts doc drift across `sad.md`, `api-sync-report.md`,
`tasks.json` (T1, T2), an untested recipient-leg AC-02 axis (T2), delete-rejection reason mis-attribution
when both warnings and errors are present (T3), an unconfirmed `HEAD`-verb assumption on print-link
verification — reverted to `GET` (T5), the README's remaining unguarded `counterparty.save()` line (T9),
and a missing `NovaPoshtaSuccessEnvelope` export (T6). See `_review/review-2026-09-21-02.md` for the
full findings table.

## Post-re-review follow-ups (`/sdd:review` 2026-09-21, third pass)

8 findings resolved via `/sdd:implement` (no new task IDs): a likely production-breaking `delete()`
wire-field-name bug — sent `Documents`, the real field is `DocumentRefs` per the cross-checked SDKs
(T3), a stale delete-contract doc describing the pre-N3 joined-reason behavior (T3), a second
undocumented shared-client change (`NovaPoshtaClient.apiKey`, added for the print path) now recorded in
`spec.md`/ADR-0003 (T5), residual `sad.md` contradictions from N1/N6's fixes (T1/T3), an unhandled-
rejection risk in the print-link body-discard cleanup plus a falsifying test for it (T5/T7), the
GET-and-discard print verification's blank/error-page detection gap now recorded in ADR-0003/OQ-1
(T5), and residual ADR-0001→ADR-0004 doc drift in `sad.md`, `api-sync-report.md`, `tasks/_epic.md`,
and `tasks/t1-...` (T1). See `_review/review-2026-09-21-03.md` for the full findings table.

## Post-re-review follow-ups (`/sdd:review` 2026-09-21, fourth pass)

6 findings resolved via `/sdd:implement` (no new task IDs): a real AC-08 bug where `delete`'s
per-Ref reason matching used a plain substring search, so a Ref that's a textual prefix of another
submitted Ref could inherit the wrong reason — fixed with a word-boundary match (T3), a pinning test
for `delete([])`'s documented behavior (T7), `sad.md`'s delete sequence diagram still showing the
pre-fix `request()`/`Documents` design (T1/T3), the contract's transport table and out-of-scope
section never recording `requestEnvelope()`/`apiKey`/`NovaPoshtaSuccessEnvelope` as added public
surface (T1/T6), a stale `Required<>`-derived `UpdateInternetDocumentPayload` description in the
contract and T1's task file that contradicted AC-06's shipped behavior (T1), and residual
ADR-0001→ADR-0004 two-axis language the third round's fix missed in `tasks/_epic.md` and
`tasks/t1-...` (T1). See `_review/review-2026-09-21-04.md` for the full findings table.

## Post-re-review follow-ups (`/sdd:review` 2026-09-21, fifth pass)

4 findings resolved (no new task IDs): the fourth round's `Required<>` doc fix missed one copy —
`update()`'s public JSDoc in `src/modules/internet-document/index.ts` still claimed
`BackwardDeliveryData` was mandatory and used ADR-0001's superseded two-axis language (T1); no test
ever supplied a real `BackwardDeliveryData` value on update, only the omit-to-clear path, so a bug
that unconditionally stripped the field would have passed the whole suite (T7); the compile-time
guarantee that omitting a required leg field (not just mixing legs) fails to compile was documented
but never pinned by a `@ts-expect-error` case, since TS's excess-property short-circuit meant every
existing negative case tested only the "wrong field present" half (T7); and the contract documented
package-root exports as bare `ServiceType`/`CargoType`/`PayerType` when `src/index.ts` actually
aliases them `InternetDocumentServiceType`/`InternetDocumentCargoType`/`InternetDocumentPayerType` to
avoid colliding with `common`'s exports, undocumented in any feature artifact (T1). See
`_review/review-2026-09-21-05.md` for the full findings table.
