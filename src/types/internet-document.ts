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

interface SaveBase {
  PayerType: PayerType;
  PaymentMethod: PaymentMethod;
  DateTime: string;
  Weight: number;
  SeatsAmount: number;
  Description: string;
  Cost: number;
  CitySender: string;
  Sender: string;
  SenderAddress: string;
  ContactSender: string;
  SendersPhone: string;
  CityRecipient: string;
  Recipient: string;
  ContactRecipient: string;
  RecipientsPhone: string;
  BackwardDeliveryData?: BackwardDeliveryData;
}

/** ADR-0001 axis 1 (ServiceType leg): one hand-written variant per delivery method, each requiring
 *  only the location fields its own leg needs. */
export interface SaveWarehouseToWarehousePayload extends SaveBase {
  ServiceType: "WarehouseWarehouse";
  RecipientAddress: string; // warehouse Ref
}
export interface SaveWarehouseToDoorsPayload extends SaveBase {
  ServiceType: "WarehouseDoors";
  RecipientCityName: string;
  RecipientArea: string;
  RecipientAddressName: string;
  RecipientHouse: string;
  RecipientFlat?: string;
}
export interface SaveDoorsToWarehousePayload extends SaveBase {
  ServiceType: "DoorsWarehouse";
  RecipientAddress: string; // warehouse Ref
}
export interface SaveDoorsToDoorsPayload extends SaveBase {
  ServiceType: "DoorsDoors";
  RecipientCityName: string;
  RecipientArea: string;
  RecipientAddressName: string;
  RecipientHouse: string;
  RecipientFlat?: string;
}

type SaveByServiceType =
  | SaveWarehouseToWarehousePayload
  | SaveWarehouseToDoorsPayload
  | SaveDoorsToWarehousePayload
  | SaveDoorsToDoorsPayload;

/** ADR-0001 axis 2 (CargoType classification), intersected with the ServiceType leg so the compiler
 *  distributes both axes into every valid combination automatically — never one flat shape with every
 *  field merely optional. */
interface CargoTypeDetail {
  CargoType: CargoType;
}

export type SaveInternetDocumentPayload = SaveByServiceType & CargoTypeDetail;

export interface SavedInternetDocument {
  Ref: string;
  CostOnSite: number;
  EstimatedDeliveryDate: string;
  IntDocNumber: string;
  TypeDocument: string;
}

/** AC-06: full-replace — every field the chosen combination's Save payload declares becomes
 *  mandatory, including BackwardDeliveryData; an omitted BackwardDeliveryData clears any
 *  previously-set cash-on-delivery instruction. */
export type UpdateInternetDocumentPayload = Required<SaveInternetDocumentPayload> & { Ref: string };

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
