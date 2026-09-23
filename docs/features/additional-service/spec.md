---
status: Reviewed
owner: "associate2coder"
reviewers: ["Tech Lead"]
updated_at: "2026-09-23"
feature_size: "M"
---

# Spec — additional-service

> **Glossary:** [CONTEXT](../../../CONTEXT.md) (includes new "return", "redirect", and "waybill edit" entries added while drafting this spec — see §1)
> **Reference module / docs / channels used:** `docs/architecture-map.md`, `docs/roadmap.md`; `src/modules/internet-document` + its spec (waybill `Ref`/`IntDocNumber` this module acts on, and the discriminated-payload / separate-calculator-method precedents reused below), `src/modules/scan-sheet` + its spec (closest M-adjacent raw-plus-convenience structural precedent, and the "no branded Ref type" convention); Nova Poshta's own official API documentation for the `AdditionalServiceGeneral` model — reached this session via the user's own browser (automated `WebFetch`/`curl` attempts to `developers.novaposhta.ua`/`devcenter.novaposhta.ua` still hit a Cloudflare bot-challenge / TLS failure, the same blocker every prior spec in this repo recorded, but the docs themselves are not actually unreachable) — used as this spec's primary, authoritative source, with five independent community SDKs (`platx/go-nova-poshta`, `maddsua/NovaPoshtaREST`, `daaner/NovaPoshta`, `sirkostya009/go-novapost`, `RevoTale/php-nova-poshta`) cross-checked beforehand and folded in below; a competitive-research pass (other courier APIs' equivalent capabilities) and a failure-mode pass (concrete production risks in this module's design) both ran as part of drafting — see §1 ¶3 and §3/§6.1; no ticket/Confluence/knowledge-base channel available.

## 1. Context

Consuming developers who create shipments through `internet-document` have no typed way to handle what happens *after* creation: a customer wants a parcel sent back, a shipment needs redirecting to a different recipient or address mid-transit, or a waybill's contact/payment details need correcting once Nova Poshta has already accepted it. Today they'd hand-roll Nova Poshta's `AdditionalServiceGeneral` API model themselves — the same gap `common`, `address`, `counterparty`, `internet-document`, `tracking-document`, and `scan-sheet` already closed for their own slices of the API.

This is the roadmap's final domain module (step 7 of 7), unblocked now that its three dependencies have shipped: `internet-document` for the waybill `Ref`/`IntDocNumber` this module's every action operates on, `address` for the settlement/street `Ref`s a return-to-a-new-address needs, and `counterparty` for the recipient `Ref` a redirect needs. Closing it completes the full 7-domain target list `docs/architecture-map.md` commits to.

The committed approach is one typed method per confirmed `AdditionalServiceGeneral` capability — 18 raw methods spanning return, redirect, and waybill-edit's check/create/calculate/update/list lifecycle plus one shared delete — discovered from Nova Poshta's own official documentation this session, plus one convenience method (`createReturnIfPossible`) chaining the eligibility check and creation for the most common return case into a single call. A competitive-research pass found no other courier API (UPS, Shippo, EasyPost, USPS) offers a precedent for that kind of combined check-then-create call — each keeps the two as separate calls the developer chains themselves — so this module's contract for what happens when the check passes but the create then fails is this module's own design call, documented explicitly below and in §3/§6.1, not one borrowed from the market. The convenience method itself follows `address`/`counterparty`/`tracking-document`/`scan-sheet`'s majority raw-plus-convenience precedent over `internet-document`'s lone no-convenience exception — cross-module consistency was judged to matter more here than the specific chained-call risk that exception was written to avoid.

Traceability: module boundaries follow the same convention every prior module set (one folder per Nova Poshta model, dual ESM+CJS build, factory over the shared core client); the error contract reuses `NovaPoshtaApiError` unchanged; no branded `Ref` type is introduced (matches `scan-sheet`'s explicit decision that this codebase inlines `Ref: string` everywhere rather than sharing a type alias).

**Decision override — official docs confirmed, superseding SDK cross-check:** Nova Poshta's own documentation for the `AdditionalServiceGeneral` model was captured in full this session and used as the primary source for this spec's entire method surface. Per `CLAUDE.md`'s API-contract sourcing policy, this supersedes the community-SDK cross-check performed earlier in the same session, which independently corroborated nearly every field shape the official docs also show, and additionally helped resolve one genuine cross-source disagreement (see the `getChangeEWOrdersList` override below). Official docs use `AdditionalServiceGeneral` as the primary `modelName` enum value (`AdditionalService` also accepted as an alternate); this module uses `AdditionalServiceGeneral` as its canonical wire `modelName`.
>
> **2026-09-23 update (review round 1 fix):** the original drafting of this paragraph asserted official-docs sourcing narratively but did not quote the actual upstream request/response schema, which `/sdd:review` flagged as insufficient under `CLAUDE.md`'s policy ("quote or list the exact upstream struct/schema..., not just cite an SDK by name"). The user retrieved the docs page directly in their own browser this round and pasted its full content back; the verbatim quotes are now in the new "Official documentation quotes" subsection below the method table, and they resolved every `low`-confidence field/mapping this spec previously carried except `CreateRedirectPayload.ServiceType`'s full enum (§8, unchanged).
>
> **2026-09-23 update (review round 3 fix):** round 3's exhaustive field-by-field audit found the round-1 capture above, while genuine, only covered 9 of the module's ~30 distinct request/response shapes — most of `createRedirect`, `checkRedirectPossible`, `updateRedirect`, the three list methods, `getReturnReasons(Subtypes)`, `delete`, all three `save` results, and 8 of 19 wire method-name literals still had no genuine quote behind them, several graded `high` confidence in `api-sync-report.md` in violation of that report's own rubric. The user re-captured the same docs page in full this round; the "Round 3 review — second official documentation capture" subsection below resolves every one of those gaps. Only `ServiceType`'s full enum and `PaymentMethod`'s `"NonCash"` member remain open (§8) — both value-set gaps on already-confirmed fields, not sourcing violations.

**Decision override — one wire `save` call, three `OrderType` values, five-plus typed create functions:** `createReturn`/`createRedirect`/`createWaybillEdit` all route through `calledMethod: "save"`, differentiated only by `OrderType: "orderCargoReturn" | "orderRedirecting" | "orderChangeEW"`; the three return variants (plain, new-address, new-warehouse) further share `orderCargoReturn`, differing only in which optional address fields are populated. This module exposes each as its own narrowly-typed function — `createReturn` takes a discriminated-union input covering all three return variants, `createRedirect` and `createWaybillEdit` are separate functions — with `OrderType` set internally, never caller-supplied. Mirrors `internet-document`'s `ServiceType`/`CargoType`-discriminant precedent (AC-02), and closes a failure-mode finding where a flat, optional-everything return payload could silently populate more than one destination variant at once, with Nova Poshta resolving one and no error surfacing either way.

**Decision override — `OnlyGetPricing` never exposed as a caller-settable field:** both return and redirect support a cost preview by adding `OnlyGetPricing: "1"` to the exact same `save` payload that would otherwise create the order. This module models the calculator as its own separate typed function (`calculateReturn`/`calculateRedirect`) that sets the flag internally, rather than exposing it on `createReturn`/`createRedirect` — mirrors `internet-document`'s separate `getDocumentPrice`/`getDocumentDeliveryDate` precedent, and closes a failure-mode finding where a boolean/optional flag on a shared payload risks silently creating real orders during a pricing-comparison loop, or silently creating nothing when a pricing example is copied into a real create call.

**Decision override — the two dual-purpose "check possibility" wire methods split into four typed functions:** `CheckPossibilityCreateReturn` serves both "can I create a new return for this waybill Number" and "can I edit this existing return `Ref` this way," under the identical `calledMethod`, distinguished only by which properties are sent (`Number` vs. `Ref`+`Address`) and returning different response shapes (a plain address list vs. a `Type`-discriminated list plus an `info` block); `checkPossibilityForRedirecting` does the same split for redirect (`Number` vs. `OrderRef`+address/recipient fields). This module exposes each half as its own function (`checkReturnPossible`/`checkReturnEditPossible`, `checkRedirectPossible`/`checkRedirectEditPossible`) rather than one function with an ambiguous `{Number?, OrderRef?}` parameter — closes a failure-mode finding where a caller passing the wrong identifier into a conflated function gets a well-formed `success: true` response in the *other* shape, every field the caller's type expects reading `undefined`, with nothing in the envelope signaling the mistake.

**Decision override — `getChangeEWOrdersList`'s distinct response shape, cross-source disagreement resolved by official docs:** the pre-official-docs SDK research found `platx/go-nova-poshta` reusing its generic return-order-list struct for all three `Get*OrdersList` methods, while `maddsua/NovaPoshtaREST` and (once found) `sirkostya009/go-novapost` independently typed `getChangeEWOrdersList`'s response with a materially different, ChangeEW-specific field set, including the distinctively named `AfterChangeChangeSenderCounterparty` field. Official docs confirm the `maddsua`/`sirkostya009` shape verbatim — `platx`'s generic reuse was the one genuine SDK error this session's sourcing pass caught before it could ship. `getReturnOrdersList` and `getRedirectionOrdersList` are typed with their own distinct, officially-confirmed shapes too, rather than one shared "list item" type.

**Decision override — storage-term extension excluded from scope:** one single, self-admittedly reverse-engineered community SDK (`daaner/NovaPoshta`) exposes an undocumented 4th `OrderType` value (`orderTermExtension`, extending how long a parcel waits at a warehouse before auto-return); every other cross-checked SDK's `OrderType` enum lists exactly the 3 values official docs also show throughout every worked example, and official docs never mention a 4th. Below this project's 2-source-or-official-docs sourcing bar — excluded from this spec's confirmed surface entirely (§8 tracks it, since it may simply not exist as a real capability at all).

**Decision override — `update` exists for return and redirect orders, but not for waybill-edit (ChangeEW) orders:** official docs show a full "edit request" section, at equal depth, for both return and redirect orders (gated to only work while `OrderStatus = "Прийняте"`/"Accepted"), but the equivalent waybill-edit section documents only `getChangeEWOrdersList`, `save`, and `CheckPossibilityChangeEW` — no `update`. Given the official docs document the other two order types' edit capability at equal depth, this reads as a genuine product asymmetry rather than a documentation gap, and is treated as confirmed (§8 still tracks re-verifying it against a live call). A waybill-edit order has no typed `updateWaybillEdit` method in this spec's surface; amending one means deleting it and submitting a new `createWaybillEdit`, which carries its own TOCTOU risk (§3, §6.1) distinct from the return/redirect `update` path.

**Decision override — `delete`'s "Accepted"-only gate is confirmed specifically for waybill-edit orders, not asserted generically:** official docs' `delete` section lists what it can remove in one sentence per order type — a return request, a redirect request, and, quoted directly, "заявку на зміну даних (можна видалити заявку лише зі статусом «Прийнято»)" ("a change-data [waybill-edit] request — can only delete a request with status 'Accepted'"). The status-gate parenthetical is attached specifically to the waybill-edit clause; the return and redirect clauses carry no equivalent caveat in the same sentence. AC-19 states this gate as confirmed *for waybill-edit orders specifically* (matching the quoted source), not as a general `delete` rule across all three order types.

**Decision override — 19 methods still fits size M, not L:** this module's confirmed surface (18 raw + 1 convenience) is broader than `internet-document`'s 8 or `scan-sheet`'s 6, but the size-matrix criteria distinguishing L from M are cross-module change, several teams, and possible breaking changes for consumers — none apply here: every method lives in one new, self-contained `src/modules/additional-service` folder (like every prior module), touches no shared infrastructure, and breaks no existing consumer. The 19 methods also decompose into a handful of structurally repeated shapes (4 near-identical "check possibility" reads, 3 "list" reads, 2 near-identical return-reason lookups, 2 "calculate" wrappers reusing their sibling "create" function's shape, 1 shared `delete`) rather than 19 independently novel designs — the same "broader surface, still M" reasoning `docs/roadmap.md`'s existing Sizing note already applied to this step and to `internet-document` before the exact method count was known. `.size`/`.route` remain `M`/`standard`, updated in `docs/roadmap.md`'s Sizing note (not re-classified from scratch) to reflect the now-confirmed 19-method count.

**Decision override — convenience method scoped to the plain-return case only:** `createReturnIfPossible` (US-13) chains `checkReturnPossible` and `createReturn`'s plain-return variant (using the first returned address option) into one call; it does not attempt to guess between the three return variants, and the same chaining is not extended to redirect or waybill-edit — keeping it one unambiguous default path, matching `scan-sheet`'s `addToTodaysScanSheet` and `address`/`counterparty`'s single-convenience precedent rather than a family of three chained methods.

### In-scope AdditionalServiceGeneral API methods (confirmed against official docs, 2026-09-23)

| # | Typed method | Wire `calledMethod` (+ `OrderType`) | Key request fields | Key response fields |
|---|---|---|---|---|
| 1 | `checkReturnPossible` | `CheckPossibilityCreateReturn` | `Number` | `NonCash, City, Counterparty, ContactPerson, Address, Phone, Ref` |
| 2 | `checkReturnEditPossible` | `CheckPossibilityCreateReturn` | `Ref, Address` | array of `{..., Type: string}` (example values `"CustomReturnAddress"`/`"OrderReturn"` — not confirmed as the complete set, round-4 review finding) + `info: {PayerTypeDefault, Number}` |
| 3 | `createReturn` | `save` / `orderCargoReturn` | `IntDocNumber, PaymentMethod, Reason, SubtypeReason, Note` + one of `ReturnAddressRef` \| `RecipientSettlement+RecipientSettlementStreet+BuildingNumber+NoteAddressRecipient` \| `RecipientWarehouse` | `Number, Ref` |
| 4 | `calculateReturn` | `save` / `orderCargoReturn` + `OnlyGetPricing:"1"` (internal) | same as `createReturn` | `Pricing: {Services[], Total, FirstDayStorage}, ScheduledDeliveryDate` |
| 5 | `updateReturn` | `update` + `OrderType: "orderCargoReturn"` (internal) | `Ref` + subset of `RecipientSettlement, RecipientWarehouse, IntDocNumber, RecipientSettlementStreet, PaymentMethod, BuildingNumber, NoteAddressRecipient, Reason, SubtypeReason` | updated order fields, or `Pricing`+`ScheduledDeliveryDate` when recalculating |
| 6 | `getReturnOrdersList` | `getReturnOrdersList` | `Number?, Ref?, BeginDate?, EndDate?, Page?, Limit?` | `OrderRef, OrderNumber, OrderStatus, DocumentNumber, CounterpartyRecipient, ContactPersonRecipient, AddressRecipient, DeliveryCost, EstimatedDeliveryDate, ExpressWaybillNumber, ExpressWaybillStatus` |
| 7 | `getReturnReasons` | `getReturnReasons` | *(none)* | `Ref, Description` |
| 8 | `getReturnReasonsSubtypes` | `getReturnReasonsSubtypes` | `ReasonRef?` | `Ref, Description, ReasonRef` |
| 9 | `checkRedirectPossible` | `checkPossibilityForRedirecting` | `Number` | `Ref, Number, PayerType, PaymentMethod, WarehouseRef, WarehouseDescription, AddressDescription, StreetDescription, BuildingNumber, CityRecipient, CityRecipientDescription, SettlementRecipient, SettlementRecipientDescription, SettlementType, CounterpartyRecipientRef, CounterpartyRecipientDescription, RecipientName, PhoneSender, PhoneRecipient, DocumentWeight` |
| 10 | `checkRedirectEditPossible` | `checkPossibilityForRedirecting` | `OrderRef` + address/recipient fields | updated subset of the same field set |
| 11 | `createRedirect` | `save` / `orderRedirecting` | `IntDocNumber, PaymentMethod, Note, Recipient, RecipientContactName, RecipientPhone, PayerType, Customer, ServiceType, RecipientSettlement, RecipientSettlementStreet, BuildingNumber, NoteAddressRecipient, RecipientWarehouse` | `Number, Ref` |
| 12 | `calculateRedirect` | `save` / `orderRedirecting` + `OnlyGetPricing:"1"` (internal) | same as `createRedirect` | `Pricing: {Services[], Total, FirstDayStorage}, ScheduledDeliveryDate` |
| 13 | `updateRedirect` | `update` + `OrderType: "orderRedirecting"` (internal) | `Ref` + subset of `PaymentMethod, NoteAddressRecipient, Recipient, CityRecipient, Note, Customer, RecipientContactName, IntDocNumber, RecipientWarehouse, RecipientPhone, SettlementRecipient, BuildingNumber, RecipientSettlementStreet, ServiceType, PayerType` | updated order fields |
| 14 | `getRedirectionOrdersList` | `getRedirectionOrdersList` | `Number?, Ref?, BeginDate?, EndDate?, Page?, Limit?` | `OrderRef, OrderNumber, DateTime, DocumentNumber, Note, CityRecipient, RecipientAddress, CounterpartyRecipient, RecipientName, PhoneRecipient, PayerType, DeliveryCost, EstimatedDeliveryDate, ExpressWaybillNumber, ExpressWaybillStatus` |
| 15 | `checkWaybillEditPossible` | `CheckPossibilityChangeEW` | `IntDocNumber` | 11 `Can...` boolean flags (`CanChangeSender`, `CanChangeRecipient`, `CanChangePayerTypeOrPaymentMethod`, `CanChangeBackwardDeliveryDocuments`, `CanChangeBackwardDeliveryMoney`, `CanChangeCash2Card`, `CanChangeBackwardDeliveryOther`, `CanChangeAfterpaymentType`, `CanChangeLiftingOnFloor`, `CanChangeLiftingOnFloorWithElevator`, `CanChangeFillingWarranty`) + `SenderCounterparty, ContactPersonSender, SenderPhone, RecipientCounterparty, ContactPersonRecipient, RecipientPhone, PayerType, PaymentMethod` |
| 16 | `createWaybillEdit` | `save` / `orderChangeEW` | `IntDocNumber, PaymentMethod, SenderContactName, SenderPhone, Recipient, RecipientContactName, RecipientPhone, PayerType` | `Number, Ref` |
| 17 | `getChangeEWOrdersList` | `getChangeEWOrdersList` | `Number?, Ref?, BeginDate?, EndDate?, Page?, Limit?` | `OrderRef, OrderNumber, OrderStatus, DocumentNumber, DateTime, BeforeChangeSenderCounterparty, AfterChangeChangeSenderCounterparty, Cost, BeforeChangeSenderPhone, AfterChangeSenderPhone` |
| 18 | `deleteAdditionalServiceOrder` | `delete` | `Ref` | `Number` |
| 19 | `createReturnIfPossible` (convenience) | *(internally: `CheckPossibilityCreateReturn` then `save`/`orderCargoReturn`)* | `IntDocNumber` + the plain-return fields `createReturn` needs | same as `createReturn`, or the standard error if the check declines |

> **Note on `checkWaybillEditPossible`'s flags vs `createWaybillEdit`'s fields:** 8 of the 11 `Can...` flags (everything but `CanChangeSender`, `CanChangeRecipient`, `CanChangePayerTypeOrPaymentMethod`) have no corresponding field on `createWaybillEdit`'s wire request — confirmed directly by official docs' own "Змінити дані" page (round-4 capture, §1), which lists only sender/recipient/payer-type/payment-method fields. (A round-3 note credited this to "two independent, agreeing SDKs"; that was wrong — `sirkostya009/go-novapost` has no create method for ChangeEW at all, and `platx/go-nova-poshta`'s own equivalent struct is undermined by a bug in its own test fixture. Neither was ever a reliable source; only the docs page is, and it's now genuinely quoted.) See §3 non-goals.
>
> **Note on `Ref` vs `OrderRef`:** `Ref` (returned by `save`, consumed by `update` and `deleteAdditionalServiceOrder`) and `OrderRef` (returned by the three `get*OrdersList` methods, and by `checkRedirectEditPossible`'s own request field) name the same additional-service order — different wire field names for the same identifier depending on which method you're calling, the same pattern this library already lives with for a waybill's `Ref`/`IntDocNumber`. `update`'s own request field is `Ref`, confirmed verbatim by official docs' own `update` examples for both return and redirect orders (2026-09-23 capture, §1's "Official documentation quotes" subsection) — no longer an open question.
>
> **Note on `BeginDate`/`EndDate`:** typed as plain `string`, passed through unchanged — no client-side date parsing or comparison, matching this library's existing convention (every date-bearing field across every module is `string`) and deliberately avoiding a repeat of `scan-sheet`'s cross-format `DateTime`-ordering defect.

### Official documentation quotes (captured 2026-09-23, verbatim) — resolves the review's sourcing findings

`/sdd:review`'s 2026-09-23 pass found that §1 above asserted official-docs sourcing without quoting the
actual upstream schema (CLAUDE.md's sourcing policy requires the quote itself, not a citation by SDK
name). The user retrieved `https://developers.novaposhta.ua/view/model/59389-additionalservicegeneral`
(UA docs) directly in their own browser this session and pasted its full content back. The excerpts
below are quoted verbatim from that page; each resolves one of `api-sync-report.md`'s `low`-confidence
rows or `spec.md` §8's open questions.

**`CheckPossibilityCreateReturn` (plain check) — request + response example** (round-4 review finding:
this row had been cited as "quoted" since round 1, but only the response was ever actually pasted —
the request block below was received from the user in round 4 and had gone unrecorded until now):
```json
// request
{ "modelName": "AdditionalServiceGeneral", "calledMethod": "CheckPossibilityCreateReturn",
  "methodProperties": { "Number": "20450520287825" } }
// response
{ "success": true, "data": [
  { "NonCash": true, "City": "Київ", "Counterparty": "ТОВ Яблуневий сад",
    "ContactPerson": "Іванов Іван Іванович", "Address": "м. Київ,  вул. Хрещатик, буд. 1",
    "Phone": "380950000000", "Ref": "00000000-0000-0000-0000-000000000000" } ] }
```
`checkReturnPossible.Number` (the field `createReturnIfPossible` depends on directly,
`src/modules/additional-service/index.ts:247`) now genuinely quoted, closing the last row
(`checkReturnPossible.Number`, `api-sync-report.md`) that still cited only `spec §1 row 1` with no
actual quote behind it. `NonCash` is a JSON **boolean**, not a `"0"`/`"1"` wire string as this module
originally assumed — `ReturnAddressOption.NonCash` corrected to `boolean` (was `string`).

**`CheckPossibilityCreateReturn` (edit-check variant) — request + response example, resolving
§8 OQ-4's `Address` shape and the `info` field's actual wire shape:**
```json
// request
{ "modelName": "AdditionalServiceGeneral", "calledMethod": "CheckPossibilityCreateReturn",
  "methodProperties": { "Ref": "00000000-0000-0000-0000-000000000000",
    "Address": "м. Київ, площа Харківська, 10" } }
// response
{ "success": true, "data": [
    { "NonCash": false, "City": "Київ", "Counterparty": "ТОВ Компанія",
      "Address": "м. Київ, площа Харківська, 10", "Phone": "380670000000",
      "Ref": "00000000-0000-0000-0000-000000000001", "ContactPerson": "Іванов Іван Іванович",
      "Type": "CustomReturnAddress" },
    { "...": "...", "Type": "OrderReturn" } ],
  "info": [ { "PayerTypeDefault": "Recipient", "Number": "102-77771370" } ] }
```
`Address` is a plain **string** (was typed `unknown`, §8 OQ-4 — resolved). `info` is wrapped in a
**single-element array**, not a bare object as ADR-0001's implementation assumed — `checkReturnEditPossible`
now unwraps `info[0]` defensively (`info` on `CheckReturnEditPossibleResult` is `ReturnEditInfo | undefined`,
covering both "info array present" and "info omitted entirely" — review 2026-09-23 finding 4).

**`save`/`orderCargoReturn` (createReturn/calculateReturn) — request example, resolving §8 OQ-1
(the `ReturnAddressRef` mapping) and this file's own header's "blocking" open risk:**
```json
{ "modelName": "AdditionalServiceGeneral", "calledMethod": "save",
  "methodProperties": { "BuildingNumber": "4", "NoteAddressRecipient": "2",
    "RecipientSettlement": "...", "RecipientWarehouse": "...", "IntDocNumber": "206004560074695",
    "PaymentMethod": "Cash", "Reason": "...", "SubtypeReason": "...", "Note": "Довільний опис",
    "OrderType": "orderCargoReturn", "ReturnAddressRef": "00000000-0000-0000-0000-000000000000",
    "RecipientSettlementStreet": "..." } }
```
`ReturnAddressRef` is confirmed as the real wire field name for the sender-address return variant. The
official docs' own example lists it alongside `RecipientWarehouse`/`RecipientSettlement*` in one
generic "all optional fields" listing (GitBook's usual style for this endpoint), not because all four
are sent together — the three destination variants still use disjoint field subsets per this module's
existing discriminated-union design. No source contradicts `ReturnAddressRef` being the same value
`CheckPossibilityCreateReturn`'s response returns as each option's own `Ref` — same field-naming
convention this library already relies on elsewhere (e.g. `getReturnOrdersList`'s `Ref` vs.
`getRedirectionOrdersList`'s `OrderRef` for the same kind of value). §8 OQ-1 is resolved: **not**
"blocking" any further — the design in §1/AC-20 stands as originally specified, now docs-confirmed
rather than SDK-cross-checked.

**`update` (return) — request example, resolving §8 OQ-5 (the `Ref` field name) and revealing a
previously-missed required field:**
```json
{ "modelName": "AdditionalServiceGeneral", "calledMethod": "update",
  "methodProperties": { "Ref": "00000000-0000-0000-0000-000000000000", "OnlyGetPricing": true,
    "RecipientSettlement": "...", "RecipientWarehouse": "...", "IntDocNumber": "20450123456789",
    "RecipientSettlementStreet": "...", "PaymentMethod": "Cash", "BuildingNumber": "15",
    "OrderType": "orderCargoReturn", "NoteAddressRecipient": "", "Reason": "...", "SubtypeReason": "..." } }
```
`Ref` is confirmed (§8 OQ-5 resolved, no longer `low` confidence). **`OrderType` is present on the
`update` example too** — not documented in this spec's original §1 field list for `updateReturn`/
`updateRedirect` and not sent by the original implementation. `updateReturn`/`updateRedirect` now set
`OrderType` ("orderCargoReturn"/"orderRedirecting" respectively) internally, matching `createReturn`/
`createRedirect`'s existing discriminant-stripping pattern — never a field on the public payload.

**`update` (redirect) — same `OrderType` confirmation** (`"OrderType": "orderRedirecting"` present in
the official docs' own redirect-update example, methodProperties otherwise matching this module's
already-documented `updateRedirect` field list).

**`save` (calculateReturn/calculateRedirect) — response example, resolving the `Pricing.FirstDayStorage`
type:**
```json
{ "success": true, "data": [ { "Pricing": { "Services": [ { "Service": "Переадресування в межах України", "Cost": 0 } ],
  "Total": 0, "FirstDayStorage": "0000-00-00 00:00:00" }, "ScheduledDeliveryDate": "2024-05-18 12:00:00" } ] }
```
`FirstDayStorage` is a datetime **string** in every official-docs example (return and redirect calculate
alike) — `OrderPricingEstimate.Pricing.FirstDayStorage` corrected to `string` (was `number`).
`Pricing.Services` is confirmed as `{ Service: string; Cost: number }[]` (was untyped `unknown[]`).

**`getRedirectionOrdersList` — response example, revealing a field this spec's original table omitted:**
```json
{ "success": true, "data": [ { "OrderRef": "...", "OrderNumber": "102-00010160",
  "DateTime": "дд.мм.рррр чч:хх:сс", "DocumentNumber": "20600000065470", "Note": "...", "...": "..." } ] }
```
`DocumentNumber` is present in the real response and is now added to `RedirectOrderListItem` (this
spec's §1 row 14 table above is corrected to include it).

**`checkPossibilityForRedirecting` (edit-check variant) — request example, resolving §8 OQ-4's
`checkRedirectEditPossible` field list:**
```json
{ "methodProperties": { "OrderRef": "...", "AddressDescription": "...", "RecipientName": "...",
  "PhoneSender": "...", "StreetDescription": "...", "PhoneRecipient": "...", "BuildingNumber": "...",
  "CityRecipient": "...", "DocumentWeight": "...", "SettlementRecipient": "...", "SettlementType": "...",
  "PayerType": "...", "PaymentMethod": "...", "CounterpartyRecipientRef": "...", "WarehouseRef": "..." } }
```
Full field list confirmed — `CheckRedirectEditPossiblePayload` is now typed with these named optional
fields instead of an index signature. The response example carries no `info` key (only the return
edit-check does) — this module's `checkRedirectEditPossible` never returns one, consistent with its
existing `Partial<RedirectPossibility>` return type.

**"Змінити дані" (waybill-edit) section — confirms §8's second open question:** the official docs'
complete section for waybill-edit orders lists exactly `getChangeEWOrdersList`, `save`/`orderChangeEW`,
and `CheckPossibilityChangeEW` — no `update` method anywhere in that section, at the same page depth
the return/redirect `update` sections receive. §8's "does a waybill-edit order genuinely have no
`update` capability" question is resolved: **confirmed, no `update` exists for ChangeEW orders** — the
original design (no `updateWaybillEdit` method) stands, now docs-confirmed rather than inferred from a
documentation-gap argument.

**`delete` — confirms the already-quoted status-gate sentence verbatim** (§1 above already quoted this
correctly): "заявку на зміну даних (можна видалити заявку лише зі статусом «Прийнято»)" — matches this
capture exactly, no correction needed.

**Remaining genuinely open items (unchanged by the round-3 capture below):** `CreateRedirectPayload.ServiceType`'s
full enum (the official docs confirm the field's presence and one real example value,
`"WarehouseWarehouse"`, matching `internet-document`'s own `ServiceType` enum member, but no page in
either capture enumerates the complete set — public-api.md §10 item 5); and `PaymentMethod`'s
`"NonCash"` member (every request example across both captures only ever shows `"Cash"` — carried
over from `internet-document`'s own confirmed 2-value enum for the same field, not yet independently
re-quoted for this model).

### Round 3 review — second official documentation capture (2026-09-23), resolving the remaining sourcing findings

`/sdd:review`'s round-3 pass (exhaustive whole-feature field-by-field audit) found that the round-1
capture above, while genuine, covered only 9 of the module's ~30 distinct request/response shapes —
`createRedirect`'s whole request, `checkRedirectPossible`'s whole contract, `updateRedirect`'s field
list (cited circularly), the three list methods, `getReturnReasons(Subtypes)`, `delete`'s schema, all
three `save` results, and 8 of 19 wire `calledMethod` literals all shipped with no genuine quote. The
user retrieved the same `AdditionalServiceGeneral` docs page again, this time capturing its complete
content (every method section), and pasted it back in full. The excerpts below resolve every field the
round-3 audit flagged.

**`checkPossibilityForRedirecting` (plain check) — request+response, resolving `checkRedirectPossible`'s
whole previously-unsourced contract:**
```json
// request: { "methodProperties": { "Number": "20600000065609" } }
// response
{ "success": true, "data": [
  { "Ref": "...", "Number": "20600000065609", "PayerType": "Sender", "PaymentMethod": "Cash",
    "WarehouseRef": "...", "WarehouseDescription": "...", "AddressDescription": "...",
    "StreetDescription": "...", "BuildingNumber": "24/1", "CityRecipient": "...",
    "CityRecipientDescription": "Київ", "SettlementRecipient": "...", "SettlementRecipientDescription": "Київ",
    "SettlementType": "...", "CounterpartyRecipientRef": "...", "CounterpartyRecipientDescription": "...",
    "RecipientName": "...", "PhoneSender": "...", "PhoneRecipient": "...", "DocumentWeight": "1" } ] }
```
All 20 `RedirectPossibility` fields confirmed verbatim, exactly matching this module's existing type.

**`save`/`orderRedirecting` (createRedirect/calculateRedirect) — request example, resolving the entire
previously-unsourced 14-field request:**
```json
{ "calledMethod": "save", "methodProperties": {
  "IntDocNumber": "...", "PaymentMethod": "Cash", "Note": "...", "OrderType": "orderRedirecting",
  "Recipient": "...", "RecipientContactName": "...", "RecipientPhone": "...", "PayerType": "Recipient",
  "Customer": "Sender", "ServiceType": "WarehouseWarehouse", "RecipientSettlement": "...",
  "RecipientSettlementStreet": "...", "BuildingNumber": "15", "NoteAddressRecipient": "...",
  "RecipientWarehouse": "..." } }
```
All 14 fields confirmed exactly as this module already typed them (`OrderType` excluded — set
internally). Response confirmed `{Number, Ref}`.

**`update` (redirect) — full request+response example, resolving the previously circular citation:**
```json
{ "calledMethod": "update", "methodProperties": {
  "PaymentMethod": "Cash", "NoteAddressRecipient": "...", "Recipient": "...", "CityRecipient": "...",
  "Note": "...", "Customer": "Sender", "Ref": "...", "RecipientContactName": "...",
  "IntDocNumber": "...", "RecipientWarehouse": "...", "RecipientPhone": "...",
  "SettlementRecipient": "...", "BuildingNumber": "15", "RecipientSettlementStreet": "...",
  "ServiceType": "WarehouseWarehouse", "PayerType": "Sender", "OrderType": "orderRedirecting" } }
```
All 15 optional fields (plus `Ref`) confirmed exactly as this module already typed them. This also
confirms the `RecipientSettlement` (create) vs. `SettlementRecipient`+`CityRecipient` (update) naming
asymmetry is a real, docs-confirmed wire difference — not a bug in this module's types.

**`getRedirectionOrdersList` — full response example (the round-1 capture had truncated 10 of 15
fields as `"...": "..."`):**
```json
{ "success": true, "data": [ { "OrderRef": "...", "OrderNumber": "102-00010160",
  "DateTime": "...", "DocumentNumber": "20600000065470", "Note": "...", "CityRecipient": "Київ",
  "RecipientAddress": "...", "CounterpartyRecipient": "...", "RecipientName": "...",
  "PhoneRecipient": "...", "PayerType": "Recipient", "DeliveryCost": "25",
  "EstimatedDeliveryDate": "...", "ExpressWaybillNumber": "...", "ExpressWaybillStatus": "..." } ] }
```
All 15 fields now confirmed exactly as this module already typed them. `DeliveryCost` is a JSON
**string** here (`"25"`), matching `getReturnOrdersList`'s equivalent field.

**`CheckPossibilityChangeEW` — full response example, and `save`/`orderChangeEW` — full request
example, resolving the ChangeEW cluster's remaining gaps (finding 1's residual):**
```json
// CheckPossibilityChangeEW response
{ "data": [ { "CanChangeSender": true, "CanChangeRecipient": true,
  "CanChangePayerTypeOrPaymentMethod": true, "CanChangeBackwardDeliveryDocuments": true,
  "CanChangeBackwardDeliveryMoney": true, "CanChangeCash2Card": true,
  "CanChangeBackwardDeliveryOther": true, "CanChangeAfterpaymentType": true,
  "CanChangeLiftingOnFloor": true, "CanChangeLiftingOnFloorWithElevator": true,
  "CanChangeFillingWarranty": true, "SenderCounterparty": "...", "ContactPersonSender": "...",
  "SenderPhone": "...", "RecipientCounterparty": "...", "ContactPersonRecipient": "...",
  "RecipientPhone": "...", "PayerType": "Recipient", "PaymentMethod": "Cash" } ] }
// save/orderChangeEW request
{ "methodProperties": { "IntDocNumber": "...", "PaymentMethod": "Cash", "OrderType": "orderChangeEW",
  "SenderContactName": "...", "SenderPhone": "...", "Recipient": "...", "RecipientContactName": "...",
  "RecipientPhone": "...", "PayerType": "Recipient" } }
```
All 19 `WaybillEditPossibility` fields and all 8 `CreateWaybillEditPayload` fields confirmed verbatim —
this is now a genuine official-docs quote, resolving the SDK-name-only sourcing this module previously
relied on for the whole ChangeEW group. Response confirmed `{Number, Ref}`.

**`getChangeEWOrdersList` — full response example, resolving spec.md's prior "confirmed verbatim"
claim that had no actual quote behind it:**
```json
{ "success": true, "data": [ { "OrderRef": "...", "OrderNumber": "102-00010160",
  "OrderStatus": "Дані в ЕН змінено", "DocumentNumber": "...", "DateTime": "...",
  "BeforeChangeSenderCounterparty": "...", "AfterChangeChangeSenderCounterparty": "...",
  "Cost": "40", "BeforeChangeSenderPhone": "...", "AfterChangeSenderPhone": "..." } ] }
```
All 10 fields confirmed exactly as this module already typed them.

**`getReturnOrdersList` — request+response example, resolving the whole previously-unsourced method:**
```json
{ "methodProperties": { "Number": "...", "Ref": "...", "BeginDate": "12/10/15 10:33",
  "EndDate": "12/10/15 10:33", "Page": "1", "Limit": "50" } }
// response: { "OrderRef": "...", "OrderNumber": "102-00003168", "OrderStatus": "Прийняте",
//   "DocumentNumber": "...", "CounterpartyRecipient": "...", "ContactPersonRecipient": "...",
//   "AddressRecipient": "...", "DeliveryCost": "20", "EstimatedDeliveryDate": "...",
//   "ExpressWaybillNumber": "...", "ExpressWaybillStatus": "..." }
```
All 11 response fields confirmed. **`Page`/`Limit` are sent as quoted JSON strings** (`"1"`, `"50"`) in
this and `getChangeEWOrdersList`'s own request example alike — `OrderListFilters.Page`/`Limit` corrected
from `number` to `string` (review round-3 finding). `getRedirectionOrdersList`'s own request was never
separately captured (round-5 review finding — a prior version of this sentence wrongly included it);
its request shape is inferred from `OrderListFilters` being shared across all three list methods and
`getRedirectionOrdersList`'s own confirmed response, not from a directly-quoted request of its own —
tracked as `medium` confidence in `api-sync-report.md`, not `high`.

**`getReturnReasons`/`getReturnReasonsSubtypes` — response examples, resolving both previously-unsourced
methods:**
```json
// getReturnReasons: { "data": [ { "Ref": "...", "Description": "Відмова Одержувача" } ] }
// getReturnReasonsSubtypes: { "data": [ { "Ref": "...",
//   "Description": "Відправник відмінив доставку відправлення", "ReasonRef": "..." } ] }
```
Both confirmed exactly as this module already typed them.

**`delete` — request+response example, resolving the previously-unsourced schema (only the status-gate
sentence was quoted before):**
```json
{ "methodProperties": { "Ref": "..." } }
// response: { "data": [ { "Number": "102-00003168" } ] }
```
Confirms `{Number}`-only response — this module's `DeletedAdditionalServiceOrder` was typed correctly,
not the "lie" the round-3 audit worried the missing quote might reveal.

**`OnlyGetPricing` — resolved for `calculateReturn` directly; `calculateRedirect` resolved by the
docs page's own prose, not its JSON example (round-5 review correction — a prior version of this
paragraph wrongly claimed both calculate pages' JSON bodies showed the field; only return-calculate's
does):** the dedicated "Розрахувати повернення" (calculate return) page's own field table lists
`OnlyGetPricing* integer` — "Параметр, що визначає дію: розрахунок (1) або створення замовлення (0)" —
and its JSON example sends the quoted string `"OnlyGetPricing": "1"`. The dedicated "Створити запит на
розрахування переадресації" (calculate redirect) page states the identical mechanism **in its own
prose**, verbatim: "Запит майже ідентичний до створення заявки на переадресування. Відмінність тільки в
тому, що використовується параметр OnlyGetPricing із значенням «1»." ("The request is almost identical
to creating a redirect request. The only difference is that the parameter OnlyGetPricing with value '1'
is used.") — but, unlike the return page, this page's own field table and JSON example omit the field
entirely (a documentation inconsistency on Nova Poshta's own page, not this spec's error). Both are
genuine, directly-quoted sources for the same wire `save` method; `update` separately shows `true` (a
JSON boolean) for the same-named flag on both the return and redirect update examples — a different
wire method, not treated as contradicting `save`'s value. This module's `calculateReturn`/
`calculateRedirect` already sent the correct `"1"` string for `save`; `updateReturn`/`updateRedirect` do
not expose an `OnlyGetPricing` field at all (§1's decision override — never a caller-settable field on
any method, consistent across create/calculate/update), so the confirmed `true`-on-`update` shape does
not change this module's public surface.

**`Pricing.Total` — round-4 correction: this paragraph originally claimed a genuine cross-example
discrepancy (`0` on save-calculate vs. a quoted `"5.52"` on update-recalculation) that justified typing
it `number | string`. No `"5.52"` example ever actually appears anywhere in this document — the claim
existed only as prose, never backed by a quote (round-4 review finding, see the "Round 4" subsection
below for the full correction). Both genuine calculate examples (return and redirect, "Round 4"
subsection) show an unquoted JSON number (`0`). `OrderPricingEstimate.Pricing.Total` is typed `number`
(types.ts).

**AC-04 type-safety gap (not a sourcing item, found independently by review round-3's stage-1 trace):**
`CreateReturnPayload`'s three variants now each declare the other variants' own fields `?: never`, so
an un-annotated variable assembled with fields from more than one variant no longer structurally
satisfies any union member — closing the gap where `tsc --noEmit --strict` previously accepted a
mixed-variant variable at `createReturn`/`calculateReturn`'s own call boundary with zero errors.

### Round 4 review — third official documentation capture (2026-09-23), correcting two fabricated
citations and closing the last genuine gaps

`/sdd:review`'s round-4 pass re-verified round 3's fixes field-by-field rather than trusting the diff,
and found two claims in this spec that cited "official docs, quoted verbatim" with **no actual quote
backing them anywhere in the document**:

1. The `save`/`orderChangeEW` request example above (previously shown with every value as a bare
   `"..."` placeholder) — unlike every genuine capture in this spec, which always carries realistic
   example data (real-looking names, phone numbers, GUIDs). No other quote in this spec used
   placeholders this way.
2. The `Pricing.Total` "genuine cross-example discrepancy" claim (`0` on save-calculate vs. a quoted
   `"5.52"` on update-recalculation) — no `"5.52"` example actually appears anywhere in this document;
   the claim existed only as prose.

Both are corrected below with real quotes fetched this round, plus the field/value-set gaps round 4
also found un-actually-closed (`checkWaybillEditPossible`'s request, the three `save` responses,
`OnlyGetPricing`'s value on `save`, `PaymentMethod`'s `"NonCash"` member, `ServiceType`'s full enum).

**`CheckPossibilityChangeEW` — the missing request example** (round 3 quoted only the response):
```json
{ "modelName": "AdditionalServiceGeneral", "calledMethod": "CheckPossibilityChangeEW",
  "methodProperties": { "IntDocNumber": "20450500000012" } }
```

**`getChangeEWOrdersList` — the missing request example** (round 3 quoted only the response, and
`api-sync-report.md` graded the request fields `high` from an inferred cross-method pattern rather
than this method's own example):
```json
{ "calledMethod": "getChangeEWOrdersList", "methodProperties": { "Number": "102-00006096",
  "Ref": "00000000-0000-0000-0000-000000000000", "BeginDate": "дд.мм.рррр",
  "EndDate": "дд.мм.рррр", "Page": "1", "Limit": "50" } }
```

**`save`/`orderCargoReturn` (return) — full field table + all three destination-variant request
examples + the response, all genuinely quoted for the first time (round 3 only had a partial,
placeholder-heavy request excerpt and an unquoted "Response confirmed" assertion):**
```json
// request (sender-address variant)
{ "calledMethod": "save", "methodProperties": { "IntDocNumber": "206004560074695",
  "PaymentMethod": "Cash", "Reason": "00000000-0000-0000-0000-000000000000",
  "SubtypeReason": "00000000-0000-0000-0000-000000000000", "Note": "Additional information",
  "OrderType": "orderCargoReturn", "ReturnAddressRef": "00000000-0000-0000-0000-000000000000" } }
// response (same for all three variants)
{ "success": true, "data": [ { "Number": "102-00006096",
  "Ref": "00000000-0000-0000-0000-000000000000" } ] }
```
Full field table confirms `BuildingNumber*`/`NoteAddressRecipient`/`RecipientSettlement*`/
`RecipientSettlementStreet*` (new-address variant) and `RecipientWarehouse*` (new-warehouse variant)
exactly as already typed — `SavedReturnOrder.{Number, Ref}` now genuinely quoted, not just asserted.

**`save`/`orderRedirecting` (redirect) — full field table + request + response, genuinely quoted:**
```json
{ "calledMethod": "save", "methodProperties": { "IntDocNumber": "206004560074695",
  "PaymentMethod": "Cash", "Note": "Довільний опис", "OrderType": "orderRedirecting",
  "Recipient": "00000000-0000-0000-0000-000000000000", "RecipientContactName": "Іванов Іван Іванович",
  "RecipientPhone": "380685024447", "PayerType": "Recipient", "Customer": "Sender",
  "ServiceType": "WarehouseWarehouse", "RecipientSettlement": "00000000-0000-0000-0000-000000000000",
  "RecipientSettlementStreet": "00000000-0000-0000-0000-000000000000", "BuildingNumber": "15",
  "NoteAddressRecipient": "Щось від свого імені",
  "RecipientWarehouse": "00000000-0000-0000-0000-000000000000" } }
{ "success": true, "data": [ { "Number": "102-00006096",
  "Ref": "00000000-0000-0000-0000-000000000000" } ] }
```
`SavedRedirectOrder.{Number, Ref}` now genuinely quoted.

**"Розрахувати повернення" (calculate return) — its own dedicated page, distinct from plain create,
confirming `OnlyGetPricing` directly for the first time:**
```json
{ "calledMethod": "save", "methodProperties": { "Note": "Довільний опис",
  "OrderType": "orderCargoReturn", "ReturnAddressRef": "00000000-0000-0000-0000-000000000000",
  "IntDocNumber": "206004560074695", "PaymentMethod": "Cash",
  "Reason": "00000000-0000-0000-0000-000000000000", "OnlyGetPricing": "1",
  "SubtypeReason": "00000000-0000-0000-0000-000000000000" } }
```
Field table: `OnlyGetPricing* integer` — "Параметр, що визначає дію: розрахунок (1) або створення
замовлення (0)" (the field that decides the action: calculate (1) or create the order (0)). The type
column says "integer" but the example itself sends a quoted JSON **string** `"1"` — this module already
sent `"1"`, now directly confirmed correct rather than inferred from the unrelated `update` page.

**"Створити запит на розрахування переадресації" (calculate redirect) — its own dedicated page,
confirming `Pricing.Total`'s real shape and `ServiceType`'s full enum:**
```json
{ "calledMethod": "save", "methodProperties": { "RecipientSettlement": "...", "Recipient": "...",
  "RecipientSettlementStreet": "...", "RecipientWarehouse": "...", "BuildingNumber": "15",
  "NoteAddressRecipient": "Щось від свого імені", "Customer": "Sender",
  "RecipientContactName": "Іванов Іван Іванович", "RecipientPhone": "380685024447",
  "IntDocNumber": "206004560074695", "PaymentMethod": "Cash", "PayerType": "Recipient",
  "Note": "Довільний опис", "OrderType": "orderRedirecting", "ServiceType": "WarehouseWarehouse" } }
// response
{ "success": true, "data": [ { "Pricing": { "Services": [ { "Service": "Переадресування в межах України",
  "Cost": 0 } ], "Total": 0, "FirstDayStorage": "0000-00-00 00:00:00" },
  "ScheduledDeliveryDate": "2024-05-18 12:00:00" } ] }
```
Field table: `ServiceType* string[36]` — "Тип послуги (DoorsWarehouse, WarehouseWarehouse,
WarehouseDoors, DoorsDoors)" — the docs' own explicit 4-value enumeration, not one example value.
`CreateRedirectPayload.ServiceType`/`UpdateRedirectPayload.ServiceType` narrowed to this union (types.ts)
— closes public-api.md §10 item 5. `Pricing.Total` is an unquoted JSON **number** (`0`) here, matching
the return-calculate response — **`OrderPricingEstimate.Pricing.Total` reverted to `number`** (was
`number | string`): the "5.52"-quoted-string claim that justified the wider type never had a real quote
behind it (round-4 finding); the two genuine calculate examples (return and redirect) agree on `number`.

**"Змінити дані" (waybill-edit create) — the real quote, replacing round 3's fabricated placeholder
version.** This page is not linked from `AdditionalServiceGeneral`'s own site navigation — found via
the exact docs URL `platx/go-nova-poshta`'s source code cites for `SaveChangeEW`
(`https://developers.novaposhta.ua/view/model/a7682c1a-8512-11ec-8ced-005056b2dbe1/method/c09f1b02-8a66-11ec-8ced-005056b2dbe1`),
fetched directly and confirmed live:
```json
{ "modelName": "AdditionalServiceGeneral", "calledMethod": "save",
  "methodProperties": { "IntDocNumber": "206004560074695", "PaymentMethod": "Cash",
  "OrderType": "orderChangeEW", "SenderContactName": "Іванов Іван Іванович",
  "SenderPhone": "380685024447", "Recipient": "00000000-0000-0000-0000-000000000000",
  "RecipientContactName": "Іванов Іван Іванович", "RecipientPhone": "380685024447",
  "PayerType": "Recipient" } }
// response
{ "success": true, "data": [ { "Number": "102-00006096",
  "Ref": "00000000-0000-0000-0000-000000000000" } ] }
```
All 8 `CreateWaybillEditPayload` fields match exactly what this module already sent (no `Reason`/
`SubtypeReason` — those only ever belonged to `platx`'s own over-generalized `SaveChangeEWReq` struct,
which embeds the same base type it uses for `SaveReturnReq`; that SDK's own test fixture for this exact
method independently confirms it's unreliable here — it sends `"OrderType": "orderCargoReturn"`
instead of `"orderChangeEW"`, a copy-paste bug). `sirkostya009/go-novapost` — the SDK round 3 credited
as agreeing on this shape — has **no create/save method for ChangeEW at all**; what was cited as its
agreeing struct (`ChangeEWRequest`) is actually that SDK's list-filter struct for
`getChangeEWOrdersList`, unrelated to this request. Neither SDK was ever a reliable source for this
shape — only the docs page itself, now genuinely quoted, resolves it. `SavedWaybillEditOrder.{Number,
Ref}` now genuinely quoted too.

**`PaymentMethod`'s `"NonCash"` member — resolved, not carried over from another module.** The
field-description column reads "Форма розрахунку (Cash/NonCash)" verbatim on the return-save,
redirect-save, and redirect-calculate pages alike — three independent explicit enumerations of the same
2-value domain, all on `AdditionalServiceGeneral`'s own pages. `PaymentMethod` (types.ts) no longer
carries the "open item" framing.

## 2. Goals

- Give consuming developers a typed, discoverable way to manage the three post-creation shipment actions (return, redirect, waybill edit) that Nova Poshta's `AdditionalServiceGeneral` model exposes, closing the same hand-rolled-call gap every prior module already closed for its own slice of the API — and completing the library's full 7-domain target.
- Remove the check-then-create chained-call friction for the most common return case via one convenience method (`createReturnIfPossible`), matching the raw-plus-convenience shape most of this library's other modules already established.
- Surface Nova Poshta's own business rules — status-gated edits, sender/recipient role differences, per-field change permissions — as typed, documented contract rather than an opaque runtime decline a developer has to reverse-engineer.

## 3. Non-goals

- Client-side validation of `checkWaybillEditPossible`'s 11 `Can...` flags before submitting `createWaybillEdit`. Reason: matches this library's existing convention (every write-capable module) that Nova Poshta's own response is the sole judge of what's allowed; the library performs no local gating of its own. A caller who submits a change to a currently-disallowed field gets whatever Nova Poshta itself does with it — decline, partial application, or full acceptance — none of which this library can distinguish or prevent client-side (documented risk, §6.1).
- Automatic reconciliation, retry, or rollback for `createReturnIfPossible`'s two-call gap. Reason: this library holds no state of its own (`CLAUDE.md`, "No persistence"); if the eligibility check passes but the create call then fails or its response is lost, the caller receives whichever call's own error, with no combined transaction to roll back — matches `internet-document`'s identical stance on chained calls (§1 ¶3), scoped here to the one convenience method this spec does ship rather than ruling convenience methods out entirely.
- Enforcing that an `updateReturn`/`updateRedirect` payload carries forward every previously-set field. Reason: `update` is a full-replace call on the wire (confirmed by official docs' own examples); an omitted field is not carried forward, matching `internet-document`'s identical, already-shipped `update` semantics and its documented risk (AC-06) that an incomplete edit payload can clear a previously-set value, including a money-bearing one.
- A typed `orderTermExtension` write method (storage-term extension). Reason: single, self-admittedly reverse-engineered source only, absent from official docs and every other cross-checked SDK (§1 Decision override) — below this project's sourcing bar.
- A shared, branded `Ref` type distinguishing a return/redirect/waybill-edit order's `Ref` from any other module's `Ref`. Reason: matches `scan-sheet`'s explicit decision that this codebase inlines `Ref: string` everywhere rather than introducing type-level branding; the risk that a caller passes the wrong kind of `Ref` into `deleteAdditionalServiceOrder` is accepted and documented (§6.1) rather than solved with new shared infrastructure, which would also push this feature past its declared size.
- Exposing the 8 of `checkWaybillEditPossible`'s 11 `Can...` flags concerning backward-delivery documents/money, cash-to-card, other backward-delivery, afterpayment type, lifting-on-floor (with/without elevator), or filling-warranty as fields on `createWaybillEdit`. Reason: official docs' own "Змінити дані" page (round-4 capture, §1) confirms the wire `save`/`orderChangeEW` request accepts only sender/recipient/payer-type/payment-method fields — Nova Poshta's own create call has no field for the other 8, so this module can't expose them regardless of scope; those flags stay informational-only in this module's surface.

## 4. User stories

### US-01: Check whether a return is possible

**As a** consuming developer
**I want** to check whether Nova Poshta will allow a return for a given waybill before attempting to create one
**So that** I can show the customer accurate return-address options instead of guessing

### US-02: Create a return

**As a** consuming developer
**I want** to create a return request — to the sender's own address, to a different new address, or to a different new warehouse
**So that** I can send an already-created shipment back once a customer or business rule calls for it

### US-03: Estimate a return's cost before creating it

**As a** consuming developer
**I want** to see the delivery cost and estimated date a return would incur, without actually creating it
**So that** I can show the customer that cost up front, or compare it across destination options

### US-04: Edit an existing return request

**As a** consuming developer
**I want** to check whether an already-created return can still be edited, and submit that edit
**So that** I can correct a mistake (a wrong address field, a wrong reason) without cancelling and recreating the whole request

### US-05: Browse return requests and their reasons

**As a** consuming developer
**I want** to list existing return requests, and look up Nova Poshta's own return reasons and their subtypes
**So that** I can show a customer a valid reason to pick from, and track a return's status afterward

### US-06: Check whether a redirect is possible, and create one

**As a** consuming developer
**I want** to check whether Nova Poshta will allow redirecting a given waybill, then create that redirect
**So that** I can send an in-transit shipment to a different recipient, address, or warehouse

### US-07: Estimate a redirect's cost before creating it

**As a** consuming developer
**I want** to see the delivery cost and estimated date a redirect would incur, without actually creating it
**So that** I can show that cost to whoever is paying for the redirect before committing to it

### US-08: Edit an existing redirect request, as either sender or recipient

**As a** consuming developer
**I want** to check whether an already-created redirect can still be edited, and submit that edit — whether the caller represents the shipment's sender or its recipient
**So that** either party can correct a redirect request within whatever limits Nova Poshta allows for their role

### US-09: Browse redirect requests

**As a** consuming developer
**I want** to list existing redirect requests
**So that** I can track a redirect's status and details after creating it

### US-10: Check which fields of an accepted waybill can still be changed, and submit a change

**As a** consuming developer
**I want** to check which specific fields (sender, recipient, payer type, payment method, and related backward-delivery details) Nova Poshta will currently let me change on an already-accepted waybill, then submit that change
**So that** I can correct contact or payment details after creation without recreating the shipment

### US-11: Browse waybill-edit requests

**As a** consuming developer
**I want** to list existing waybill-edit requests, including what changed before and after
**So that** I can audit what was changed on a waybill and when

### US-12: Delete a pending request

**As a** consuming developer
**I want** to delete a return, redirect, or waybill-edit request I no longer want
**So that** I can undo a request before it's acted on, the same way across all three request types

### US-13: Create a return in one call, without a separate possibility check

**As a** consuming developer
**I want** a convenience method that checks eligibility and creates a plain return to the sender's own address in one call
**So that** I don't have to make two separate calls for the most common return case

### US-14: Get a clear, consistent error on failure

**As a** consuming developer
**I want** a request that fails outright — a bad key, a decline, or a network failure — to raise the library's standard error
**So that** I can handle it the same way I handle every other error from this library, without special-casing this module

## 5. Acceptance criteria

> Every "standard error" referenced below is `NovaPoshtaApiError` (per `CLAUDE.md`), reused unchanged from every sibling module's convention.

### AC-01 (US-01) — happy path

**Given** a consuming developer holds a valid API key and an existing waybill's printed `Number`
**When** they call `checkReturnPossible` with that `Number`
**Then** the system returns the available return-address options Nova Poshta offers for that waybill as typed data, including whether each is non-cash

### AC-02 (US-01) — authorization

**Given** a consuming developer's API key represents the shipment's recipient rather than its sender
**When** they call `checkReturnPossible`, `createReturn`, or `calculateReturn` — actions Nova Poshta restricts to the sender
**Then** Nova Poshta itself declines the call and the system raises the standard error with Nova Poshta's own explanation; the library performs no client-side sender/recipient role check of its own

### AC-03 (US-02) — happy path

**Given** a consuming developer holds a valid API key, an existing waybill, a return reason, and exactly one destination choice (the sender's own address, a new address, or a new warehouse)
**When** they call `createReturn` with that destination's own fields
**Then** the system creates the return request and returns its `Ref` and printed `Number` as typed data

### AC-04 (US-02) — domain invariant

**Given** a consuming developer is building a `createReturn` request
**When** they select which destination variant they're using
**Then** the system's typed contract only accepts the fields belonging to that one variant — each variant carries its own explicit discriminant tag (mirroring `internet-document`'s `ServiceType`/`CargoType` precedent), so supplying a second variant's fields together with the wrong tag is a compile-time type error even when the payload is assembled field-by-field in a variable, not just when it's a fresh object literal; the discriminant itself is stripped before the request reaches Nova Poshta, since the wire `save` call has no field for it

### AC-05 (US-03) — happy path

**Given** a consuming developer holds the same information `createReturn` would need
**When** they call `calculateReturn` instead of `createReturn`
**Then** the system returns Nova Poshta's calculated delivery cost and estimated date as typed data, without creating an actual return request — a subsequent `getReturnOrdersList` call shows no new order from this call alone

### AC-06 (US-04) — happy path

**Given** a consuming developer holds an existing return request's own `Ref`
**When** they call `checkReturnEditPossible` and then `updateReturn` with a corrected field
**Then** the system applies the edit and returns the updated order as typed data

### AC-07 (US-04) — domain invariant

**Given** a consuming developer holds an existing return request whose status is no longer "Accepted" (it has already progressed or already been edited past that point)
**When** they call `updateReturn` against it
**Then** Nova Poshta's own status gate is the sole enforcer of the "editable only while Accepted" rule — the system performs no client-side status check of its own, and a decline surfaces as the standard error

### AC-08 (US-05) — happy path

**Given** a consuming developer holds a valid API key
**When** they call `getReturnOrdersList`, `getReturnReasons`, or `getReturnReasonsSubtypes`
**Then** the system returns the requested typed data exactly as Nova Poshta responds with it, performing no client-side re-filtering, sorting, or pagination beyond what the caller explicitly passes through

### AC-09 (US-06) — happy path

**Given** a consuming developer holds a valid API key and an existing waybill's `Number`
**When** they call `checkRedirectPossible` and then `createRedirect` with a new recipient, address, or warehouse
**Then** the system creates the redirect request and returns its `Ref` and printed `Number` as typed data

### AC-10 (US-06) — cross-context

**Given** a consuming developer holds a recipient counterparty's own `Ref`, obtained from `counterparty` — a separate bounded context this module doesn't manage
**When** they call `createRedirect` with that `Ref` as the new `Recipient`
**Then** the system passes it through to Nova Poshta unmodified, performing no ownership or existence check of its own — the same cross-context trust boundary `internet-document`'s sender/recipient `Ref`s and `scan-sheet`'s `CounterpartyRef` already rely on

### AC-11 (US-07) — happy path

**Given** a consuming developer holds the same information `createRedirect` would need
**When** they call `calculateRedirect` instead of `createRedirect`
**Then** the system returns Nova Poshta's calculated delivery cost and estimated date as typed data, without creating an actual redirect request

### AC-12 (US-08) — happy path

**Given** a consuming developer holds an existing redirect request's own identifying value (`OrderRef` on `checkRedirectEditPossible`'s request, the same order `updateRedirect` addresses as `Ref` — see §1's naming note)
**When** they call `checkRedirectEditPossible` and then `updateRedirect` with a corrected field
**Then** the system applies the edit and returns the updated order as typed data

### AC-13 (US-08) — authorization

**Given** a consuming developer's API key represents the shipment's recipient rather than its sender
**When** they call `updateRedirect` on an existing redirect request
**Then** Nova Poshta allows the call but may restrict which fields a recipient (as opposed to a sender) is permitted to change — the system passes through whatever subset Nova Poshta accepts, performing no client-side field-permission check of its own, and a rejected field surfaces as the standard error the same way any other decline does; `updateRedirect`'s typed signature carries no role parameter of its own — two independent SDKs (`platx/go-nova-poshta`, `sirkostya009/go-novapost`) confirm Nova Poshta infers sender-vs-recipient solely from whose API key places the call, not from a request field this library would need to set

### AC-14 (US-09) — happy path

**Given** a consuming developer holds a valid API key
**When** they call `getRedirectionOrdersList`
**Then** the system returns the redirect requests matching the caller's `Page`/`Limit`/date filters as typed data, exactly as Nova Poshta responds with it — performing no client-side re-filtering, sorting, or pagination beyond what the caller explicitly passes through (same convention as AC-08)

### AC-15 (US-10) — happy path

**Given** a consuming developer holds an already-accepted waybill's `IntDocNumber`
**When** they call `checkWaybillEditPossible` and then `createWaybillEdit` with a corrected sender/recipient/payer field
**Then** the system creates the waybill-edit request and returns its `Ref` and printed `Number` as typed data

### AC-16 (US-10) — domain invariant

**Given** a consuming developer has just called `checkWaybillEditPossible` and received flags indicating only some fields are currently changeable
**When** they call `createWaybillEdit` with a change to a field the flags marked as not currently changeable
**Then** Nova Poshta's own response — a decline, a partial application, or full acceptance — is the sole outcome the system reports; the library performs no client-side gating of its own against the flags it just returned

### AC-17 (US-11) — happy path

**Given** a consuming developer holds a valid API key
**When** they call `getChangeEWOrdersList`
**Then** the system returns the waybill-edit requests matching the caller's `Page`/`Limit`/date filters as typed data, including each changed field's before/after value where Nova Poshta provides one — performing no client-side re-filtering, sorting, or pagination beyond what the caller explicitly passes through (same convention as AC-08)

### AC-18 (US-12) — happy path

**Given** a consuming developer holds an existing return, redirect, or waybill-edit request's own `Ref`
**When** they call `deleteAdditionalServiceOrder` with that `Ref`
**Then** the system deletes that request and returns Nova Poshta's confirmation as typed data — the same one method works across all three request types, since Nova Poshta's own `delete` does

### AC-19 (US-12) — domain invariant

**Given** a consuming developer holds an existing waybill-edit request whose status is not "Accepted"
**When** they call `deleteAdditionalServiceOrder` against it
**Then** Nova Poshta's own status gate — documented specifically for waybill-edit requests — is the sole enforcer; the system performs no client-side status check of its own, and a decline surfaces as the standard error

### AC-20 (US-13) — happy path

**Given** a consuming developer holds a valid API key, a waybill, and the fields a plain return needs
**When** they call `createReturnIfPossible`
**Then** the system checks eligibility and, if Nova Poshta allows it, creates the plain return to the sender's own address in that one call, returning the same typed result `createReturn` would — if the eligibility check itself declines, the system raises the standard error and makes no create call at all

### AC-21 (US-14) — error

**Given** a consuming developer calls any of this module's methods
**When** Nova Poshta declines the request outright at the envelope level (`success: false`), or the response body isn't even a navigable list of results (envelope-level malformation — e.g. `data` missing or not an array)
**Then** the system raises the standard error containing Nova Poshta's own explanation, rather than returning an empty or partial result that looks like a valid outcome — matching every sibling module, this check stays at the envelope level only; a `success: true` response whose individual fields don't match a method's documented shape is not separately validated field-by-field

### AC-22 (US-14) — error

**Given** a consuming developer calls any of this module's methods
**When** the network call to Nova Poshta fails before a response is received (a timeout, a dropped connection, or a response that isn't valid JSON)
**Then** the system raises the standard error rather than letting the failure propagate unhandled or returning an empty result that looks like a valid response

### AC-23 (US-14) — authorization

**Given** a consuming developer calls any of this module's methods
**When** the request reaches Nova Poshta carrying the caller's API key the same way every other module's request does, and Nova Poshta denies the call over that key
**Then** the system raises the standard error with Nova Poshta's own message, exactly like every sibling module; the library performs no independent key-validity check of its own

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Type-safety coverage | 100% of in-scope methods (18 raw + 1 convenience) have zero `any` in public signatures | static check in CI |
| Error-contract coverage | 100% of in-scope methods throw the standard error on a declined, malformed, or network-failed response | unit test suite (`test/unit/modules/additional-service`) |
| Method-surface completeness | 100% of the 18 raw methods + 1 convenience method have a corresponding typed method | unit test suite asserts all 19 are exported and callable |
| Discriminant safety | 100% of `OrderType`/`OnlyGetPricing` values are set internally — 0 public method signatures accept either as a caller-settable field | static check in CI (public API surface review) |
| Library-added overhead per call (18 raw methods only) | Median ≤ 5ms beyond the underlying network round-trip (no client-side caching, retries, or heavy parsing) — **does not apply to `createReturnIfPossible`**, which makes two network calls by design | median across ≥30 repeated single-item calls to a raw method, `fetch` stubbed to near-zero latency, always runs in CI |
| Calculate/create isolation | 0 real return or redirect orders created by `calculateReturn`/`calculateRedirect` calls, verified at the layer each test suite can actually prove | unit test asserts the outgoing request carries `OnlyGetPricing: "1"` (network mocked, so this is the provable layer); the deeper server-side guarantee is Nova Poshta's own contract, additionally checked by the optional integration suite when `NOVA_POSHTA_TEST_API_KEY` is set |

## 6.1 Security / privacy

- **Data classification:** confidential — this module's responses and requests carry sender/recipient contact names, phone numbers, addresses, and payment/cost details, matching or exceeding `internet-document`'s and `tracking-document`'s posture.
- **Personal data touched:** yes — `RecipientContactName`/`RecipientPhone`/`SenderContactName`/`SenderPhone` and address fields across return, redirect, and waybill-edit requests qualify as personal data whenever the underlying counterparty is a `PrivatePerson` (per the CONTEXT glossary).
- **AuthZ/AuthN impact:** the library sends the caller's API key on every call the same way every module does (AC-23) and performs no independent key-validity check. Nova Poshta itself enforces the sender-only restriction on most check/create/calculate actions (AC-02) and the sender-vs-recipient field-permission difference on redirect edits (AC-13) — this library performs no client-side role or field-permission check of its own for any of it.
- **Abuse cases:**
  - Enumerating a waybill `Number` or order `Ref` to fish for another party's return/redirect address, contact, or cost detail: accepted risk by design, matching `scan-sheet`'s and `tracking-document`'s existing stance — this library adds no rate-limiting or ownership check of its own.
  - Calling `updateReturn`/`updateRedirect`/`deleteAdditionalServiceOrder` against a `Ref` the caller doesn't actually own, or a `Ref` belonging to a different order type than the caller intended (no branded `Ref` type distinguishes them — §3 non-goal): Nova Poshta's own authorization and the `Ref`'s own existence are the only controls; a caller who mixes up a return `Ref` with a redirect `Ref` in their own storage could cancel the wrong live request with no error from this library.
  - Submitting a `createWaybillEdit` change to a field `checkWaybillEditPossible` just reported as not currently changeable (AC-16): the library performs no client-side gating; whatever Nova Poshta does with it — decline, partial application, or full acceptance — is the only outcome available, and a partial application in particular could leave a payer/recipient mismatch this library cannot detect.
  - `createReturnIfPossible`'s two-call gap (§3 non-goal): a lost response between the eligibility check and the create call leaves the caller unable to tell, from this library alone, whether a return now exists — a naive retry re-runs the check, which may now correctly report "not possible" because the first attempt already succeeded, surfacing as a confusing decline rather than a duplicate-prevention signal.
- **Logging:** the library performs no logging of its own (matching its existing stateless design); a thrown `NovaPoshtaApiError`'s message carries only Nova Poshta's own `errors[]`/`warnings[]` text, never response-body PII.
- **Security review:** Required — new money-bearing fields (`PaymentMethod`, return/redirect cost, backward-delivery-adjacent amounts) and personal data at write time, plus the two accepted-but-documented risks above (no field-permission gating on waybill edits, no atomicity on the convenience method) that a security review should weigh explicitly rather than this spec asserting they're acceptable unchallenged.

## 7. Metrics / KPIs

- **Type-safety completeness** — baseline: 0% (module doesn't exist yet), target: 100% of in-scope methods carry no `any` in their public signature, verified in the first release containing this feature.
- **Zero silent failures** — baseline: N/A (feature doesn't exist), target: 100% of unit tests confirming a declined or network-failed call throws `NovaPoshtaApiError`, passing before merge.
- **Method-surface completeness** — baseline: 0 of 19 (18 raw + 1 convenience) exposed, target: all 19 shipped with a corresponding typed method before this feature is marked done.
- **API-contract sourcing completeness** — baseline: 0% (nothing confirmed yet), target: 100% of the 19 methods' request/response shapes confirmed against official Nova Poshta documentation (not SDK cross-check alone) before ship, per `CLAUDE.md`'s sourcing policy. **Status (2026-09-23, post round-5 fix): met, with two fields honestly graded `medium`** — `contracts/api-sync-report.md`'s field-origins table is the source of truth for per-field confidence; every row cites either a direct quote or, for `getReturnReasonsSubtypes.ReasonRef` and `getRedirectionOrdersList`'s request shape, an explicit, disclosed inference from the shared `OrderListFilters` pattern rather than a method-specific quote. This status line itself was rewritten twice before (rounds 3 and 4) claiming "100%"/"every field" while rows underneath it were still unbacked — round 5 corrects the last three such rows and deliberately avoids repeating that blanket phrasing here.
- **Convenience-method correctness** — baseline: N/A (feature doesn't exist), target: 0 GitHub issues within 90 days of release reporting `createReturnIfPossible` creating a duplicate return, or leaving the caller unable to determine whether a return was created.

## 8. Open questions

- [x] ~~Does `checkReturnPossible`'s per-option `Ref` field map directly onto `createReturn`'s `ReturnAddressRef`?~~ **Resolved 2026-09-23** — official docs' own `save`/`orderCargoReturn` example confirms `ReturnAddressRef` as the real wire field name for the sender-address variant; no source contradicts it being the same value `CheckPossibilityCreateReturn` returns as each option's `Ref` (§1's new "Official documentation quotes" subsection). No longer blocking.
- [x] ~~Does a waybill-edit (ChangeEW) request genuinely have no `update`/edit capability?~~ **Resolved 2026-09-23** — the official docs' complete "Змінити дані" section lists only `getChangeEWOrdersList`/`save`/`CheckPossibilityChangeEW`, no `update`, at the same page depth return/redirect's `update` sections receive (§1). Confirmed: no `updateWaybillEdit` method; amending one still means delete-then-recreate, a documented TOCTOU risk (§3, §6.1).
- [ ] Does the `orderTermExtension` order type (storage-term extension) genuinely exist as a real, callable Nova Poshta capability? Default now: excluded from this module's scope entirely — single, self-admittedly reverse-engineered source only, absent from official docs (§1 Decision override); this session's official-docs capture confirms no mention of it either. — owner: Tech Lead, due: once official docs add it, or a 2nd agreeing source is found
- [x] ~~Do Nova Poshta's dispatch rules for `CheckPossibilityCreateReturn`/`checkPossibilityForRedirecting` key off which properties are present, and what are `checkReturnEditPossible`/`checkRedirectEditPossible`'s exact field lists?~~ **Resolved 2026-09-23** — official docs' own request/response examples confirm `checkReturnEditPossible`'s `Address` is a plain string (not a structured object) and `checkRedirectEditPossible`'s full field list (14 named optional fields) (§1). The malformed-mixed-request edge case itself remains untested against a live key — tracked below.
- [x] ~~Re-verify the full 19-method surface, plus `updateReturn`/`updateRedirect`'s literal `Ref` field name~~ — **resolved 2026-09-23** via three official-docs captures (§1's "Official documentation quotes", "Round 3", and "Round 4" subsections). All 19 methods' request/response shapes are now traced to a direct, genuine quote — including `checkWaybillEditPossible`'s request and all three `save` responses, which round 4's review found still-unquoted despite round-3's claim otherwise, and `createWaybillEdit`'s field list, which round 4 found was sourced by a fabricated placeholder quote rather than a real one (§1 "Round 4" subsection corrects this with the genuine page content).
- [x] ~~Are `OrderListFilters.Page`/`Limit` numbers or strings on the wire?~~ **Resolved 2026-09-23** — every list-method example in the round-3 capture sends them as quoted JSON strings (`"1"`, `"50"`); corrected from `number` to `string` (review round-3 finding).
- [x] ~~`CreateRedirectPayload.ServiceType`'s full enum~~ — **Resolved 2026-09-23 (round 4)** — the redirect-calculate page's own field table explicitly enumerates all four values (`DoorsWarehouse, WarehouseWarehouse, WarehouseDoors, DoorsDoors`); `ServiceType` narrowed to this union on both `CreateRedirectPayload` and `UpdateRedirectPayload` (types.ts).
- [x] ~~`PaymentMethod`'s `"NonCash"` member~~ — **Resolved 2026-09-23 (round 4)** — confirmed directly on `AdditionalServiceGeneral`'s own pages (return-save, redirect-save, redirect-calculate field-description columns all read "Cash/NonCash" verbatim), not carried over from `internet-document`.
- [x] ~~`OrderPricingEstimate.Pricing.Total`'s JSON shape~~ — **Resolved 2026-09-23 (round 4)** — the "genuinely disagrees" claim had no real quote behind it (round-4 review finding: no `"5.52"` example exists anywhere in this document). Both genuine calculate examples (return and redirect) show an unquoted JSON number (`0`); reverted to `number` (was `number | string`).
