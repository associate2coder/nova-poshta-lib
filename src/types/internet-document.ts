export type ServiceType = "WarehouseWarehouse" | "WarehouseDoors" | "DoorsWarehouse" | "DoorsDoors";

export type CargoType = "Parcel" | "Cargo" | "Documents" | "Pallet";

export type PayerType = "Sender" | "Recipient" | "ThirdPerson";
export type PaymentMethod = "Cash" | "NonCash";

export interface BackwardDeliveryData {
  PayerType: PayerType;
  CargoType: "Money" | "Documents";
  RedeliveryString?: string;
  Amount?: number;
}

interface SaveCommonFields {
  PayerType: PayerType;
  PaymentMethod: PaymentMethod;
  DateTime: string;
  Weight: number;
  SeatsAmount: number;
  Description: string;
  Cost: number;
  CitySender: string;
  Sender: string;
  ContactSender: string;
  SendersPhone: string;
  CityRecipient: string;
  Recipient: string;
  ContactRecipient: string;
  RecipientsPhone: string;
  /** ADR-0004: a plain discriminant field, not a per-CargoType structural variant — see ADR-0004,
   *  which supersedes ADR-0001's cargo axis (no cross-checked source confirms CargoType varies the
   *  required field set; only the ServiceType leg below does, per AC-02). */
  CargoType: CargoType;
  BackwardDeliveryData?: BackwardDeliveryData;
}

/** Warehouse-ending leg: the location is a warehouse Ref, shared shape for sender and recipient. */
interface SenderWarehouseLeg {
  SenderAddress: string; // warehouse Ref
}
interface RecipientWarehouseLeg {
  RecipientAddress: string; // warehouse Ref
}

/** Door-ending leg: the full street address, shared shape for sender and recipient. */
interface SenderDoorsLeg {
  SenderCityName: string;
  SenderArea: string;
  SenderAddressName: string;
  SenderHouse: string;
  SenderFlat?: string;
}
interface RecipientDoorsLeg {
  RecipientCityName: string;
  RecipientArea: string;
  RecipientAddressName: string;
  RecipientHouse: string;
  RecipientFlat?: string;
}

/** ADR-0001 (as narrowed by ADR-0004): one hand-written variant per delivery method, each requiring
 *  only the sender-leg AND recipient-leg location fields that leg needs (AC-02 covers both legs, not
 *  the recipient leg alone). */
export interface SaveWarehouseToWarehousePayload extends SaveCommonFields, SenderWarehouseLeg, RecipientWarehouseLeg {
  ServiceType: "WarehouseWarehouse";
}
export interface SaveWarehouseToDoorsPayload extends SaveCommonFields, SenderWarehouseLeg, RecipientDoorsLeg {
  ServiceType: "WarehouseDoors";
}
export interface SaveDoorsToWarehousePayload extends SaveCommonFields, SenderDoorsLeg, RecipientWarehouseLeg {
  ServiceType: "DoorsWarehouse";
}
export interface SaveDoorsToDoorsPayload extends SaveCommonFields, SenderDoorsLeg, RecipientDoorsLeg {
  ServiceType: "DoorsDoors";
}

export type SaveInternetDocumentPayload =
  | SaveWarehouseToWarehousePayload
  | SaveWarehouseToDoorsPayload
  | SaveDoorsToWarehousePayload
  | SaveDoorsToDoorsPayload;

export interface SavedInternetDocument {
  Ref: string;
  CostOnSite: number;
  EstimatedDeliveryDate: string;
  IntDocNumber: string;
  TypeDocument: string;
}

/** AC-06: full-replace — every field the chosen ServiceType leg's Save payload declares becomes
 *  mandatory here, except the fields that Save payload itself already declares optional
 *  (BackwardDeliveryData, and — for a Doors-ending leg — SenderFlat/RecipientFlat): each of these
 *  stays optional by design, and omitting it (or passing it as undefined) clears it — it is never
 *  carried forward from a previous version. Hand-written per ServiceType leg, mirroring
 *  `counterparty` ADR-0001's explicit-variants precedent, rather than a generic `Required<union>`
 *  wrapper (which would force every optional field, including BackwardDeliveryData, mandatory too
 *  and make AC-06's "omit to clear" case impossible to express). */
interface UpdateCommonFields {
  PayerType: PayerType;
  PaymentMethod: PaymentMethod;
  DateTime: string;
  Weight: number;
  SeatsAmount: number;
  Description: string;
  Cost: number;
  CitySender: string;
  Sender: string;
  ContactSender: string;
  SendersPhone: string;
  CityRecipient: string;
  Recipient: string;
  ContactRecipient: string;
  RecipientsPhone: string;
  CargoType: CargoType;
  BackwardDeliveryData?: BackwardDeliveryData;
  Ref: string;
}

export interface UpdateWarehouseToWarehousePayload
  extends UpdateCommonFields,
    SenderWarehouseLeg,
    RecipientWarehouseLeg {
  ServiceType: "WarehouseWarehouse";
}
export interface UpdateWarehouseToDoorsPayload extends UpdateCommonFields, SenderWarehouseLeg, RecipientDoorsLeg {
  ServiceType: "WarehouseDoors";
}
export interface UpdateDoorsToWarehousePayload extends UpdateCommonFields, SenderDoorsLeg, RecipientWarehouseLeg {
  ServiceType: "DoorsWarehouse";
}
export interface UpdateDoorsToDoorsPayload extends UpdateCommonFields, SenderDoorsLeg, RecipientDoorsLeg {
  ServiceType: "DoorsDoors";
}

export type UpdateInternetDocumentPayload =
  | UpdateWarehouseToWarehousePayload
  | UpdateWarehouseToDoorsPayload
  | UpdateDoorsToWarehousePayload
  | UpdateDoorsToDoorsPayload;

export interface DeleteInternetDocumentPayload {
  Documents: string[]; // one or more waybill Refs
}

/** ADR-0002: one entry per submitted Ref, reconciled defensively by this module — a Ref missing from
 *  Nova Poshta's confirmed-removed set is represented as Removed:false, never silently dropped. */
export interface DeletedInternetDocumentOutcome {
  Ref: string;
  Removed: boolean;
  Reason?: string;
}

export interface GetDocumentListFilters {
  DateTimeFrom?: string;
  DateTimeTo?: string;
  Page?: number;
}

export interface WaybillListItem {
  Ref: string;
  DateTime: string;
  IntDocNumber: string;
  Cost: number;
  CitySender: string;
  CityRecipient: string;
  CostOnSite: number;
  PayerType: PayerType;
  PaymentMethod: PaymentMethod;
  AfterpaymentOnGoodsCost: number;
  StateId: number;
  StateName: string;
  RejectionReason?: string;
}

export interface GetDocumentPricePayload {
  CitySender: string;
  CityRecipient: string;
  Weight: number;
  ServiceType: ServiceType;
  CargoType: CargoType;
  Cost: number;
  SeatsAmount: number;
}

export interface DocumentPriceEstimate {
  Cost: number;
  AssessedCost: number;
  CostRedelivery: number;
}

export interface GetDocumentDeliveryDatePayload {
  DateTime: string;
  ServiceType: ServiceType;
  CitySender: string;
  CityRecipient: string;
}

export interface DocumentDeliveryDateEstimate {
  Date: string;
  Timezone: string;
}

/** ADR-0003: printDocument/printMarkings bypass the shared core client entirely — this payload feeds
 *  a construct-then-verify helper, never client.request()'s envelope unwrap. */
export interface PrintLinkPayload {
  Documents: string[]; // one or more waybill Refs
  Type?: "Pdf" | "Html";
  Copies?: "double" | "fourfold";
}
