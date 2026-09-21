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

## Post-re-review follow-ups (`/sdd:review` 2026-09-21, sixth pass)

7 findings resolved — a genuinely fresh pass over the whole feature, not just round 5's changed
surface (no new task IDs): `getDocumentPrice`/`getDocumentDeliveryDate`'s real throw-on-empty-data
behavior was undocumented in the contract's error table and `sad.md`'s flow 4 (T4); round 5's own
contract fix (R4) mis-described `common`'s colliding exports as "fixed literal sets" instead of
runtime record types (T1); round 5's own JSDoc fix (R1) understated which fields clear on `update`
omission — only `BackwardDeliveryData` was named, not `SenderFlat`/`RecipientFlat` (T2);
`tasks/t2-save-and-update.md`'s DoD and two `test-plan.md` spots plus `sad.md`'s QG-1 still carried
ADR-0001's retired two-axis language after four prior rounds scrubbed it elsewhere (T2); `test-plan.md`'s
AC-06 row didn't map round 5's new pass-through test (T7); and `review-2026-09-21-05.md`'s self-reported
post-fix test count was off by one (191 vs the actual 190). This round's verdict is the first **PASS** —
every finding was a doc/JSDoc accuracy correction, no shipped behavior changed. See
`_review/review-2026-09-21-06.md` for the full findings table.

## Post-re-review follow-ups (`/sdd:review` 2026-09-22, seventh pass)

5 findings resolved via `/sdd:implement` (no new task IDs): `build-surface.test.ts` only detected a
*missing* `dist/`, never a *stale* one (T8); AC-02's negative type tests never typed a payload
against `InternetDocumentModule["save"/"update"]`'s own call-site parameter, only named variant
types (T7); `sad.md` §9 still listed ADR-0001 as "Accepted" when the ADR's own file says
`Superseded` (T1); `sad.md` flow 3 didn't show the empty-`Documents` pre-fetch throw the code and a
test already cover (T5); no `.changeset/` entry existed for this feature (release gate). Also, per
explicit instruction, re-consulted Nova Poshta's official documentation: `developers.novaposhta.ua`
remains blocked (403), but a different official domain, `devcenter.novaposhta.ua`, corroborated
(via a search-engine cache — direct fetch fails on a broken TLS handshake) the print link's `apiKey`
embedding and single-combined-link behavior from a primary source for the first time, narrowing
`spec.md` §8 OQ-1. This round's verdict is **PASS**, all findings doc/test-robustness/release-process
only — no shipped behavior changed. See `_review/review-2026-09-22.md` for the full findings table.

## Post-re-review follow-ups (`/sdd:review` 2026-09-22, eighth pass)

4 findings resolved (no new task IDs), plus one real bug the round's own verification work
surfaced. Doc-drift findings: round 7's own docs-confirmation didn't propagate to `sad.md`
(§2 regulatory note, §11 risk row) or `contracts/api-sync-report.md`, which still called the same
two assumptions "unconfirmed" after `spec.md` had already updated to "confirmed" (T1); `spec.md`'s
"match... exactly" phrasing overclaimed what the `devcenter.novaposhta.ua` source actually showed
(T1); `spec.md`/`sad.md` frontmatter `updated_at` was stale relative to same-day edits (T1); this
tracker's seventh-pass section was inserted out of chronological order (this file). **Real bug found
and fixed while verifying the overclaim:** re-fetching `serj1chen/nova-poshta-sdk-php`'s
`getPrintLink()` *implementation* (not just its constants, which round 7 had stopped at) showed
`Copies` was never a `/copies/<value>` URL segment — `printDocument`/`printMarkings` had been
sending Nova Poshta a URL segment it doesn't define. `"fourfold"` actually repeats each Ref's
`orders[]/<ref>` segment twice; every other value repeats it once. Fixed in
`buildAndVerifyPrintLink` (T5), with a new test for the `fourfold` case and the existing `Copies`
test corrected (T7); `PrintLinkPayload.Copies`'s doc comment, `contracts/public-api.md` §3.7,
`ADR-0003`'s amendment log, and `spec.md` §8 OQ-1 all updated to match (T1). See
`_review/review-2026-09-22-08.md` for the full findings table.

## Post-ship API-contract re-audit (2026-09-22, triggered by CLAUDE.md's new sourcing policy)

PR #6 merged this feature to `main` before this pass. A new repo-wide policy — every request field
and wire method must trace to Nova Poshta's own docs or ≥2 agreeing independent implementations,
quoting the exact upstream struct — triggered re-auditing this module's shipped contract against a
widened pool of 5 cross-checked sources (was 3). Three findings, shipped in a follow-up PR rather
than amending the merged one:

1. **`ServiceType`/`CargoType` cardinality — expanded.** A second independent source
   (`shopanaio/carrier-api`) corroborated `platx/go-nova-poshta`'s 6-value `ServiceType` list
   (Postomat pair); `CargoType` widened to its full 8-value list (uncontradicted single source,
   plus ADR-0004 already established no structural leg shape depends on it). `save`/`update`'s
   discriminated union still only models the original 4 `ServiceType` values — Postomat's
   required-field shape has only 1 confirming source.
2. **`delete` batch capability — narrowed (breaking).** Re-fetching all 4 original sources' actual
   code found 3 of 4 type the wire field as single-Ref-only; no source demonstrates a genuine
   multi-Ref call. `delete` now takes exactly one `Ref` and resolves one outcome; a new
   `deleteBatch` method replaces the previous single-call batch shape with a client-side sequential
   loop (T3, T1 for docs). See ADR-0005 (supersedes ADR-0002's batch-call premise, keeps its
   per-Ref outcome shape).
3. **Print-link mechanism — contested, downgraded to provisional (no code change).** Widening the
   pool to 5 surfaced a fourth source building the same URL differently (comma-joined segment,
   lowercase `type`, no `Copies`) and proving these methods are also reachable as plain enveloped
   calls — a path `ADR-0003`'s design assumed was closed. AC-11/AC-12/AC-13 downgraded from
   confirmed happy-path to provisional; shipped behavior unchanged pending a live API key or a
   reachable primary source (T1 for docs, ADR-0003 amendment log).

Also fixed in this pass: the ship changelog's usage example called `createClient({apiKey: "..."})`
— `createClient` actually takes a plain string (`src/client.ts:44`), matching the README's
already-correct example, not the changeset's wrong one.

Test suite simplified as a side effect of finding 2: the regex-based per-Ref message-attribution
logic ADR-0002 needed (to match a warning/error to the right Ref when several were in one response)
is no longer necessary — a single-Ref response's warnings/errors can only concern that one Ref.
193 tests → 191 (5 batch-attribution tests removed, 3 new `delete`/`deleteBatch` tests added, net
-2; all consolidated under new `delete`/`deleteBatch` describe blocks in
`test/unit/modules/internet-document.test.ts`). Full gate re-run clean: `tsc --noEmit`, `npm test`
(191 passed, 2 skipped), `npm run lint`, `npm run build`.
