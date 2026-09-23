---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-23"
feature_size: "M"
---

# Public API contract — additional-service

**Interface kind:** `library-sdk` (from `sad.md` frontmatter `target_surfaces`). The contract is the
public TypeScript surface `createAdditionalServiceModule()` exports — 19 method signatures, request/
response types, the discriminant safety guard (§4 decision 4), and the error contract every method
shares — not an HTTP/OpenAPI document.

**Gate — legal fast-lane skip (no `data-model.md`):** `data-model.md` does not exist for this feature.
`sad.md` §6 states this loudly: every write in every flow is a `save`/`update`/`delete` call to Nova
Poshta's own API — this module persists nothing of its own (`CLAUDE.md`, "No persistence"), so no
schema change is implied and `data-model`'s hard-refuse condition doesn't apply. Fields below trace
instead to `spec.md` §1's method table (itself sourced from Nova Poshta's own official documentation,
captured 2026-09-23, cross-checked against 5 independent community SDKs), `sad.md` §4's decisions
(discriminant safety, `requestFirst<T>()`/`requestEnvelope()` client entry points) and §5/§6 (method
classification + the 11 sequence flows and their `alt` branches). See `api-sync-report.md` for the
full field-origins table.

**Blocking open question, resolved for this pass (`sad.md` §1 ¶4, §11 row 1):** does
`checkReturnPossible`'s per-option `Ref` map onto `createReturn`'s `ReturnAddressRef`? Re-checked this
session: official docs remain Cloudflare-blocked to automated fetch; `platx/go-nova-poshta` types both
fields as the same Go `UUID` type (weak, not conclusive); a real-world OpenCart bug report describes
`ReturnAddressRef` rejecting a *warehouse* ref (a different mistake than what `checkReturnPossible`
returns) — no source directly confirms or refutes the mapping. **Decision (confirmed with the user this
session):** ship `createReturnIfPossible` exactly as `sad.md` Flow 1 designed it — assume the mapping
holds, and rely on Flow 1's fail-safe property (a wrong assumption surfaces as `NovaPoshtaApiError`,
never a corrupted order) rather than blocking the method. Tracked as an open risk, not resolved —
`spec.md` §8 row 1 and `sad.md` §11 row 1 stay open, owner Tech Lead, due before integration tests run
against a live key.

## 1. Module shape

```ts
// src/modules/additional-service/index.ts
export function createAdditionalServiceModule(client: NovaPoshtaClient): AdditionalServiceModule;
```

`AdditionalServiceModule` is a flat object — no sub-namespace, matching every sibling module's single
`library-sdk` surface (`sad.md` §4 decision 1) — exported from `src/index.ts` alongside the six
already-shipped modules.

**Shared-client surface this feature adds** (`sad.md` §4 decisions 2–3, ADR-0001, ADR-0002— both
additive, backward-compatible changes to `src/client.ts`, inherited by every future module):

```ts
// src/client.ts — CHANGED
export interface NovaPoshtaSuccessEnvelope<T> {
  data: T[];
  errors: string[];
  warnings: string[];
  info?: unknown; // NEW (ADR-0001) — requestEnvelope() now surfaces the wire envelope's own `info`
                  // block; request() is unaffected, still returns only `data`.
}

export interface NovaPoshtaClient {
  // ...existing request()/requestEnvelope()/apiKey unchanged...
  /** NEW (ADR-0002) — promoted from internet-document's private firstOrThrow(). Resolves
   *  request()'s array, returns its first element, throws NovaPoshtaApiError if the array is
   *  empty. internet-document's save/update/getDocumentPrice/getDocumentDeliveryDate are refactored
   *  to call this instead of their own private copy — behavior-preserving (sad.md §11 last row). */
  requestFirst<T>(modelName: string, calledMethod: string, methodProperties?: Record<string, unknown>): Promise<T>;
}
```

## 2. Shared types

```ts
// src/types/additional-service.ts

/** Independent of internet-document's PaymentMethod (same 2 values, confirmed identically by
 *  spec.md §1's method table) — this module defines its own copy rather than importing across
 *  modules, matching sad.md §5's "additional-service does not call internet-document at runtime"
 *  boundary and CLAUDE.md's one-folder-per-model convention. */
export type PaymentMethod = "Cash" | "NonCash";

/** sad.md §4 decision 4, AC-04: TS-only discriminant on createReturn's destination-variant union —
 *  no counterpart on Nova Poshta's wire `save` payload. Stripped by the module before the request is
 *  sent; OrderType: "orderCargoReturn" is set internally, never caller-settable. */
export type ReturnDestination = "SenderAddress" | "NewAddress" | "NewWarehouse";
```

*`createRedirect`/`updateRedirect`'s `ServiceType` field (spec.md §1 row 11/13) has no confirmed enum
values in this session's sourcing pass for this module specifically — unlike `internet-document`'s
`ServiceType`, which was independently re-fetched and widened. Typed as plain `string`, pass-through
only (§4 decision 6's "type loosely rather than falsely precisely" — see `api-sync-report.md` row
`createRedirect.ServiceType`).*

## 3. Methods

One typed method per §1 in-scope `AdditionalServiceGeneral` method (18 raw, per `spec.md` §1 /
`sad.md` §5) plus 1 convenience (`createReturnIfPossible`). Grouped by the structurally-repeated
shapes `sad.md` §2/§4 already names, not 19 independent designs.

| # | Method | User story | AC | Client entry point (`sad.md` §5) |
|---|---|---|---|---|
| 1 | `checkReturnPossible(payload)` | US-01 | AC-01, AC-02 | `request()` |
| 2 | `checkReturnEditPossible(payload)` | US-04 | AC-06 | `requestEnvelope()` (ADR-0001) |
| 3 | `createReturn(payload)` | US-02 | AC-02, AC-03, AC-04 | `requestFirst()` (ADR-0002) |
| 4 | `calculateReturn(payload)` | US-03 | AC-02, AC-05 | `requestFirst()` |
| 5 | `updateReturn(payload)` | US-04 | AC-06, AC-07 | `requestFirst()` |
| 6 | `getReturnOrdersList(filters?)` | US-05 | AC-08 | `request()` |
| 7 | `getReturnReasons()` | US-05 | AC-08 | `request()` |
| 8 | `getReturnReasonsSubtypes(filters?)` | US-05 | AC-08 | `request()` |
| 9 | `checkRedirectPossible(payload)` | US-06 | AC-09 | `requestFirst()` |
| 10 | `checkRedirectEditPossible(payload)` | US-08 | AC-12 | `requestFirst()` |
| 11 | `createRedirect(payload)` | US-06 | AC-09, AC-10 | `requestFirst()` |
| 12 | `calculateRedirect(payload)` | US-07 | AC-11 | `requestFirst()` |
| 13 | `updateRedirect(payload)` | US-08 | AC-12, AC-13 | `requestFirst()` |
| 14 | `getRedirectionOrdersList(filters?)` | US-09 | AC-14 | `request()` |
| 15 | `checkWaybillEditPossible(payload)` | US-10 | AC-15, AC-16 | `requestFirst()` |
| 16 | `createWaybillEdit(payload)` | US-10 | AC-15, AC-16 | `requestFirst()` |
| 17 | `getChangeEWOrdersList(filters?)` | US-11 | AC-17 | `request()` |
| 18 | `deleteAdditionalServiceOrder(payload)` | US-12 | AC-18, AC-19 | `requestFirst()` |
| 19 | `createReturnIfPossible(payload)` (convenience) | US-13 | AC-20 | composes #1 + #3 internally |

Every method's decline/network error behavior is identical and covered once in §6 (AC-21/AC-22/
AC-23) — not repeated per row.

### 3.1 Return group — `checkReturnPossible`, `checkReturnEditPossible`, `createReturn`,
### `calculateReturn`, `updateReturn`, `getReturnOrdersList`, `getReturnReasons`,
### `getReturnReasonsSubtypes`

```ts
export interface CheckReturnPossiblePayload {
  Number: string; // waybill IntDocNumber
}

export interface ReturnAddressOption {
  Ref: string;          // sad.md §1 ¶4 — assumed identical to createReturn's ReturnAddressRef (open risk, see header)
  NonCash: string;       // "0" | "1" wire flag — kept as raw string, not coerced to boolean (matches this
                          // library's BeginDate/EndDate convention: no client-side type coercion)
  City: string;
  Counterparty: string;
  ContactPerson: string;
  Address: string;
  Phone: string;
}

checkReturnPossible(payload: CheckReturnPossiblePayload): Promise<ReturnAddressOption[]>;
```

```ts
/** sad.md §5's asymmetry note + AC-06: Address's own shape is unconfirmed (spec.md §8 OQ-4) — a
 *  Ref string, or a structured object. Typed loosely rather than falsely precisely (§4 decision 6). */
export interface CheckReturnEditPossiblePayload {
  Ref: string;    // the existing return request's own Ref
  Address: unknown; // unconfirmed shape — spec.md §8 OQ-4
}

export interface ReturnEditOption {
  Type: "CustomReturnAddress" | "OrderReturn";
  [key: string]: unknown; // other per-Type fields unconfirmed (spec.md §8 OQ-4)
}

export interface ReturnEditInfo {
  PayerTypeDefault: string;
  Number: string;
}

/** Assembled by this module from requestEnvelope()'s data + info fields (ADR-0001) — never Nova
 *  Poshta's raw envelope shape as-is; info is narrowed here, not by the client. */
export interface CheckReturnEditPossibleResult {
  options: ReturnEditOption[];
  info: ReturnEditInfo;
}

checkReturnEditPossible(payload: CheckReturnEditPossiblePayload): Promise<CheckReturnEditPossibleResult>;
```

```ts
/** AC-04, sad.md §4 decision 4: one discriminated union, one function — mixing a second variant's
 *  fields with the wrong Destination tag is a compile-time error even when the payload is built
 *  field-by-field in a variable. Destination is stripped before the wire call; OrderType:
 *  "orderCargoReturn" is set internally. */
interface CreateReturnCommonFields {
  IntDocNumber: string;
  PaymentMethod: PaymentMethod;
  Reason: string;          // Ref from getReturnReasons()
  SubtypeReason?: string;  // Ref from getReturnReasonsSubtypes()
  Note?: string;
}

export interface CreateReturnToSenderAddressPayload extends CreateReturnCommonFields {
  Destination: "SenderAddress";
  ReturnAddressRef: string; // see header — open risk on whether this equals ReturnAddressOption.Ref
}
export interface CreateReturnToNewAddressPayload extends CreateReturnCommonFields {
  Destination: "NewAddress";
  RecipientSettlement: string;
  RecipientSettlementStreet: string;
  BuildingNumber: string;
  NoteAddressRecipient?: string;
}
export interface CreateReturnToNewWarehousePayload extends CreateReturnCommonFields {
  Destination: "NewWarehouse";
  RecipientWarehouse: string;
}

export type CreateReturnPayload =
  | CreateReturnToSenderAddressPayload
  | CreateReturnToNewAddressPayload
  | CreateReturnToNewWarehousePayload;

export interface SavedReturnOrder {
  Number: string;
  Ref: string;
}

createReturn(payload: CreateReturnPayload): Promise<SavedReturnOrder>;
```

```ts
export interface OrderPricingEstimate {
  Pricing: {
    Services: unknown[]; // per-service cost breakdown — not independently sourced this session, kept opaque
    Total: number;
    FirstDayStorage: number;
  };
  ScheduledDeliveryDate: string;
}

/** §4 decision 6: same payload shape createReturn takes; OnlyGetPricing: "1" is injected internally,
 *  never a caller-settable field (spec.md §6 NFR "Discriminant safety"). No order is created. */
calculateReturn(payload: CreateReturnPayload): Promise<OrderPricingEstimate>;
```

```ts
/** AC-06/AC-07: full-replace is NOT confirmed either way for update (unlike internet-document's
 *  confirmed full-replace semantics) — spec.md §1's field list is a documented subset, and the
 *  response is genuinely ambiguous ("updated order fields, or Pricing+ScheduledDeliveryDate when
 *  recalculating"). Both request and response are typed defensively rather than with false
 *  precision (§4 decision 6). Ref's own literal field name is itself unconfirmed against a live call
 *  (spec.md §1 naming note, §8 OQ-5) — modeled here to match delete's Ref, pending verification. */
export interface UpdateReturnPayload {
  Ref: string;
  RecipientSettlement?: string;
  RecipientWarehouse?: string;
  IntDocNumber?: string;
  RecipientSettlementStreet?: string;
  PaymentMethod?: PaymentMethod;
  BuildingNumber?: string;
  NoteAddressRecipient?: string;
  Reason?: string;
  SubtypeReason?: string;
}

updateReturn(payload: UpdateReturnPayload): Promise<Record<string, unknown>>;
```

```ts
export interface OrderListFilters {
  Number?: string;
  Ref?: string;
  BeginDate?: string; // raw pass-through string, no client-side date parsing (sad.md §8 note)
  EndDate?: string;
  Page?: number;
  Limit?: number;
}

export interface ReturnOrderListItem {
  OrderRef: string;
  OrderNumber: string;
  OrderStatus: string;
  DocumentNumber: string;
  CounterpartyRecipient: string;
  ContactPersonRecipient: string;
  AddressRecipient: string;
  DeliveryCost: string;
  EstimatedDeliveryDate: string;
  ExpressWaybillNumber: string;
  ExpressWaybillStatus: string;
}

getReturnOrdersList(filters?: OrderListFilters): Promise<ReturnOrderListItem[]>;
```

```ts
export interface ReturnReason {
  Ref: string;
  Description: string;
}

getReturnReasons(): Promise<ReturnReason[]>;
```

```ts
export interface ReturnReasonSubtypeFilters {
  ReasonRef?: string;
}

export interface ReturnReasonSubtype {
  Ref: string;
  Description: string;
  ReasonRef: string;
}

getReturnReasonsSubtypes(filters?: ReturnReasonSubtypeFilters): Promise<ReturnReasonSubtype[]>;
```

### 3.2 Redirect group — `checkRedirectPossible`, `checkRedirectEditPossible`, `createRedirect`,
### `calculateRedirect`, `updateRedirect`, `getRedirectionOrdersList`

```ts
export interface CheckRedirectPossiblePayload {
  Number: string;
}

/** sad.md §5's asymmetry note: unlike checkReturnPossible, this is one info record describing the
 *  redirect's current possibility, not a list of destination choices — requestFirst(), not
 *  request(). */
export interface RedirectPossibility {
  Ref: string;
  Number: string;
  PayerType: string;
  PaymentMethod: string;
  WarehouseRef: string;
  WarehouseDescription: string;
  AddressDescription: string;
  StreetDescription: string;
  BuildingNumber: string;
  CityRecipient: string;
  CityRecipientDescription: string;
  SettlementRecipient: string;
  SettlementRecipientDescription: string;
  SettlementType: string;
  CounterpartyRecipientRef: string;
  CounterpartyRecipientDescription: string;
  RecipientName: string;
  PhoneSender: string;
  PhoneRecipient: string;
  DocumentWeight: string;
}

checkRedirectPossible(payload: CheckRedirectPossiblePayload): Promise<RedirectPossibility>;
```

```ts
/** spec.md §8 OQ-4: the exact address/recipient field list this dual-purpose wire method expects
 *  under the OrderRef+fields dispatch branch is unconfirmed — typed loosely (§4 decision 6). */
export interface CheckRedirectEditPossiblePayload {
  OrderRef: string;
  [key: string]: unknown; // unconfirmed address/recipient fields — spec.md §8 OQ-4
}

checkRedirectEditPossible(payload: CheckRedirectEditPossiblePayload): Promise<Partial<RedirectPossibility>>;
```

```ts
/** No AC-04-equivalent discriminant guard exists for redirect (spec.md doesn't mandate one the way
 *  AC-04 mandates it for return) — every destination-related field stays optional on one flat
 *  interface; Nova Poshta's own response is the sole judge of a malformed combination. AC-10:
 *  Recipient is a counterparty Ref from the counterparty module, passed through unmodified — no
 *  ownership/existence check of this module's own. */
export interface CreateRedirectPayload {
  IntDocNumber: string;
  PaymentMethod: PaymentMethod;
  Note?: string;
  Recipient: string; // counterparty Ref (AC-10, cross-context trust boundary)
  RecipientContactName: string;
  RecipientPhone: string;
  PayerType: string;
  Customer?: string;
  ServiceType?: string; // unconfirmed enum for this module — see §2 note
  RecipientSettlement?: string;
  RecipientSettlementStreet?: string;
  BuildingNumber?: string;
  NoteAddressRecipient?: string;
  RecipientWarehouse?: string;
}

export interface SavedRedirectOrder {
  Number: string;
  Ref: string;
}

createRedirect(payload: CreateRedirectPayload): Promise<SavedRedirectOrder>;
```

```ts
/** §4 decision 6: same payload shape createRedirect takes; OnlyGetPricing: "1" injected internally. */
calculateRedirect(payload: CreateRedirectPayload): Promise<OrderPricingEstimate>;
```

```ts
/** AC-12/AC-13: Ref is the same order updateRedirect addresses (see §1 naming note — OrderRef on the
 *  check, Ref on the update). No role field — Nova Poshta infers sender-vs-recipient solely from the
 *  calling key (AC-13, 2-SDK-confirmed) and may silently narrow which fields this update actually
 *  applies; the response is typed defensively for the same reason updateReturn's is (§4 decision 6). */
export interface UpdateRedirectPayload {
  Ref: string;
  PaymentMethod?: PaymentMethod;
  NoteAddressRecipient?: string;
  Recipient?: string;
  CityRecipient?: string;
  Note?: string;
  Customer?: string;
  RecipientContactName?: string;
  IntDocNumber?: string;
  RecipientWarehouse?: string;
  RecipientPhone?: string;
  SettlementRecipient?: string;
  BuildingNumber?: string;
  RecipientSettlementStreet?: string;
  ServiceType?: string;
  PayerType?: string;
}

updateRedirect(payload: UpdateRedirectPayload): Promise<Record<string, unknown>>;
```

```ts
export interface RedirectOrderListItem {
  OrderRef: string;
  OrderNumber: string;
  DateTime: string;
  Note: string;
  CityRecipient: string;
  RecipientAddress: string;
  CounterpartyRecipient: string;
  RecipientName: string;
  PhoneRecipient: string;
  PayerType: string;
  DeliveryCost: string;
  EstimatedDeliveryDate: string;
  ExpressWaybillNumber: string;
  ExpressWaybillStatus: string;
}

getRedirectionOrdersList(filters?: OrderListFilters): Promise<RedirectOrderListItem[]>;
```

### 3.3 Waybill-edit group — `checkWaybillEditPossible`, `createWaybillEdit`, `getChangeEWOrdersList`

```ts
/** AC-16: the 11 Can... flags are informational only — the module performs no client-side gating
 *  against them when createWaybillEdit is called next. 8 of the 11 have no corresponding field on
 *  createWaybillEdit at all (spec.md §3 non-goal, 2-SDK-confirmed) — kept on this type anyway since
 *  Nova Poshta returns them, just unconsumed by createWaybillEdit's own payload. */
export interface WaybillEditPossibility {
  CanChangeSender: boolean;
  CanChangeRecipient: boolean;
  CanChangePayerTypeOrPaymentMethod: boolean;
  CanChangeBackwardDeliveryDocuments: boolean;
  CanChangeBackwardDeliveryMoney: boolean;
  CanChangeCash2Card: boolean;
  CanChangeBackwardDeliveryOther: boolean;
  CanChangeAfterpaymentType: boolean;
  CanChangeLiftingOnFloor: boolean;
  CanChangeLiftingOnFloorWithElevator: boolean;
  CanChangeFillingWarranty: boolean;
  SenderCounterparty: string;
  ContactPersonSender: string;
  SenderPhone: string;
  RecipientCounterparty: string;
  ContactPersonRecipient: string;
  RecipientPhone: string;
  PayerType: string;
  PaymentMethod: string;
}

export interface CheckWaybillEditPossiblePayload {
  IntDocNumber: string;
}

checkWaybillEditPossible(payload: CheckWaybillEditPossiblePayload): Promise<WaybillEditPossibility>;
```

```ts
/** Only the 3 flag-gated fields Nova Poshta's own create call actually accepts (spec.md §3
 *  non-goal, 2-SDK-confirmed: platx's SaveChangeEWReq, sirkostya009's ChangeEWRequest) — the other
 *  8 Can... flags have no corresponding field here regardless of what checkWaybillEditPossible just
 *  reported (AC-16). OrderType: "orderChangeEW" is set internally. */
export interface CreateWaybillEditPayload {
  IntDocNumber: string;
  PaymentMethod: PaymentMethod;
  SenderContactName: string;
  SenderPhone: string;
  Recipient: string;
  RecipientContactName: string;
  RecipientPhone: string;
  PayerType: string;
}

export interface SavedWaybillEditOrder {
  Number: string;
  Ref: string;
}

createWaybillEdit(payload: CreateWaybillEditPayload): Promise<SavedWaybillEditOrder>;
```

```ts
export interface ChangeEWOrderListItem {
  OrderRef: string;
  OrderNumber: string;
  OrderStatus: string;
  DocumentNumber: string;
  DateTime: string;
  BeforeChangeSenderCounterparty: string;
  AfterChangeChangeSenderCounterparty: string; // wire's own name — not a typo in this contract (spec.md §1 row 17)
  Cost: string;
  BeforeChangeSenderPhone: string;
  AfterChangeSenderPhone: string;
}

getChangeEWOrdersList(filters?: OrderListFilters): Promise<ChangeEWOrderListItem[]>;
```

### 3.4 `deleteAdditionalServiceOrder` — one method, all three order types

```ts
/** AC-18/AC-19: works across return, redirect, and waybill-edit Refs alike, since Nova Poshta's own
 *  delete does. The "Accepted"-only status gate is confirmed specifically for waybill-edit orders
 *  (spec.md §1 decision override) — the system performs no client-side status check regardless of
 *  order type. */
export interface DeleteAdditionalServiceOrderPayload {
  Ref: string;
}

export interface DeletedAdditionalServiceOrder {
  Number: string;
}

deleteAdditionalServiceOrder(
  payload: DeleteAdditionalServiceOrderPayload,
): Promise<DeletedAdditionalServiceOrder>;
```

### 3.5 `createReturnIfPossible` — convenience

```ts
/** US-13, AC-20, sad.md §4 decision 5 / Flow 1. Composes this module's own checkReturnPossible +
 *  createReturn internally — never a separate lookup path. Takes the first returned address option's
 *  Ref, uses it as ReturnAddressRef (see this file's header for the open-risk tracking on that
 *  mapping). An empty option list is treated as ineligible: throws this module's own
 *  NovaPoshtaApiError ("no return address available for this waybill") without attempting a create
 *  call — a check-declined response throws Nova Poshta's own error the same way. */
export type CreateReturnIfPossiblePayload = Omit<
  CreateReturnToSenderAddressPayload,
  "Destination" | "ReturnAddressRef"
>;

createReturnIfPossible(payload: CreateReturnIfPossiblePayload): Promise<SavedReturnOrder>;
```

## 4. `AdditionalServiceModule` interface (assembled)

```ts
export interface AdditionalServiceModule {
  checkReturnPossible(payload: CheckReturnPossiblePayload): Promise<ReturnAddressOption[]>;
  checkReturnEditPossible(payload: CheckReturnEditPossiblePayload): Promise<CheckReturnEditPossibleResult>;
  createReturn(payload: CreateReturnPayload): Promise<SavedReturnOrder>;
  calculateReturn(payload: CreateReturnPayload): Promise<OrderPricingEstimate>;
  updateReturn(payload: UpdateReturnPayload): Promise<Record<string, unknown>>;
  getReturnOrdersList(filters?: OrderListFilters): Promise<ReturnOrderListItem[]>;
  getReturnReasons(): Promise<ReturnReason[]>;
  getReturnReasonsSubtypes(filters?: ReturnReasonSubtypeFilters): Promise<ReturnReasonSubtype[]>;
  checkRedirectPossible(payload: CheckRedirectPossiblePayload): Promise<RedirectPossibility>;
  checkRedirectEditPossible(
    payload: CheckRedirectEditPossiblePayload,
  ): Promise<Partial<RedirectPossibility>>;
  createRedirect(payload: CreateRedirectPayload): Promise<SavedRedirectOrder>;
  calculateRedirect(payload: CreateRedirectPayload): Promise<OrderPricingEstimate>;
  updateRedirect(payload: UpdateRedirectPayload): Promise<Record<string, unknown>>;
  getRedirectionOrdersList(filters?: OrderListFilters): Promise<RedirectOrderListItem[]>;
  checkWaybillEditPossible(payload: CheckWaybillEditPossiblePayload): Promise<WaybillEditPossibility>;
  createWaybillEdit(payload: CreateWaybillEditPayload): Promise<SavedWaybillEditOrder>;
  getChangeEWOrdersList(filters?: OrderListFilters): Promise<ChangeEWOrderListItem[]>;
  deleteAdditionalServiceOrder(
    payload: DeleteAdditionalServiceOrderPayload,
  ): Promise<DeletedAdditionalServiceOrder>;
  createReturnIfPossible(payload: CreateReturnIfPossiblePayload): Promise<SavedReturnOrder>;
}
```

## 5. Wire mapping (TypeScript method → `modelName` / `calledMethod`)

Every method's `modelName` is `AdditionalServiceGeneral` (spec.md §1 ¶2 decision override).

| Method | `calledMethod` (+ `OrderType`) | Transport |
|---|---|---|
| `checkReturnPossible` | `CheckPossibilityCreateReturn` | `client.request()` |
| `checkReturnEditPossible` | `CheckPossibilityCreateReturn` | `client.requestEnvelope()` (ADR-0001) |
| `createReturn` | `save` / `orderCargoReturn` | `client.requestFirst()` (ADR-0002) |
| `calculateReturn` | `save` / `orderCargoReturn` + `OnlyGetPricing:"1"` | `client.requestFirst()` |
| `updateReturn` | `update` | `client.requestFirst()` |
| `getReturnOrdersList` | `getReturnOrdersList` | `client.request()` |
| `getReturnReasons` | `getReturnReasons` | `client.request()` |
| `getReturnReasonsSubtypes` | `getReturnReasonsSubtypes` | `client.request()` |
| `checkRedirectPossible` | `checkPossibilityForRedirecting` | `client.requestFirst()` |
| `checkRedirectEditPossible` | `checkPossibilityForRedirecting` | `client.requestFirst()` |
| `createRedirect` | `save` / `orderRedirecting` | `client.requestFirst()` |
| `calculateRedirect` | `save` / `orderRedirecting` + `OnlyGetPricing:"1"` | `client.requestFirst()` |
| `updateRedirect` | `update` | `client.requestFirst()` |
| `getRedirectionOrdersList` | `getRedirectionOrdersList` | `client.request()` |
| `checkWaybillEditPossible` | `CheckPossibilityChangeEW` | `client.requestFirst()` |
| `createWaybillEdit` | `save` / `orderChangeEW` | `client.requestFirst()` |
| `getChangeEWOrdersList` | `getChangeEWOrdersList` | `client.request()` |
| `deleteAdditionalServiceOrder` | `delete` | `client.requestFirst()` |
| `createReturnIfPossible` | *(internally: `CheckPossibilityCreateReturn` then `save`/`orderCargoReturn`)* | composes `checkReturnPossible` + `createReturn` |

## 6. Error contract (derived from `sad.md` §6 `alt` branches)

| Condition (sad.md §6 branch) | AC | Behavior |
|---|---|---|
| Network/transport failure (timeout, dropped connection, non-JSON body) | AC-22 | throws `NovaPoshtaApiError` |
| Declined at the envelope level (`success: false`), any method | AC-21, AC-23 | throws `NovaPoshtaApiError`, Nova Poshta's own message passed through |
| Envelope-level malformation (`data` missing or not an array) | AC-21 | throws `NovaPoshtaApiError` — no per-field body-shape validation beyond this |
| `checkReturnPossible`/`createReturn`/`calculateReturn` called by the shipment's recipient, not its sender | AC-02 | Nova Poshta declines → throws `NovaPoshtaApiError`; no client-side role check |
| `updateReturn` against a return whose status is no longer "Accepted" | AC-07 | Nova Poshta declines → throws `NovaPoshtaApiError`; no client-side status check |
| `updateRedirect` rejects a field the caller's inferred role (sender vs. recipient) may not change | AC-13 | throws `NovaPoshtaApiError` for the rejected subset; no client-side field-permission check |
| `createWaybillEdit` submits a change to a field `checkWaybillEditPossible` just reported as not currently changeable | AC-16 | Nova Poshta's own decline/partial/full-acceptance outcome is reported as-is — no client-side gating; a decline throws `NovaPoshtaApiError`, a partial/full acceptance resolves normally |
| `deleteAdditionalServiceOrder` against a waybill-edit order whose status is not "Accepted" | AC-19 | Nova Poshta declines → throws `NovaPoshtaApiError`; no client-side status check |
| `createReturnIfPossible`'s eligibility check declines, or returns zero address options | AC-20 | throws `NovaPoshtaApiError` (Nova Poshta's own message on a decline; this module's own "no return address available for this waybill" message on an empty list) — no `createReturn` call attempted either way |
| `createReturnIfPossible`'s create call declines after a successful check (including a wrong `ReturnAddressRef` mapping — see this file's header) | AC-20 | throws `NovaPoshtaApiError` — fails safely, never a corrupted or silently-wrong order |
| Any other read/check/create/calculate success, `data` is array-shaped | AC-01, AC-03, AC-05, AC-06, AC-08, AC-09, AC-11, AC-12, AC-14, AC-15, AC-17, AC-18 | resolves the typed result |

No `NovaPoshtaApiError` subclassing (project convention, `CLAUDE.md`; `sad.md` §2). All 19 methods
share this one error contract — the table above only calls out where a *specific* decline reason is
independently confirmed; every method also carries the generic AC-21/AC-22/AC-23 rows implicitly.

## 7. Non-runtime, type-level contract clauses

These `sad.md` §6 marks as non-runtime (N/A in its coverage table) but that still bind this contract:

- **AC-04 (discriminant safety):** enforced entirely by §3.1's `CreateReturnPayload` union — a
  compile-time guard, not a runtime check. It verifies the payload's own internal consistency only; it
  cannot verify a `ReturnAddressRef`/settlement/warehouse Ref actually resolves to something real
  (that surfaces as AC-21).
- **AC-10 (cross-context trust boundary):** `createRedirect`'s `Recipient` is a counterparty `Ref`
  obtained from the `counterparty` module — passed through as a plain `string`, no ownership or
  existence check of this module's own.
- **AC-13 (role inferred by key, not by field):** neither `updateRedirect` nor any other method in this
  module's surface carries a sender-vs-recipient role parameter — Nova Poshta infers it solely from
  which API key placed the call (2-SDK-confirmed, `spec.md` §1).
- **AC-16 (informational-only flags):** `WaybillEditPossibility`'s 11 `Can...` flags are read-only
  data; nothing in this module's code paths branches on them before calling `createWaybillEdit`.
- **No branded `Ref` type** (`spec.md` §3 non-goal, matches `scan-sheet`'s precedent): every
  `Ref`/`OrderRef`/`IntDocNumber` above is a plain `string` — nothing prevents passing a return `Ref`
  where a redirect `Ref` was intended; accepted risk, documented in `sad.md` §6.1/§11.

## 8. Out of scope (per `spec.md` §3)

- Client-side validation of `checkWaybillEditPossible`'s 11 `Can...` flags before `createWaybillEdit`.
- Automatic reconciliation, retry, or rollback for `createReturnIfPossible`'s two-call gap.
- Enforcing that an `updateReturn`/`updateRedirect` payload carries forward every previously-set field
  — `update` is a full-replace call on the wire; an omitted field is not carried forward.
- A typed `orderTermExtension` (storage-term extension) write method — single, self-admittedly
  reverse-engineered source only.
- A shared, branded `Ref` type distinguishing a return/redirect/waybill-edit order's `Ref` from any
  other module's.
- Exposing the 8 of `checkWaybillEditPossible`'s 11 `Can...` flags that have no corresponding field on
  `createWaybillEdit` — Nova Poshta's own create call has no field for them, regardless of scope.
- A typed `updateWaybillEdit` method — no `update` capability documented for waybill-edit (ChangeEW)
  orders; amending one means delete-then-recreate (`spec.md` §1 decision override, §3, §6.1).

## 9. Convenience methods

**`createReturnIfPossible`** (§3.5) is the only convenience method this feature ships — scoped to the
plain-return case only (US-13). No equivalent exists for redirect or waybill-edit; `spec.md` §1's
19-method surface is exactly the 18 raw + this one convenience, no other deferred convenience set.

## 10. Field-origins summary

See `api-sync-report.md` for the full per-field table. In short: every field in §3 traces to
`spec.md` §1's method table (row cited in each field's origin), itself sourced from Nova Poshta's own
official documentation captured 2026-09-23 and cross-checked against 5 independent SDKs. Six points
are carried forward as genuinely open rather than guessed:

1. `ReturnAddressOption.Ref` ↔ `CreateReturnToSenderAddressPayload.ReturnAddressRef` — same value?
   (this file's header; `spec.md` §8 row 1, `sad.md` §11 row 1)
2. `CheckReturnEditPossiblePayload.Address` — exact shape (`spec.md` §8 OQ-4)
3. `CheckRedirectEditPossiblePayload`'s full field list (`spec.md` §8 OQ-4)
4. `UpdateReturnPayload`/`UpdateRedirectPayload`'s literal `Ref` field name, and both methods' exact
   response shape (`spec.md` §1 naming note, §8 OQ-5)
5. `CreateRedirectPayload.ServiceType`'s enum values (not independently re-sourced for this module)
6. Whether a waybill-edit order genuinely has no `update` capability (`spec.md` §8 row 2)

All six are typed defensively (loosely-typed fields, `Record<string, unknown>` responses, or plain
`string` in place of a false-precision enum) per `sad.md` §4 decision 6 — never silently guessed, never
blocking the whole feature.
