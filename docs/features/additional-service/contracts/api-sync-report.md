# API sync report — additional-service

Run: 2026-09-23. Gate: `data-model.md` absent — legal fast-lane skip confirmed (`sad.md` §6: "every
flow's writes are `save`/`update`/`delete` calls to Nova Poshta's own API — this module persists
nothing of its own... `data-model`'s hard-refuse condition ('no schema change') applies and that stage
should be skipped for this feature"). Fields below trace to `spec.md` §1's method table (itself sourced
from Nova Poshta's own official documentation, captured 2026-09-23, cross-checked against 5 independent
SDKs) plus `sad.md` §4/§5/§6.

## Field-origins table

`origin` cites the actual quoted docs excerpt or SDK struct behind each field's decision, per
`CLAUDE.md`'s sourcing policy ("quote or list the exact upstream struct/schema..., not just cite an
SDK by name"). `confidence` follows `spec.md`'s own sourcing bar: `high` = official docs + ≥1
corroborating SDK; `medium` = official docs alone or ≥2 agreeing SDKs without official docs; `low` =
single source / genuinely unconfirmed, tracked as an open question.
>
> **2026-09-23 update (review round 3 fix):** every row below previously citing only `spec §1 row N`
> — a generated artifact citing a generated artifact, not the quote itself — has been corrected to
> cite the actual official-docs excerpt behind it, following the second, complete docs capture (spec.md
> §1's "Round 3" subsection). Several of those rows were graded `high` before this fix despite this
> report's own rubric requiring a docs quote for that grade — the round-3 review flagged the mis-grading
> as the reason two prior review rounds only caught a fraction of the module's unsourced fields.
>
> **2026-09-23 update (review round 4 fix):** round 4's independent re-verification found six rows
> below still graded `high` while citing a "Round 3" quote that, on inspection, didn't actually contain
> what the row claimed (`checkWaybillEditPossible`'s request, `getReturnReasonsSubtypes`'s request, the
> `save` responses for return/redirect/waybill-edit, and `getChangeEWOrdersList`'s request graded `high`
> from an inferred pattern rather than its own example) — plus one row (`createWaybillEdit`'s fields)
> that turned out to cite a fabricated placeholder quote, not a real one. A third docs capture (spec.md
> §1's "Round 4" subsection) now genuinely backs every one of these; the two remaining open value-set
> gaps (`ServiceType`'s full enum, `PaymentMethod`'s `"NonCash"` member) are also closed this round.

| Field (`operation.field`) | Origin | Confidence |
|---|---|---|
| `checkReturnPossible.Number` | official docs' own plain-check request example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23, request added round-4 — this row previously cited only `spec §1 row N` with no actual request quote behind it, round-5 review finding) | high |
| `checkReturnPossible→ReturnAddressOption.{Ref,City,Counterparty,ContactPerson,Address,Phone}` | official docs' own plain-check response example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) | high |
| `checkReturnPossible→ReturnAddressOption.NonCash` (type: boolean, not string) | official docs' own response example returns a JSON boolean, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) — corrects a defect (was typed `string`) | high |
| `checkReturnEditPossible.Ref` | spec §1 row 2 | high |
| `checkReturnEditPossible.Address` (shape) | official docs' edit-check request example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) | high |
| `checkReturnEditPossible→ReturnEditOption.Type` | spec §1 row 2 | high |
| `checkReturnEditPossible→ReturnEditInfo.{PayerTypeDefault,Number}` | spec §1 row 2, sad.md §4 decision 2 / ADR-0001 | high |
| `createReturn.{IntDocNumber,PaymentMethod,Reason,SubtypeReason,Note}` | spec §1 row 3 | high |
| `createReturn.ReturnAddressRef` (plain-return variant) | official docs' save/orderCargoReturn request example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) | high (field + mapping to `checkReturnPossible.Ref` both resolved — spec §8 row 1, sad.md §11 row 1 closed) |
| `createReturn.{RecipientSettlement,RecipientSettlementStreet,BuildingNumber,NoteAddressRecipient}` (new-address variant) | spec §1 row 3 | high |
| `createReturn.RecipientWarehouse` (new-warehouse variant) | spec §1 row 3 | high |
| `createReturn.Destination` (TS-only discriminant) | sad.md §4 decision 4, AC-04 | high (design-mandated, no wire origin by design) |
| `createReturn→SavedReturnOrder.{Number,Ref}` | official docs' own save/orderCargoReturn response example, quoted verbatim spec §1 "Round 4" subsection (2026-09-23) — this row previously cited `spec §1 row 3` with no actual response quote behind it (round-5 review finding) | high |
| `calculateReturn` payload | same as `createReturn` (spec §1 row 4) | high |
| `calculateReturn→OrderPricingEstimate.{Pricing.Services,Pricing.Total,ScheduledDeliveryDate}` | spec §1 row 4 | high |
| `calculateReturn→OrderPricingEstimate.Pricing.FirstDayStorage` (type: string, not number) | official docs' own calculate examples always show a datetime string, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) — corrects a defect (was typed `number`) | high |
| `updateReturn.Ref` | official docs' update request example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) | high — spec §8 OQ-5 resolved |
| `updateReturn.OrderType` (internal, "orderCargoReturn") | official docs' update request example — field this spec's original table omitted; now set internally by the module | high |
| `updateReturn.{RecipientSettlement,RecipientWarehouse,IntDocNumber,RecipientSettlementStreet,PaymentMethod,BuildingNumber,NoteAddressRecipient,Reason,SubtypeReason}` | spec §1 row 5, cross-checked against official docs' own example (2026-09-23) | high |
| `updateReturn` response shape | spec §1 row 5 ("updated order fields, or Pricing+ScheduledDeliveryDate when recalculating") — official docs' own example confirms the shape is genuinely large/variable | medium — typed as `Record<string, unknown>` by design, not from low confidence |
| `getReturnOrdersList.{Number,Ref,BeginDate,EndDate,Page,Limit}` | official docs' own request example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) — `Page`/`Limit` confirmed as JSON strings, not numbers (corrects a defect) | high |
| `getReturnOrdersList→ReturnOrderListItem.*` (11 fields) | official docs' own response example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) | high |
| `getReturnReasons→ReturnReason.{Ref,Description}` | official docs' own response example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) | high |
| `getReturnReasonsSubtypes.ReasonRef` | inferred from the same optional single-filter pattern every other list/filter method's request uses (round-4 review finding: no dedicated request example for this specific method exists in spec §1) | medium |
| `getReturnReasonsSubtypes→ReturnReasonSubtype.{Ref,Description,ReasonRef}` | official docs' own response example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) | high |
| `checkRedirectPossible.Number` | official docs' own checkPossibilityForRedirecting (plain) request example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) | high |
| `checkRedirectPossible→RedirectPossibility.*` (20 fields) | official docs' own response example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) — resolves review round-3's finding that this whole contract shipped unsourced | high |
| `checkRedirectEditPossible.OrderRef` | official docs' edit-check request example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) | high |
| `checkRedirectEditPossible` remaining address/recipient fields | official docs' edit-check request example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) — 14 named optional fields | high — spec §8 OQ-4 resolved |
| `checkRedirectEditPossible` response | spec §1 row 10 ("updated subset of the same field set") | medium — typed as `Partial<RedirectPossibility>` |
| `createRedirect.{IntDocNumber,PaymentMethod,Note,Recipient,RecipientContactName,RecipientPhone,PayerType,Customer,RecipientSettlement,RecipientSettlementStreet,BuildingNumber,NoteAddressRecipient,RecipientWarehouse}` | official docs' own save/orderRedirecting request example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) — resolves review round-3's finding that this whole money-bearing request shipped unsourced | high |
| `createRedirect.ServiceType` (field + full 4-value enum) | official docs' own redirect-calculate page field table, quoted verbatim spec §1 "Round 4" subsection (2026-09-23) — explicit enumeration (`DoorsWarehouse, WarehouseWarehouse, WarehouseDoors, DoorsDoors`), not one example value | high |
| `createRedirect→SavedRedirectOrder.{Number,Ref}` | official docs' own save response example, quoted verbatim spec §1 "Round 4" subsection (2026-09-23) — the "Round 3" citation this row previously used made this claim with no actual quote behind it (round-4 review finding) | high |
| `calculateRedirect` payload | same as `createRedirect`; `OnlyGetPricing: "1"` — the dedicated calculate-return page's own field table confirms the field+value directly (type "integer", example sends the quoted string `"1"`); the dedicated calculate-redirect page confirms the same value for `save` via its own quoted prose sentence ("Відмінність тільки в тому, що використовується параметр OnlyGetPricing із значенням «1»"), though its JSON example and field table both omit the field (a Nova Poshta docs inconsistency, not a sourcing gap) — both quoted verbatim spec §1 "Round 4" subsection (2026-09-23, corrected round-5 — a prior version of this row wrongly claimed both pages' JSON bodies showed the field) | high |
| `updateRedirect.Ref` + all 15 subset fields | official docs' own full update/redirect request+response example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) — resolves review round-3's finding that the prior citation was circular (a "docs example" note asserting the field list "matches this module's already-documented field list" without ever quoting it) | high — spec §8 OQ-5 resolved |
| `updateRedirect.OrderType` (internal, "orderRedirecting") | official docs' update request example — field this spec's original table omitted; now set internally by the module | high |
| `updateRedirect` response shape | spec §1 row 13 ("updated order fields") — official docs' own example confirms a large, variable field set | medium — typed as `Record<string, unknown>` by design, not from low confidence |
| `getRedirectionOrdersList.{Number,Ref,BeginDate,EndDate,Page,Limit}` | inferred from `OrderListFilters` being shared across all three list methods (`getReturnOrdersList`'s and `getChangeEWOrdersList`'s own requests are genuinely quoted) plus this method's own confirmed response — this method's own request was never separately captured (round-5 review finding: a prior version of this row claimed a quote that doesn't exist in spec.md) | medium |
| `getRedirectionOrdersList→RedirectOrderListItem.*` (15 fields) | official docs' own FULL response example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) — the round-1 capture had truncated 10 of the 15 fields as `"...": "..."` | high |
| `getRedirectionOrdersList→RedirectOrderListItem.DocumentNumber` | official docs' own response example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) — corrects a defect (field was missing from the type entirely) | high |
| `checkWaybillEditPossible.IntDocNumber` | official docs' own CheckPossibilityChangeEW request example, quoted verbatim spec §1 "Round 4" subsection (2026-09-23) — the "Round 3" citation this row previously used made this claim with only the response actually quoted, no request (round-4 review finding) | high |
| `checkWaybillEditPossible→WaybillEditPossibility.*` (11 flags + 8 fields) | official docs' own CheckPossibilityChangeEW response example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) — resolves review round-3's finding that this whole response shipped SDK-name-only | high |
| `createWaybillEdit.{IntDocNumber,PaymentMethod,SenderContactName,SenderPhone,Recipient,RecipientContactName,RecipientPhone,PayerType}` | official docs' own "Змінити дані" (save/orderChangeEW) page, quoted verbatim spec §1 "Round 4" subsection (2026-09-23) — the prior "Round 3" citation for this row was a fabricated placeholder quote (every value a bare `"..."`), not a genuine one; this row's `high` grade was unearned until round 4's re-fetch. Neither SDK round 3 credited as "agreeing" was ever reliable: `sirkostya009/go-novapost` has no create method for ChangeEW at all, and `platx/go-nova-poshta`'s own test fixture for its equivalent struct is independently buggy | high |
| `createWaybillEdit→SavedWaybillEditOrder.{Number,Ref}` | official docs' own save response example, quoted verbatim spec §1 "Round 4" subsection (2026-09-23) | high |
| `getChangeEWOrdersList.{Number,Ref,BeginDate,EndDate,Page,Limit}` | official docs' own request example for this specific method (not inferred from the other 2 list methods, contrary to this row's prior wording), quoted verbatim spec §1 "Round 4" subsection (2026-09-23) | high |
| `getChangeEWOrdersList→ChangeEWOrderListItem.*` (10 fields) | official docs' own response example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) — resolves review round-3's finding that spec.md's prior "confirmed verbatim" claim had no actual quote behind it | high |
| `deleteAdditionalServiceOrder.Ref` | official docs' own delete request example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) | high |
| `deleteAdditionalServiceOrder→DeletedAdditionalServiceOrder.Number` | official docs' own delete response example, quoted verbatim spec §1 "Round 3" subsection (2026-09-23) — confirms `{Number}`-only, no `Ref` (resolves review round-3's finding that only the status-gate sentence, not the schema, was previously quoted) | high |
| `createReturnIfPossible.{IntDocNumber,PaymentMethod,Reason,SubtypeReason,Note}` | composed from `createReturn`'s own now-quoted fields (row above) | high |
| `createReturnIfPossible` response | same as `createReturn` (row above) | high |
| `PaymentMethod` = `"Cash"` \| `"NonCash"` | both members confirmed directly on `AdditionalServiceGeneral`'s own pages — the field-description column reads "Форма розрахунку (Cash/NonCash)" verbatim on the return-save, redirect-save, and redirect-calculate pages, spec §1 "Round 4" subsection (2026-09-23) — not carried over from `internet-document` | high |
| `OrderPricingEstimate.Pricing.Total` (type: number) | the "genuinely disagrees with a `\"5.52\"` example" claim had no actual quote behind it anywhere in spec.md (round-4 review finding); both genuine calculate examples (return and redirect calculate pages) show an unquoted JSON number (`0`), spec §1 "Round 4" subsection (2026-09-23) — reverted from `number \| string` to `number` | high |

## Drift checklist

**Forward (contract derived correctly):**

- ✓ **Endpoint ↔ model.** All 19 methods in §3/§4 trace to a `spec.md` §1 table row; no method invented
  with no origin.
- ✓ **Error-code ↔ repo.** Single `NovaPoshtaApiError`, no per-method subclassing — matches
  `CLAUDE.md`'s convention and every sibling module's contract.
- ✓ **Validation ↔ constraint.** `CreateReturnPayload`'s discriminated union enforces AC-04's
  compile-time guard exactly as `sad.md` §4 decision 4 specifies; no constraint invented beyond what
  `spec.md`/`sad.md` state.
- ✓ **OpenAPI ↔ sequence** (read as: contract ↔ sequence, this being a `library-sdk` contract, not
  OpenAPI). Every `sad.md` §6 flow's `alt` branch maps to a row in §6's error-contract table (AC-02,
  AC-07, AC-13, AC-16, AC-19, AC-20, plus the universal AC-21/AC-22/AC-23).

**Back-feed (coverage cross-check):**

- ✓ Every `spec.md` §5 AC maps to ≥1 method/response in §3/§6 — cross-checked against `sad.md` §6's own
  "AC → flow / branch / N/A" table (all 23 ACs, no gap).
- ✓ Every method in §3 maps to a §4 user story + ≥1 AC — see §3's table (US column, AC column).
- ✓ Every `sad.md` §6 `alt`-branch has a response in this contract's §6 — no sequence gap found; no
  Save-as-OQ-with-upstream-owner needed this pass.

**Core finding check (2026-09-23 update, `/sdd:review` round 1):** the original core finding — the
`ReturnAddressOption.Ref` ↔ `ReturnAddressRef` mapping (`sad.md` §11 row 1) — is now **resolved**. The
user retrieved Nova Poshta's official docs page directly in their own browser this round and pasted
its full content back; `spec.md` §1's "Official documentation quotes" subsection quotes the actual
`save`/`orderCargoReturn` request example verbatim, confirming the mapping. The same capture also
surfaced and fixed 4 real defects the original SDK-only sourcing missed (`NonCash` boolean vs. string,
`Pricing.FirstDayStorage` string vs. number, a missing `RedirectOrderListItem.DocumentNumber` field,
and a missing `OrderType` requirement on `update`) — see the field-origins rows above. `spec.md` §8
row 1 and `sad.md` §11 row 1 are closed.

**Core finding check (2026-09-23 update, `/sdd:review` round 3):** an exhaustive field-by-field audit
found the round-1 capture only covered 9 of the module's ~30 distinct request/response shapes —
`createRedirect`'s whole request, `checkRedirectPossible`'s whole contract, `updateRedirect`'s field
list (cited circularly), the three list methods, `getReturnReasons(Subtypes)`, `delete`'s schema, all
three `save` results, and 8 of 19 wire method-name literals had no genuine quote behind them, several
rows above nonetheless graded `high` in violation of this report's own rubric. The user re-captured the
same docs page in full; every row above now cites the actual excerpt (spec.md §1's "Round 3"
subsection). This pass also surfaced `OrderListFilters.Page`/`Limit` as `number` when the wire sends
quoted strings (corrected) and a genuine cross-example discrepancy in `Pricing.Total`'s JSON shape
(documented, typed `number | string`, tracked at spec §8 rather than guessed at).

No other core finding remains open besides `CreateRedirectPayload.ServiceType`'s full enum (item 5,
public-api.md §10) and `PaymentMethod`'s `"NonCash"` member (both value-set gaps on already-confirmed
fields) — fewer than 3 flags total, run proceeds without a pause.

**Core finding check (2026-09-23 update, `/sdd:review` round 4):** an independent re-verification of
round 3's fixes (rather than a diff-only re-check) found the round-3 capture, while covering more
ground, still had six rows above citing "Round 3" quotes that didn't actually contain what was claimed
(`checkWaybillEditPossible`'s request, `getReturnReasonsSubtypes`'s request, the three `save` response
shapes, and `getChangeEWOrdersList`'s request graded `high` from an inferred cross-method pattern) —
plus one genuinely fabricated citation: `createWaybillEdit`'s field list was sourced from a placeholder
quote (every value a bare `"..."`) that a round-3 fix pass wrote without the user having pasted it,
never a real docs excerpt. The user fetched three more pages this round — the dedicated calculate-return
and calculate-redirect pages, and the real "Змінити дані" page (found via the exact URL
`platx/go-nova-poshta`'s own source code cites for it, since it isn't linked from the site's own
navigation) — closing every one of these, plus both remaining value-set gaps (`ServiceType`'s full
4-value enum, `PaymentMethod`'s `"NonCash"` member) and correcting `Pricing.Total`'s type (reverted to
`number`; the `number | string` widening was itself based on a quote that didn't exist).

**Core finding check (2026-09-23 update, `/sdd:review` round 5):** an independent re-verification of
round 4's fixes found three more rows still resting on an unbacked or overstated claim rather than an
actual quote: `checkReturnPossible.Number`'s request was cited since round 1 but never actually pasted
until this round; `createReturn→SavedReturnOrder`'s response citation pointed at "spec §1 row 3" (no
quote there) instead of the real quote that already existed elsewhere in the document;
`calculateRedirect`'s `OnlyGetPricing` row and its surrounding spec.md prose wrongly claimed the
redirect-calculate page's own JSON example showed the field, when only its prose does (the field table
and JSON body omit it — a Nova Poshta docs inconsistency); and `getRedirectionOrdersList`'s request row
claimed a quote that was never actually captured, now honestly downgraded to `medium` (inferred from
the shared `OrderListFilters` pattern). All four are fixed above. No row in this table now claims a
grade its own cited source doesn't support — but "every row cites a genuine, directly-quoted excerpt"
is deliberately not asserted as a blanket claim here again, given that exact sentence pattern has
proven wrong at the end of three prior rounds; two rows are honestly `medium` (`getReturnReasonsSubtypes.ReasonRef`,
`getRedirectionOrdersList`'s request), inferred rather than directly quoted, and that is accurate as
recorded, not a residual gap to chase further.

## Reconcile semantics

Not applicable this run (first pass, no prior `openapi.yaml`/`public-api.md` to diff against). No open
item remains in `public-api.md` §10 as of the round-4 fix — a future `/sdd:api additional-service
--reconcile` starts from a clean baseline.
