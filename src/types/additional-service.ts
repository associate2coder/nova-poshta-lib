/** Independent of internet-document's PaymentMethod (same 2 values, confirmed identically by
 *  spec.md §1's method table) — this module defines its own copy rather than importing across
 *  modules, matching sad.md §5's "additional-service does not call internet-document at runtime"
 *  boundary and CLAUDE.md's one-folder-per-model convention. */
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
  Ref: string; // sad.md §1 ¶4 — assumed identical to createReturn's ReturnAddressRef (open risk, see contract header)
  NonCash: string; // "0" | "1" wire flag — kept as raw string, not coerced to boolean (matches this
                    // library's BeginDate/EndDate convention: no client-side type coercion)
  City: string;
  Counterparty: string;
  ContactPerson: string;
  Address: string;
  Phone: string;
}

/** sad.md §5's asymmetry note + AC-06: Address's own shape is unconfirmed (spec.md §8 OQ-4) — a
 *  Ref string, or a structured object. Typed loosely rather than falsely precisely (§4 decision 6). */
export interface CheckReturnEditPossiblePayload {
  Ref: string; // the existing return request's own Ref
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

export interface CreateReturnToSenderAddressPayload extends CreateReturnCommonFields {
  Destination: "SenderAddress";
  ReturnAddressRef: string; // see contract header — open risk on whether this equals ReturnAddressOption.Ref
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

export interface OrderPricingEstimate {
  Pricing: {
    Services: unknown[]; // per-service cost breakdown — not independently sourced this session, kept opaque
    Total: number;
    FirstDayStorage: number;
  };
  ScheduledDeliveryDate: string;
}

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

export interface ReturnReason {
  Ref: string;
  Description: string;
}

export interface ReturnReasonSubtypeFilters {
  ReasonRef?: string;
}

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

/** spec.md §8 OQ-4: the exact address/recipient field list this dual-purpose wire method expects
 *  under the OrderRef+fields dispatch branch is unconfirmed — typed loosely (§4 decision 6). */
export interface CheckRedirectEditPossiblePayload {
  OrderRef: string;
  [key: string]: unknown; // unconfirmed address/recipient fields — spec.md §8 OQ-4
}

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
  ServiceType?: string; // unconfirmed enum for this module — see PaymentMethod/ReturnDestination note above
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

/** AC-12/AC-13: Ref is the same order updateRedirect addresses (see contract §1 naming note —
 *  OrderRef on the check, Ref on the update). No role field — Nova Poshta infers sender-vs-recipient
 *  solely from the calling key (AC-13, 2-SDK-confirmed) and may silently narrow which fields this
 *  update actually applies; the response is typed defensively for the same reason updateReturn's is
 *  (§4 decision 6). */
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

// --- 3.3 Waybill-edit group ---

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

export interface DeletedAdditionalServiceOrder {
  Number: string;
}

// --- 3.5 createReturnIfPossible ---

/** US-13, AC-20, sad.md §4 decision 5 / Flow 1. Composes this module's own checkReturnPossible +
 *  createReturn internally — never a separate lookup path. Takes the first returned address option's
 *  Ref, uses it as ReturnAddressRef (see this module's contract header for the open-risk tracking on
 *  that mapping). An empty option list is treated as ineligible: throws this module's own
 *  NovaPoshtaApiError ("no return address available for this waybill") without attempting a create
 *  call — a check-declined response throws Nova Poshta's own error the same way. */
export type CreateReturnIfPossiblePayload = Omit<
  CreateReturnToSenderAddressPayload,
  "Destination" | "ReturnAddressRef"
>;
