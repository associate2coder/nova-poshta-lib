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
| `checkReturnPossible→ReturnAddressOption.{Ref,NonCash,City,Counterparty,ContactPerson,Address,Phone}` | spec §1 row 1 | high |
| `checkReturnEditPossible.Ref` | spec §1 row 2 | high |
| `checkReturnEditPossible.Address` (shape) | spec §1 row 2, spec §8 OQ-4 | low |
| `checkReturnEditPossible→ReturnEditOption.Type` | spec §1 row 2 | high |
| `checkReturnEditPossible→ReturnEditInfo.{PayerTypeDefault,Number}` | spec §1 row 2, sad.md §4 decision 2 / ADR-0001 | high |
| `createReturn.{IntDocNumber,PaymentMethod,Reason,SubtypeReason,Note}` | spec §1 row 3 | high |
| `createReturn.ReturnAddressRef` (plain-return variant) | spec §1 row 3 | high (field exists) / low (mapping to `checkReturnPossible.Ref` — see contract header, spec §8 row 1, sad.md §11 row 1) |
| `createReturn.{RecipientSettlement,RecipientSettlementStreet,BuildingNumber,NoteAddressRecipient}` (new-address variant) | spec §1 row 3 | high |
| `createReturn.RecipientWarehouse` (new-warehouse variant) | spec §1 row 3 | high |
| `createReturn.Destination` (TS-only discriminant) | sad.md §4 decision 4, AC-04 | high (design-mandated, no wire origin by design) |
| `createReturn→SavedReturnOrder.{Number,Ref}` | spec §1 row 3 | high |
| `calculateReturn` payload | same as `createReturn` (spec §1 row 4) | high |
| `calculateReturn→OrderPricingEstimate.{Pricing.Services,Pricing.Total,Pricing.FirstDayStorage,ScheduledDeliveryDate}` | spec §1 row 4 | high |
| `updateReturn.Ref` | spec §1 naming note, spec §8 OQ-5 | low |
| `updateReturn.{RecipientSettlement,RecipientWarehouse,IntDocNumber,RecipientSettlementStreet,PaymentMethod,BuildingNumber,NoteAddressRecipient,Reason,SubtypeReason}` | spec §1 row 5 | medium |
| `updateReturn` response shape | spec §1 row 5 ("updated order fields, or Pricing+ScheduledDeliveryDate when recalculating") | low — typed as `Record<string, unknown>` |
| `getReturnOrdersList.{Number,Ref,BeginDate,EndDate,Page,Limit}` | spec §1 row 6 | high |
| `getReturnOrdersList→ReturnOrderListItem.*` | spec §1 row 6 | high |
| `getReturnReasons→ReturnReason.{Ref,Description}` | spec §1 row 7 | high |
| `getReturnReasonsSubtypes.ReasonRef` | spec §1 row 8 | high |
| `getReturnReasonsSubtypes→ReturnReasonSubtype.{Ref,Description,ReasonRef}` | spec §1 row 8 | high |
| `checkRedirectPossible.Number` | spec §1 row 9 | high |
| `checkRedirectPossible→RedirectPossibility.*` (20 fields) | spec §1 row 9 | high |
| `checkRedirectEditPossible.OrderRef` | spec §1 row 10 | high |
| `checkRedirectEditPossible` remaining address/recipient fields | spec §1 row 10, spec §8 OQ-4 | low — typed as `[key: string]: unknown` |
| `checkRedirectEditPossible` response | spec §1 row 10 ("updated subset of the same field set") | medium — typed as `Partial<RedirectPossibility>` |
| `createRedirect.{IntDocNumber,PaymentMethod,Note,Recipient,RecipientContactName,RecipientPhone,PayerType,Customer,RecipientSettlement,RecipientSettlementStreet,BuildingNumber,NoteAddressRecipient,RecipientWarehouse}` | spec §1 row 11 | high |
| `createRedirect.ServiceType` (field presence) | spec §1 row 11 | high (field) / low (enum values — not independently re-sourced this session) |
| `createRedirect→SavedRedirectOrder.{Number,Ref}` | spec §1 row 11 | high |
| `calculateRedirect` payload | same as `createRedirect` (spec §1 row 12) | high |
| `updateRedirect.Ref` + subset fields | spec §1 row 13, spec §8 OQ-5 (naming) | medium |
| `updateRedirect` response shape | spec §1 row 13 ("updated order fields") | low — typed as `Record<string, unknown>` |
| `getRedirectionOrdersList.{Number,Ref,BeginDate,EndDate,Page,Limit}` | spec §1 row 14 | high |
| `getRedirectionOrdersList→RedirectOrderListItem.*` | spec §1 row 14 | high |
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

**Core finding check:** one core finding surfaced — the `ReturnAddressOption.Ref` ↔
`ReturnAddressRef` mapping (`sad.md` §11 row 1, explicitly named as blocking-for-`api` in `sad.md` §1
¶4). Resolved this session via the shared 4-state actions: **Accept the design as-is, track as an open
risk** — re-confirmed with the user after this session's own re-sourcing attempt (official docs still
Cloudflare-blocked; one weak corroborating SDK signal; no source directly refutes it) found nothing new
enough to change `sad.md`'s original fail-safe design. `spec.md` §8 row 1 and `sad.md` §11 row 1 remain
open, owner Tech Lead, due before integration tests run against a live key — not re-opened as a fresh
finding here.

No other core finding and fewer than 3 flags total — run proceeds without a pause.

## Reconcile semantics

Not applicable this run (first pass, no prior `openapi.yaml`/`public-api.md` to diff against). A future
`/sdd:api additional-service --reconcile` should re-check the 6 items §10 of `public-api.md` lists as
open, tightening any field whose upstream artifact (`spec.md`, `sad.md`) is updated with a confirmed
answer — most importantly item 1 (the `ReturnAddressRef` mapping) once a live-key integration test or
official-docs access confirms or refutes it.
