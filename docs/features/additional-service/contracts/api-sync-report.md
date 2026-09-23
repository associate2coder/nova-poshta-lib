# API sync report — additional-service

Run: 2026-09-23. Gate: `data-model.md` absent — legal fast-lane skip confirmed (`sad.md` §6: "every
flow's writes are `save`/`update`/`delete` calls to Nova Poshta's own API — this module persists
nothing of its own... `data-model`'s hard-refuse condition ('no schema change') applies and that stage
should be skipped for this feature"). Fields below trace to `spec.md` §1's method table (itself sourced
from Nova Poshta's own official documentation, captured 2026-09-23, cross-checked against 5 independent
SDKs) plus `sad.md` §4/§5/§6.

## Field-origins table

`origin` cites the `spec.md` §1 table row (`spec §1 row N`) unless noted otherwise. `confidence`
follows `spec.md`'s own sourcing bar: `high` = official docs + ≥1 corroborating SDK; `medium` = official
docs alone or ≥2 agreeing SDKs without official docs; `low` = single source / genuinely unconfirmed,
tracked as an open question.

| Field (`operation.field`) | Origin | Confidence |
|---|---|---|
| `checkReturnPossible.Number` | spec §1 row 1 | high |
| `checkReturnPossible→ReturnAddressOption.{Ref,City,Counterparty,ContactPerson,Address,Phone}` | spec §1 row 1 | high |
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
| `createReturn→SavedReturnOrder.{Number,Ref}` | spec §1 row 3 | high |
| `calculateReturn` payload | same as `createReturn` (spec §1 row 4) | high |
| `calculateReturn→OrderPricingEstimate.{Pricing.Services,Pricing.Total,ScheduledDeliveryDate}` | spec §1 row 4 | high |
| `calculateReturn→OrderPricingEstimate.Pricing.FirstDayStorage` (type: string, not number) | official docs' own calculate examples always show a datetime string, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) — corrects a defect (was typed `number`) | high |
| `updateReturn.Ref` | official docs' update request example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) | high — spec §8 OQ-5 resolved |
| `updateReturn.OrderType` (internal, "orderCargoReturn") | official docs' update request example — field this spec's original table omitted; now set internally by the module | high |
| `updateReturn.{RecipientSettlement,RecipientWarehouse,IntDocNumber,RecipientSettlementStreet,PaymentMethod,BuildingNumber,NoteAddressRecipient,Reason,SubtypeReason}` | spec §1 row 5, cross-checked against official docs' own example (2026-09-23) | high |
| `updateReturn` response shape | spec §1 row 5 ("updated order fields, or Pricing+ScheduledDeliveryDate when recalculating") — official docs' own example confirms the shape is genuinely large/variable | medium — typed as `Record<string, unknown>` by design, not from low confidence |
| `getReturnOrdersList.{Number,Ref,BeginDate,EndDate,Page,Limit}` | spec §1 row 6 | high |
| `getReturnOrdersList→ReturnOrderListItem.*` | spec §1 row 6 | high |
| `getReturnReasons→ReturnReason.{Ref,Description}` | spec §1 row 7 | high |
| `getReturnReasonsSubtypes.ReasonRef` | spec §1 row 8 | high |
| `getReturnReasonsSubtypes→ReturnReasonSubtype.{Ref,Description,ReasonRef}` | spec §1 row 8 | high |
| `checkRedirectPossible.Number` | spec §1 row 9 | high |
| `checkRedirectPossible→RedirectPossibility.*` (20 fields) | spec §1 row 9 | high |
| `checkRedirectEditPossible.OrderRef` | spec §1 row 10 | high |
| `checkRedirectEditPossible` remaining address/recipient fields | official docs' edit-check request example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) — 14 named optional fields | high — spec §8 OQ-4 resolved |
| `checkRedirectEditPossible` response | spec §1 row 10 ("updated subset of the same field set") | medium — typed as `Partial<RedirectPossibility>` |
| `createRedirect.{IntDocNumber,PaymentMethod,Note,Recipient,RecipientContactName,RecipientPhone,PayerType,Customer,RecipientSettlement,RecipientSettlementStreet,BuildingNumber,NoteAddressRecipient,RecipientWarehouse}` | spec §1 row 11 | high |
| `createRedirect.ServiceType` (field presence) | spec §1 row 11 | high (field) / low (enum values — not independently re-sourced this session) |
| `createRedirect→SavedRedirectOrder.{Number,Ref}` | spec §1 row 11 | high |
| `calculateRedirect` payload | same as `createRedirect` (spec §1 row 12) | high |
| `updateRedirect.Ref` + subset fields | official docs' update request example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) | high — spec §8 OQ-5 resolved |
| `updateRedirect.OrderType` (internal, "orderRedirecting") | official docs' update request example — field this spec's original table omitted; now set internally by the module | high |
| `updateRedirect` response shape | spec §1 row 13 ("updated order fields") — official docs' own example confirms a large, variable field set | medium — typed as `Record<string, unknown>` by design, not from low confidence |
| `getRedirectionOrdersList.{Number,Ref,BeginDate,EndDate,Page,Limit}` | spec §1 row 14 | high |
| `getRedirectionOrdersList→RedirectOrderListItem.*` | spec §1 row 14 | high |
| `getRedirectionOrdersList→RedirectOrderListItem.DocumentNumber` | official docs' own response example, quoted verbatim spec §1 "Official documentation quotes" (2026-09-23) — corrects a defect (field was missing from the type entirely) | high |
| `checkWaybillEditPossible.IntDocNumber` | spec §1 row 15 | high |
| `checkWaybillEditPossible→WaybillEditPossibility.*` (11 flags + 8 fields) | spec §1 row 15 | high |
| `createWaybillEdit.{IntDocNumber,PaymentMethod,SenderContactName,SenderPhone,Recipient,RecipientContactName,RecipientPhone,PayerType}` | spec §1 row 16 | high (2-SDK-confirmed subset, spec §3 non-goal) |
| `createWaybillEdit→SavedWaybillEditOrder.{Number,Ref}` | spec §1 row 16 | high |
| `getChangeEWOrdersList.{Number,Ref,BeginDate,EndDate,Page,Limit}` | spec §1 row 17 | high |
| `getChangeEWOrdersList→ChangeEWOrderListItem.*` | spec §1 row 17 | high |
| `deleteAdditionalServiceOrder.Ref` | spec §1 row 18 | high |
| `deleteAdditionalServiceOrder→DeletedAdditionalServiceOrder.Number` | spec §1 row 18 | high |
| `createReturnIfPossible.{IntDocNumber,PaymentMethod,Reason,SubtypeReason,Note}` | spec §1 row 19, composed from row 3 | high |
| `createReturnIfPossible` response | spec §1 row 19 ("same as createReturn") | high |

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

No other core finding remains open besides `CreateRedirectPayload.ServiceType`'s full enum (item 5,
public-api.md §10) — fewer than 3 flags total, run proceeds without a pause.

## Reconcile semantics

Not applicable this run (first pass, no prior `openapi.yaml`/`public-api.md` to diff against). A future
`/sdd:api additional-service --reconcile` should re-check the one remaining open item in §10 of
`public-api.md` (item 5, `CreateRedirectPayload.ServiceType`'s full enum) once a live-key integration
test or a second agreeing SDK confirms it.
