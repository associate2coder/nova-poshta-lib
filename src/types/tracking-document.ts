export interface TrackingDocumentFilter {
  DocumentNumber: string;
  Phone: string;
}

export interface GetStatusDocumentsPayload {
  Documents: TrackingDocumentFilter[];
}

/** ADR-0001: named to match CONTEXT.md's "tracking status" glossary term verbatim — distinct from
 *  common's unrelated DocumentStatus export (a reference-list lookup, different concept, different
 *  call). StatusCode is a plain number (AC-07) — forward-compatible by construction, no closed
 *  enum, no OpenEnum wrapper (sad.md §4 decision 6). Every field below is typed exhaustively — the
 *  118-field union of both re-fetched sources, not the intersection, per AC-07's "never dropped"
 *  guarantee (see contracts/api-sync-report.md for the field-origins table). */
export interface TrackingStatus {
  ActualDeliveryDate: string;
  AdditionalInformationEW: string;
  AdjustedDate: string;
  AfterpaymentOnGoodsCost: string;
  AmountPaid: string;
  AmountToPay: string;
  AnnouncedPrice: string;
  AviaDelivery: boolean | string;
  BackwardDeliverySubTypesActions: string;
  BackwardDeliverySubTypesServices: string;
  BarcodeRedBox: string;
  CalculatedWeight: string;
  CardMaskedNumber: string;
  CargoDescriptionString: string;
  CargoReturnRefusal: boolean | string;
  CargoType: string;
  CategoryOfWarehouse: string;
  CheckWeight: string;
  CheckWeightMethod: string;
  CityRecipient: string;
  CitySender: string;
  ClientBarcode: string;
  CounterpartyRecipientDescription: string;
  CounterpartySenderDescription: string;
  CounterpartySenderType: string;
  CounterpartyType: string;
  CreatedOnTheBasis: string;
  DateCreated: string;
  DateFirstDayStorage: string;
  DateMoving: string;
  DatePayedKeeping: string;
  DateReturnCargo: string;
  DateScan: string;
  DaysStorageCargo: string;
  DeliveryTimeframe: string;
  DocumentCost: string;
  DocumentWeight: string;
  ExpressWaybillAmountToPay: string;
  ExpressWaybillPaymentStatus: string;
  FactualWeight: string;
  FreeShipping: string;
  InternationalDeliveryType: string;
  InternetDocumentDescription: string;
  LastAmountReceivedCommissionGM: string;
  LastAmountTransferGM: string;
  LastCreatedOnTheBasisDateTime: string;
  LastCreatedOnTheBasisDocumentType: string;
  LastCreatedOnTheBasisNumber: string;
  LastCreatedOnTheBasisPayerType: string;
  LastTransactionDateTimeGM: string;
  LastTransactionStatusGM: string;
  LightReturnNumber: string;
  LoyaltyCardRecipient: string;
  LoyaltyCardSender: string;
  MarketplacePartnerToken: string;
  Number: string;
  OwnerDocumentNumber: string;
  OwnerDocumentType: string;
  Packaging: unknown[];
  PartialReturnGoods: unknown[];
  PayerType: string;
  PaymentMethod: string;
  PaymentStatus: string;
  PaymentStatusDate: string;
  PhoneRecipient: string;
  PhoneSender: string;
  PossibilityChangeCash2Card: boolean;
  PossibilityChangeDeliveryIntervals: boolean;
  PossibilityChangeEW: boolean;
  PossibilityCreateRedirecting: boolean;
  PossibilityCreateRefusal: boolean;
  PossibilityCreateReturn: boolean;
  PossibilityLightReturn: boolean;
  PossibilityTermExtensio: boolean;
  PossibilityTrusteeRecipient: boolean;
  PostomatV3CellReservationNumber: boolean | string;
  RecipientAddress: string;
  RecipientDateTime: string;
  RecipientFullName: string;
  RecipientFullNameEW: string;
  RecipientWarehouseTypeRef: string;
  Redelivery: boolean | string;
  RedeliveryNum: string;
  RedeliveryPayer: string;
  RedeliveryPaymentCardDescription: string;
  RedeliveryPaymentCardRef: string;
  RedeliveryServiceCost: string;
  RedeliverySum: string;
  RefCityRecipient: string;
  RefCitySender: string;
  RefEW: string;
  RefSettlementRecipient: string;
  RefSettlementSender: string;
  ScheduledDeliveryDate: string;
  SeatsAmount: string;
  SecurePayment: boolean | string;
  SenderAddress: string;
  SenderFullNameEW: string;
  ServiceType: string;
  Status: string;
  StatusCode: number;
  StorageAmount: string;
  StoragePrice: string;
  SumBeforeCheckWeight: string;
  TrackingUpdateDate: string;
  TrusteeRecipientPhone: string;
  UndeliveryReasons: string;
  UndeliveryReasonsDate: string;
  UndeliveryReasonsSubtypeDescription: string;
  VolumeWeight: string;
  WarehouseRecipient: string;
  WarehouseRecipientAddress: string;
  WarehouseRecipientInternetAddressRef: string;
  WarehouseRecipientNumber: string;
  WarehouseRecipientRef: string;
  WarehouseSender: string;
  WarehouseSenderAddress: string;
  WarehouseSenderInternetAddressRef: string;
}

/** 21-value status-code set (platx/go-nova-poshta's enum.go + sirkostya009/go-novapost's
 *  doc-comment, spec.md §1 — both independently agree on all 21 numbers and Ukrainian text). Not a
 *  closed TypeScript union — StatusCode stays `number` on TrackingStatus (AC-07) — this exists only
 *  as a documentation reference for consuming developers, exported separately, never used to
 *  narrow or validate the wire value. */
export const TRACKING_STATUS_CODES = {
  1: "Створено відправником, не передано до відправки",
  2: "Видалено",
  3: "Номер не знайдено",
  4: "Перетнув межу міста відправлення",
  5: "Прямує до міста отримувача",
  6: "У місті отримувача",
  7: "Прибув на відділення отримувача",
  8: "Прибув на поштомат отримувача",
  9: "Відправлення отримано",
  10: "Відправлення отримано, грошовий переказ відправляється",
  11: "Відправлення отримано, грошовий переказ видано отримувачу",
  12: "Нова Пошта комплектує відправлення",
  41: "У місті (локал стандарт/експрес)",
  101: "На шляху до одержувача",
  102: "Відмова відправника",
  103: "Відмова одержувача",
  104: "Змінено адресу",
  105: "Припинено зберігання",
  106: "Одержано, створено ЄН зворотньої доставки",
  111: "Невдала спроба доставки — одержувача не знайдено",
  112: "Дата доставки перенесена одержувачем",
} as const;
