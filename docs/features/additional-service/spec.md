---
status: Draft
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
| 2 | `checkReturnEditPossible` | `CheckPossibilityCreateReturn` | `Ref, Address` | array of `{..., Type: "CustomReturnAddress"\|"OrderReturn"}` + `info: {PayerTypeDefault, Number}` |
| 3 | `createReturn` | `save` / `orderCargoReturn` | `IntDocNumber, PaymentMethod, Reason, SubtypeReason, Note` + one of `ReturnAddressRef` \| `RecipientSettlement+RecipientSettlementStreet+BuildingNumber+NoteAddressRecipient` \| `RecipientWarehouse` | `Number, Ref` |
| 4 | `calculateReturn` | `save` / `orderCargoReturn` + `OnlyGetPricing:"1"` (internal) | same as `createReturn` | `Pricing: {Services[], Total, FirstDayStorage}, ScheduledDeliveryDate` |
| 5 | `updateReturn` | `update` | `Ref` + subset of `RecipientSettlement, RecipientWarehouse, IntDocNumber, RecipientSettlementStreet, PaymentMethod, BuildingNumber, NoteAddressRecipient, Reason, SubtypeReason` | updated order fields, or `Pricing`+`ScheduledDeliveryDate` when recalculating |
| 6 | `getReturnOrdersList` | `getReturnOrdersList` | `Number?, Ref?, BeginDate?, EndDate?, Page?, Limit?` | `OrderRef, OrderNumber, OrderStatus, DocumentNumber, CounterpartyRecipient, ContactPersonRecipient, AddressRecipient, DeliveryCost, EstimatedDeliveryDate, ExpressWaybillNumber, ExpressWaybillStatus` |
| 7 | `getReturnReasons` | `getReturnReasons` | *(none)* | `Ref, Description` |
| 8 | `getReturnReasonsSubtypes` | `getReturnReasonsSubtypes` | `ReasonRef?` | `Ref, Description, ReasonRef` |
| 9 | `checkRedirectPossible` | `checkPossibilityForRedirecting` | `Number` | `Ref, Number, PayerType, PaymentMethod, WarehouseRef, WarehouseDescription, AddressDescription, StreetDescription, BuildingNumber, CityRecipient, CityRecipientDescription, SettlementRecipient, SettlementRecipientDescription, SettlementType, CounterpartyRecipientRef, CounterpartyRecipientDescription, RecipientName, PhoneSender, PhoneRecipient, DocumentWeight` |
| 10 | `checkRedirectEditPossible` | `checkPossibilityForRedirecting` | `OrderRef` + address/recipient fields | updated subset of the same field set |
| 11 | `createRedirect` | `save` / `orderRedirecting` | `IntDocNumber, PaymentMethod, Note, Recipient, RecipientContactName, RecipientPhone, PayerType, Customer, ServiceType, RecipientSettlement, RecipientSettlementStreet, BuildingNumber, NoteAddressRecipient, RecipientWarehouse` | `Number, Ref` |
| 12 | `calculateRedirect` | `save` / `orderRedirecting` + `OnlyGetPricing:"1"` (internal) | same as `createRedirect` | `Pricing: {Services[], Total, FirstDayStorage}, ScheduledDeliveryDate` |
| 13 | `updateRedirect` | `update` | `Ref` + subset of `PaymentMethod, NoteAddressRecipient, Recipient, CityRecipient, Note, Customer, RecipientContactName, IntDocNumber, RecipientWarehouse, RecipientPhone, SettlementRecipient, BuildingNumber, RecipientSettlementStreet, ServiceType, PayerType` | updated order fields |
| 14 | `getRedirectionOrdersList` | `getRedirectionOrdersList` | `Number?, Ref?, BeginDate?, EndDate?, Page?, Limit?` | `OrderRef, OrderNumber, DateTime, DocumentNumber, Note, CityRecipient, RecipientAddress, CounterpartyRecipient, RecipientName, PhoneRecipient, PayerType, DeliveryCost, EstimatedDeliveryDate, ExpressWaybillNumber, ExpressWaybillStatus` |
| 15 | `checkWaybillEditPossible` | `CheckPossibilityChangeEW` | `IntDocNumber` | 11 `Can...` boolean flags (`CanChangeSender`, `CanChangeRecipient`, `CanChangePayerTypeOrPaymentMethod`, `CanChangeBackwardDeliveryDocuments`, `CanChangeBackwardDeliveryMoney`, `CanChangeCash2Card`, `CanChangeBackwardDeliveryOther`, `CanChangeAfterpaymentType`, `CanChangeLiftingOnFloor`, `CanChangeLiftingOnFloorWithElevator`, `CanChangeFillingWarranty`) + `SenderCounterparty, ContactPersonSender, SenderPhone, RecipientCounterparty, ContactPersonRecipient, RecipientPhone, PayerType, PaymentMethod` |
| 16 | `createWaybillEdit` | `save` / `orderChangeEW` | `IntDocNumber, PaymentMethod, SenderContactName, SenderPhone, Recipient, RecipientContactName, RecipientPhone, PayerType` | `Number, Ref` |
| 17 | `getChangeEWOrdersList` | `getChangeEWOrdersList` | `Number?, Ref?, BeginDate?, EndDate?, Page?, Limit?` | `OrderRef, OrderNumber, OrderStatus, DocumentNumber, DateTime, BeforeChangeSenderCounterparty, AfterChangeChangeSenderCounterparty, Cost, BeforeChangeSenderPhone, AfterChangeSenderPhone` |
| 18 | `deleteAdditionalServiceOrder` | `delete` | `Ref` | `Number` |
| 19 | `createReturnIfPossible` (convenience) | *(internally: `CheckPossibilityCreateReturn` then `save`/`orderCargoReturn`)* | `IntDocNumber` + the plain-return fields `createReturn` needs | same as `createReturn`, or the standard error if the check declines |

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
**Then** the system's typed contract only accepts the fields belonging to that one variant — supplying a second variant's fields on the same call is a compile-time type error, not a value this library forwards to Nova Poshta unresolved

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

**Given** a consuming developer holds an existing redirect request's own `OrderRef`
**When** they call `checkRedirectEditPossible` and then `updateRedirect` with a corrected field
**Then** the system applies the edit and returns the updated order as typed data

### AC-13 (US-08) — authorization

**Given** a consuming developer's API key represents the shipment's recipient rather than its sender
**When** they call `updateRedirect` on an existing redirect request
**Then** Nova Poshta allows the call but may restrict which fields a recipient (as opposed to a sender) is permitted to change — the system passes through whatever subset Nova Poshta accepts, performing no client-side field-permission check of its own, and a rejected field surfaces as the standard error the same way any other decline does

### AC-14 (US-09) — happy path

**Given** a consuming developer holds a valid API key
**When** they call `getRedirectionOrdersList`
**Then** the system returns every matching redirect request as typed data, exactly as Nova Poshta responds with it

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
**Then** the system returns every matching waybill-edit request as typed data, including each changed field's before/after value where Nova Poshta provides one

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
**When** Nova Poshta declines the request outright at the envelope level (`success: false`), or the response it returns isn't shaped as that method's documented data at all
**Then** the system raises the standard error containing Nova Poshta's own explanation, rather than returning an empty or partial result that looks like a valid outcome

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
- **API-contract sourcing completeness** — baseline: 0% (nothing confirmed yet), target: 100% of the 19 methods' request/response shapes confirmed against official Nova Poshta documentation (not SDK cross-check alone) before ship, per `CLAUDE.md`'s sourcing policy.
- **Convenience-method correctness** — baseline: N/A (feature doesn't exist), target: 0 GitHub issues within 90 days of release reporting `createReturnIfPossible` creating a duplicate return, or leaving the caller unable to determine whether a return was created.

## 8. Open questions

- [ ] Does a waybill-edit (ChangeEW) request genuinely have no `update`/edit capability, or does one exist on a documentation page this session's capture missed? Default now: no `updateWaybillEdit` method shipped (§1 Decision override); amending one means delete-then-recreate, itself carrying a documented TOCTOU risk (§3, §6.1). — owner: Tech Lead, due: next live-API verification pass
- [ ] Does the `orderTermExtension` order type (storage-term extension) genuinely exist as a real, callable Nova Poshta capability? Default now: excluded from this module's scope entirely — single, self-admittedly reverse-engineered source only, absent from official docs (§1 Decision override). — owner: Tech Lead, due: once official docs add it, or a 2nd agreeing source is found
- [ ] Do Nova Poshta's dispatch rules for `CheckPossibilityCreateReturn` and `checkPossibilityForRedirecting` genuinely key off which properties are present (`Number` vs. `Ref`+`Address`, or `Number` vs. `OrderRef`+fields) the way this spec's four-way split (§1 Decision override) assumes, or could a malformed mixed request produce an ambiguous or wrong-shaped response neither this spec's typed functions nor its tests anticipate? — owner: Tech Lead, due: before integration tests run against a live key
- [ ] Re-verify the full 19-method surface — every request/response field, plus the `checkReturnEditPossible`/`checkRedirectEditPossible` dual-shape split and the ChangeEW `update` asymmetry above — against Nova Poshta's live/official documentation once reachable by automated tooling, the same closing caveat every shipped spec in this repo already carries. — owner: Tech Lead, due: next live-API verification pass
