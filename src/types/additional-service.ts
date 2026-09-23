/** Independent of internet-document's PaymentMethod — this module defines its own copy rather than
 *  importing across modules, matching sad.md §5's "additional-service does not call internet-document
 *  at runtime" boundary and CLAUDE.md's one-folder-per-model convention. Both members confirmed by
 *  AdditionalServiceGeneral's own docs: the field-description column reads "Форма розрахунку
 *  (Cash/NonCash)" verbatim on the return-save, redirect-save, and redirect-calculate pages alike
 *  (spec.md §1, 2026-09-23 round-4 capture) — an explicit enumeration, not an inferred single example. */
export type PaymentMethod = "Cash" | "NonCash";

/** sad.md §4 decision 4, AC-04: TS-only discriminant on createReturn's destination-variant union —
 *  no counterpart on Nova Poshta's wire `save` payload. Stripped by the module before the request is
 *  sent; OrderType: "orderCargoReturn" is set internally, never caller-settable. */
export type ReturnDestination = "SenderAddress" | "NewAddress" | "NewWarehouse";

// --- 3.1 Return group ---

export interface CheckReturnPossiblePayload {
  Number: string; // waybill IntDocNumber
}

export interface ReturnAddressOption {
  Ref: string; // official docs' own `save`/orderCargoReturn example uses this exact field name as
               // ReturnAddressRef's value source (spec.md §1 official-docs quote, 2026-09-23)
  NonCash: boolean; // official docs' own example returns a JSON boolean here (not a "0"/"1" string)
  City: string;
  Counterparty: string;
  ContactPerson: string;
  Address: string;
  Phone: string;
}

/** sad.md §5's asymmetry note + AC-06: Address is confirmed a plain string by official docs' own
 *  edit-check example (`"Address": "м. Київ, площа Харківська, 10"`, spec.md §1, 2026-09-23). */
export interface CheckReturnEditPossiblePayload {
  Ref: string; // the existing return request's own Ref
  Address: string;
}

/** Fields confirmed verbatim by official docs' edit-check response example (spec.md §1,
 *  2026-09-23) — same shape as ReturnAddressOption, plus the discriminant Type. `Type` is widened to
 *  `string` rather than a closed 2-member union: the one response example that sources it shows both
 *  values together, but nothing in the docs states that's the complete set (review round-4 finding —
 *  same false-precision risk this module already avoids for CreateRedirectPayload's pre-round-4
 *  ServiceType). */
export interface ReturnEditOption {
  Type: string;
  NonCash: boolean;
  City: string;
  Counterparty: string;
  ContactPerson: string;
  Address: string;
  Phone: string;
  Ref: string;
}

export interface ReturnEditInfo {
  PayerTypeDefault: string;
  Number: string;
}

/** Assembled by this module from requestEnvelope()'s data + info fields (ADR-0001) — never Nova
 *  Poshta's raw envelope shape as-is; info is narrowed here, not by the client. info is optional:
 *  official docs' own envelope wraps it in a single-element array (`info: [{...}]`, spec.md §1,
 *  2026-09-23), which this module unwraps — an envelope that omits `info` altogether resolves
 *  `undefined` here rather than a forced, possibly-wrong cast. */
export interface CheckReturnEditPossibleResult {
  options: ReturnEditOption[];
  info?: ReturnEditInfo;
}

/** AC-04, sad.md §4 decision 4: one discriminated union, one function — mixing a second variant's
 *  fields with the wrong Destination tag is a compile-time error even when the payload is built
 *  field-by-field in a variable. Destination is stripped before the wire call; OrderType:
 *  "orderCargoReturn" is set internally. Not exported — internal building block for the three
 *  Destination-discriminated variants below (public-api.md §3.1). */
interface CreateReturnCommonFields {
  IntDocNumber: string;
  PaymentMethod: PaymentMethod;
  Reason: string; // Ref from getReturnReasons()
  SubtypeReason?: string; // Ref from getReturnReasonsSubtypes()
  Note?: string;
}

/** The `?: never` fields below each variant's own aren't wire fields — they're the AC-04 cross-guard
 *  (review round-3 finding): without them, an un-annotated variable assembled with fields from more
 *  than one variant still structurally satisfies whichever variant its required fields happen to
 *  match (TS only excess-property-checks fresh object literals, not variables), so a mixed payload
 *  passed straight into createReturn/calculateReturn compiled clean. Declaring every other variant's
 *  own field `never` here means a real value for it makes the object satisfy NO variant, closing that
 *  gap for a field-by-field-assembled variable too, not just a fresh literal. */
export interface CreateReturnToSenderAddressPayload extends CreateReturnCommonFields {
  Destination: "SenderAddress";
  ReturnAddressRef: string; // field name confirmed by official docs' own save/orderCargoReturn
                            // example (spec.md §1, 2026-09-23); see contract header for the naming note
  RecipientSettlement?: never;
  RecipientSettlementStreet?: never;
  BuildingNumber?: never;
  NoteAddressRecipient?: never;
  RecipientWarehouse?: never;
}

export interface CreateReturnToNewAddressPayload extends CreateReturnCommonFields {
  Destination: "NewAddress";
  RecipientSettlement: string;
  RecipientSettlementStreet: string;
  BuildingNumber: string;
  NoteAddressRecipient?: string;
  ReturnAddressRef?: never;
  RecipientWarehouse?: never;
}

export interface CreateReturnToNewWarehousePayload extends CreateReturnCommonFields {
  Destination: "NewWarehouse";
  RecipientWarehouse: string;
  ReturnAddressRef?: never;
  RecipientSettlement?: never;
  RecipientSettlementStreet?: never;
  BuildingNumber?: never;
  NoteAddressRecipient?: never;
}

export type CreateReturnPayload =
  | CreateReturnToSenderAddressPayload
  | CreateReturnToNewAddressPayload
  | CreateReturnToNewWarehousePayload;

/** {Number, Ref} confirmed verbatim by official docs' own save/orderCargoReturn response example
 *  (spec.md §1, 2026-09-23) — resolves review round-3's finding that all three `save` result shapes
 *  (return/redirect/waybill-edit) shipped unsourced. */
export interface SavedReturnOrder {
  Number: string;
  Ref: string;
}

export interface OrderPricingEstimate {
  Pricing: {
    // per-service cost breakdown — confirmed by official docs' own calculateReturn/calculateRedirect
    // examples (spec.md §1, 2026-09-23)
    Services: { Service: string; Cost: number }[];
    // official docs' own return-calculate AND redirect-calculate examples both show an unquoted JSON
    // number here (0) — confirmed by two independently-fetched pages (spec.md §1, 2026-09-23 round-4
    // capture). A prior round claimed a conflicting quoted "5.52" string from an update-recalculation
    // example; no such quote actually exists anywhere in this spec (round-4 review finding) — that
    // response belongs to updateReturn/updateRedirect's own loosely-typed Record<string, unknown>
    // return value, never to this type, so there was never a genuine cross-source disagreement here.
    Total: number;
    FirstDayStorage: string; // official docs' own examples always show a datetime string here
                              // (e.g. "0000-00-00 00:00:00"), never a number
  };
  ScheduledDeliveryDate: string;
}

/** AC-06/AC-07: `update` IS confirmed a full-replace call on the wire (spec.md §3 non-goal, official
 *  docs' own examples) — matching internet-document's already-shipped `update` semantics; an omitted
 *  optional field here is not carried forward from the order's previous value. What's genuinely
 *  ambiguous is only the *response* shape ("updated order fields, or Pricing+ScheduledDeliveryDate
 *  when recalculating") — typed defensively rather than with false precision (§4 decision 6). Ref is
 *  confirmed by official docs' own update example (spec.md §1, 2026-09-23); OrderType is required by
 *  the same example and is set internally by this module (never a field on this public payload —
 *  matches createReturn's discriminant-stripping pattern). */
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

export interface OrderListFilters {
  Number?: string;
  Ref?: string;
  BeginDate?: string; // raw pass-through string, no client-side date parsing (sad.md §8 note)
  EndDate?: string;
  Page?: string; // official docs' own list examples send "1"/"50" quoted (spec.md §1, 2026-09-23) —
                 // was typed number, corrected; a numeric caller value would have wired through as
                 // JSON.stringify's unquoted number, not matching Nova Poshta's own documented shape
  Limit?: string;
}

/** All 11 fields, and getReturnOrdersList's own request filters, confirmed verbatim by official docs'
 *  own request+response example (spec.md §1, 2026-09-23) — resolves review round-3's finding that
 *  this whole method shipped unsourced. */
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

/** Confirmed verbatim by official docs' own getReturnReasons response example (spec.md §1,
 *  2026-09-23) — resolves review round-3's finding that this method shipped unsourced. */
export interface ReturnReason {
  Ref: string;
  Description: string;
}

export interface ReturnReasonSubtypeFilters {
  ReasonRef?: string;
}

/** Confirmed verbatim by official docs' own getReturnReasonsSubtypes request+response example
 *  (spec.md §1, 2026-09-23) — resolves review round-3's finding that this method shipped unsourced. */
export interface ReturnReasonSubtype {
  Ref: string;
  Description: string;
  ReasonRef: string;
}

// --- 3.2 Redirect group ---

export interface CheckRedirectPossiblePayload {
  Number: string;
}

/** sad.md §5's asymmetry note: unlike checkReturnPossible, this is one info record describing the
 *  redirect's current possibility, not a list of destination choices — requestFirst(), not
 *  request(). All 20 fields confirmed verbatim by official docs' own checkPossibilityForRedirecting
 *  request+response example (spec.md §1, 2026-09-23) — resolves review round-3's finding that this
 *  contract shipped with no genuine quote. */
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

/** Field list confirmed verbatim by official docs' own edit-check request example (spec.md §1,
 *  2026-09-23) — every field but OrderRef is optional, since a caller only supplies the ones being
 *  corrected. */
export interface CheckRedirectEditPossiblePayload {
  OrderRef: string;
  AddressDescription?: string;
  RecipientName?: string;
  PhoneSender?: string;
  StreetDescription?: string;
  PhoneRecipient?: string;
  BuildingNumber?: string;
  CityRecipient?: string;
  DocumentWeight?: string;
  SettlementRecipient?: string;
  SettlementType?: string;
  PayerType?: string;
  PaymentMethod?: string;
  CounterpartyRecipientRef?: string;
  WarehouseRef?: string;
}

/** No AC-04-equivalent discriminant guard exists for redirect (spec.md doesn't mandate one the way
 *  AC-04 mandates it for return) — every destination-related field stays optional on one flat
 *  interface; Nova Poshta's own response is the sole judge of a malformed combination. AC-10:
 *  Recipient is a counterparty Ref from the counterparty module, passed through unmodified — no
 *  ownership/existence check of this module's own. */
/** All 14 fields confirmed verbatim by official docs' own save/orderRedirecting request example
 *  (spec.md §1, 2026-09-23) — resolves review round-3's finding that this entire money-bearing
 *  request shipped with no genuine quote. */
export interface CreateRedirectPayload {
  IntDocNumber: string;
  PaymentMethod: PaymentMethod;
  Note?: string;
  Recipient: string; // counterparty Ref (AC-10, cross-context trust boundary)
  RecipientContactName: string;
  RecipientPhone: string;
  PayerType: string;
  Customer?: string;
  // full 4-value enum confirmed by AdditionalServiceGeneral's own redirect-calculate page field
  // table: "Тип послуги (DoorsWarehouse, WarehouseWarehouse, WarehouseDoors, DoorsDoors)" — an
  // explicit enumeration, not one example value (spec.md §1, 2026-09-23 round-4 capture; closes the
  // open value-set gap public-api.md §10 item 5 previously tracked).
  ServiceType?: "DoorsWarehouse" | "WarehouseWarehouse" | "WarehouseDoors" | "DoorsDoors";
  RecipientSettlement?: string;
  RecipientSettlementStreet?: string;
  BuildingNumber?: string;
  NoteAddressRecipient?: string;
  RecipientWarehouse?: string;
}

/** {Number, Ref} confirmed verbatim by official docs' own save/orderRedirecting response example
 *  (spec.md §1, 2026-09-23). */
export interface SavedRedirectOrder {
  Number: string;
  Ref: string;
}

/** AC-12/AC-13: Ref is the same order updateRedirect addresses (see contract §1 naming note —
 *  OrderRef on the check, Ref on the update; both confirmed by official docs, spec.md §1,
 *  2026-09-23). No role field — Nova Poshta infers sender-vs-recipient solely from the calling key
 *  (AC-13, 2-SDK-confirmed) and may silently narrow which fields this update actually applies; the
 *  response is typed defensively for the same reason updateReturn's is (§4 decision 6). OrderType is
 *  required by official docs' own example and is set internally by this module (never a field on
 *  this public payload). All 15 optional fields below confirmed verbatim by official docs' own
 *  update/redirect request+response example (spec.md §1, 2026-09-23) — resolves review round-3's
 *  finding that this field list was cited circularly (a prior "docs example" quote only asserted it
 *  "matches this module's already-documented field list", never quoting the fields themselves). This
 *  also confirms the naming asymmetry against CreateRedirectPayload is real, not a bug: the wire
 *  genuinely uses `RecipientSettlement` on create and `SettlementRecipient`+`CityRecipient` on update. */
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
  // same field, same domain as CreateRedirectPayload.ServiceType — the update example itself only
  // shows the one already-confirmed value ("WarehouseWarehouse"), but the create/calculate page's
  // explicit 4-value enumeration is treated as authoritative for this shared wire concept too, the
  // same way this module already carries PaymentMethod's confirmed enum across create/update.
  ServiceType?: "DoorsWarehouse" | "WarehouseWarehouse" | "WarehouseDoors" | "DoorsDoors";
  PayerType?: string;
}

export interface RedirectOrderListItem {
  OrderRef: string;
  OrderNumber: string;
  DateTime: string;
  DocumentNumber: string; // present in official docs' own example response (spec.md §1, 2026-09-23)
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

// --- 3.3 Waybill-edit group ---

/** AC-16: the 11 Can... flags are informational only — the module performs no client-side gating
 *  against them when createWaybillEdit is called next. All 19 fields (11 flags + 8 context fields)
 *  confirmed verbatim by official docs' own CheckPossibilityChangeEW response example (spec.md §1,
 *  2026-09-23) — resolves review round-3's finding that this whole response shipped unsourced. 8 of
 *  the 11 flags have no corresponding field on createWaybillEdit at all (spec.md §3 non-goal, now also
 *  confirmed by the same official docs' save/orderChangeEW request example) — kept on this type
 *  anyway since Nova Poshta returns them, just unconsumed by createWaybillEdit's own payload. */
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

/** All 8 fields confirmed verbatim by official docs' own "Змінити дані" (save/orderChangeEW) page —
 *  a page that exists live but isn't linked from AdditionalServiceGeneral's own site navigation,
 *  found via the exact URL platx/go-nova-poshta's source comments cite for this method, and fetched
 *  directly (spec.md §1, 2026-09-23 round-4 capture). A round-3 fix had claimed this same field list
 *  was "confirmed verbatim" by a docs quote that, on review-round-4 re-inspection, turned out to be a
 *  fabricated placeholder (every value was a bare "...", unlike every genuine capture in this spec) —
 *  this replaces that citation with a real one. The genuine quote also disproves the round-3 claim
 *  that two SDKs "agree" on this shape: sirkostya009/go-novapost has no create/save method for
 *  ChangeEW at all (the struct previously cited as its agreement, ChangeEWRequest, is actually that
 *  SDK's list-filter struct for getChangeEWOrdersList, unrelated to this request); only platx has one,
 *  and its own test fixture for it is independently buggy (sends "OrderType": "orderCargoReturn"
 *  instead of "orderChangeEW", and includes Reason/SubtypeReason fields absent from the real docs
 *  page) — neither SDK was ever a reliable source for this shape. The other 8 Can... flags have no
 *  corresponding field here regardless of what checkWaybillEditPossible just reported (AC-16).
 *  OrderType: "orderChangeEW" is set internally. */
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

/** {Number, Ref} confirmed verbatim by official docs' own save/orderChangeEW response example
 *  (spec.md §1, 2026-09-23). */
export interface SavedWaybillEditOrder {
  Number: string;
  Ref: string;
}

/** All 10 fields confirmed verbatim by official docs' own getChangeEWOrdersList response example
 *  (spec.md §1, 2026-09-23) — resolves review round-3's finding that spec.md asserted this shape
 *  "confirmed verbatim" without an actual quote behind that claim. */
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

// --- 3.4 deleteAdditionalServiceOrder ---

/** AC-18/AC-19: works across return, redirect, and waybill-edit Refs alike, since Nova Poshta's own
 *  delete does. The "Accepted"-only status gate is confirmed specifically for waybill-edit orders
 *  (spec.md §1 decision override) — the system performs no client-side status check regardless of
 *  order type. */
export interface DeleteAdditionalServiceOrderPayload {
  Ref: string;
}

/** Confirmed verbatim by official docs' own `delete` request+response example (spec.md §1,
 *  2026-09-23) — resolves review round-3's finding that only the status-gate sentence, not the
 *  schema itself, was previously quoted. The response is `{Number}` only, no `Ref` — matches this
 *  type as originally shipped. */
export interface DeletedAdditionalServiceOrder {
  Number: string;
}

// --- 3.5 createReturnIfPossible ---

/** US-13, AC-20, sad.md §4 decision 5 / Flow 1. Composes this module's own checkReturnPossible +
 *  createReturn internally — never a separate lookup path. Takes the first returned address option's
 *  Ref, uses it as ReturnAddressRef (confirmed by official docs' own save/orderCargoReturn example,
 *  spec.md §1, 2026-09-23). An empty option list is treated as ineligible: throws this module's own
 *  NovaPoshtaApiError ("no return address available for this waybill") without attempting a create
 *  call — a check-declined response throws Nova Poshta's own error the same way. */
export type CreateReturnIfPossiblePayload = Omit<
  CreateReturnToSenderAddressPayload,
  "Destination" | "ReturnAddressRef"
>;
