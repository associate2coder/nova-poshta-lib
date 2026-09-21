/** 6 values, cross-checked against 2 independent, actively-maintained sources that agree
 *  (`platx/go-nova-poshta`'s `custom/enum/service_type.go`, and `shopanaio/carrier-api`'s
 *  `waybillService.ts`, which independently validates `DoorsPostomat`/`WarehousePostomat` with its
 *  own Postomat business rules) — corrects a 4-value under-count shipped in the original release
 *  (see ADR-0002's amendment log / spec.md §8 OQ-1). `save`/`update`'s discriminated payload
 *  (`SaveInternetDocumentPayload`) still models only the first 4 values as structural variants —
 *  the Postomat pair's own required-field shape (a seat/dimensions block, per the one source that
 *  models it) has no second confirming source yet, so it is not invented here; `getDocumentPrice`,
 *  `getDocumentDeliveryDate`, and `getDocumentList` already accept all 6, since they take
 *  `ServiceType` as a plain field with no leg-shape dependency. */
export type ServiceType =
  | "WarehouseWarehouse"
  | "WarehouseDoors"
  | "DoorsWarehouse"
  | "DoorsDoors"
  | "WarehousePostomat"
  | "DoorsPostomat";

/** 8 values, per `platx/go-nova-poshta`'s `custom/enum/cargo_type.go` — the only source that
 *  enumerates `CargoType` at all (no second source contradicts it; the others treat it as an
 *  opaque string). Unlike `ServiceType`'s Postomat pair, widening this list requires no new leg
 *  shape: ADR-0004 already established `CargoType` as a plain discriminant field with no
 *  structural field variance, so every one of these 8 values slots into the existing
 *  `SaveCommonFields`/`UpdateCommonFields.CargoType` field unchanged. */
export type CargoType =
  | "Parcel"
  | "Cargo"
  | "Documents"
  | "Pallet"
  | "TiresWheels"
  | "Money"
  | "SignedDocuments"
  | "Trays";

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

/** ADR-0005 (supersedes ADR-0002's batch-call design): exactly one waybill Ref per `delete` call —
 *  3 of 4 cross-checked sources type the wire `DocumentRefs` field as accepting a single value
 *  (`platx/go-nova-poshta`'s `types.UUID`, `maddsua/NovaPoshtaREST`'s `string`, `serj1chen`'s PHP
 *  SDK wrapping one `Ref` into a 1-element array client-side); no source demonstrates a genuine
 *  multi-Ref call succeeding. Use `deleteBatch` for more than one Ref. */
export interface DeleteInternetDocumentPayload {
  Ref: string;
}

/** ADR-0005: submits `Documents` as this module's own sequential loop over single-Ref `delete`
 *  calls — never a single server-side batch call, which no cross-checked source confirms Nova
 *  Poshta's `delete` endpoint actually supports. */
export interface DeleteBatchInternetDocumentPayload {
  Documents: string[]; // one or more waybill Refs
}

/** One outcome per Ref, reconciled defensively by this module — a Ref missing from Nova Poshta's
 *  confirmed-removed set is represented as Removed:false, never silently dropped. `delete` resolves
 *  exactly one of these; `deleteBatch` resolves one per submitted Ref, in submission order. */
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
 *  a construct-then-verify helper, never client.request()'s envelope unwrap.
 *
 *  **PROVISIONAL — the underlying URL-construction mechanism is contested, not confirmed:** a
 *  fourth cross-checked source (`lis-dev/nova-poshta-api-2`) builds the same link a different way
 *  (all Refs comma-joined into one `orders[]/` segment, lowercase `type`, no `Copies` segment at
 *  all) than the `serj1chen` SDK this module's implementation follows (repeated `orders[]/<ref>`
 *  segments, capitalized `Type`). That same source's own live-hitting test suite also proves
 *  `printDocument`/`printMarkings` are reachable as *plain* enveloped `calledMethod` calls (a bogus
 *  Ref returns a real Nova Poshta error code through the normal JSON envelope) — a path this
 *  module's `ADR-0003` never attempts. Neither SDK's own author verified their URL-construction
 *  shortcut against a live resolved link. This module's shipped behavior (live HEAD/GET-verified
 *  construction) is unchanged pending a definitive source, but AC-11/AC-12/AC-13 should be read as
 *  provisional, not confirmed happy-path, until one of the two mechanisms is confirmed against a
 *  live API key or Nova Poshta's own documentation — see spec.md §8 OQ-1. */
export interface PrintLinkPayload {
  Documents: string[]; // one or more waybill Refs
  Type?: "Pdf" | "Html";
  /** "fourfold" repeats each Ref's URL segment twice; "double" (and omitting this field) are
   *  equivalent — neither adds a distinct URL segment of its own (confirmed against
   *  serj1chen/nova-poshta-sdk-php's getPrintLink() implementation, not just its constants). */
  Copies?: "double" | "fourfold";
}
