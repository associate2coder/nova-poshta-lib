import { describe, expect, it } from "vitest";
import type {
  GetStatusDocumentsPayload,
  TrackingDocumentFilter,
  TrackingStatus,
} from "../../../src/types/tracking-document.js";
import { TRACKING_STATUS_CODES } from "../../../src/types/tracking-document.js";

// Every field defaulted per contracts/public-api.md §2 — the 118-field union, no `any`. Overrides
// let individual tests exercise the 5 boolean|string-disputed fields and StatusCode without
// re-typing the other 113 fields each time.
function buildTrackingStatus(overrides: Partial<TrackingStatus> = {}): TrackingStatus {
  return {
    ActualDeliveryDate: "",
    AdditionalInformationEW: "",
    AdjustedDate: "",
    AfterpaymentOnGoodsCost: "",
    AmountPaid: "",
    AmountToPay: "",
    AnnouncedPrice: "",
    AviaDelivery: false,
    BackwardDeliverySubTypesActions: "",
    BackwardDeliverySubTypesServices: "",
    BarcodeRedBox: "",
    CalculatedWeight: "",
    CardMaskedNumber: "",
    CargoDescriptionString: "",
    CargoReturnRefusal: false,
    CargoType: "",
    CategoryOfWarehouse: "",
    CheckWeight: "",
    CheckWeightMethod: "",
    CityRecipient: "",
    CitySender: "",
    ClientBarcode: "",
    CounterpartyRecipientDescription: "",
    CounterpartySenderDescription: "",
    CounterpartySenderType: "",
    CounterpartyType: "",
    CreatedOnTheBasis: "",
    DateCreated: "",
    DateFirstDayStorage: "",
    DateMoving: "",
    DatePayedKeeping: "",
    DateReturnCargo: "",
    DateScan: "",
    DaysStorageCargo: "",
    DeliveryTimeframe: "",
    DocumentCost: "",
    DocumentWeight: "",
    ExpressWaybillAmountToPay: "",
    ExpressWaybillPaymentStatus: "",
    FactualWeight: "",
    FreeShipping: "",
    InternationalDeliveryType: "",
    InternetDocumentDescription: "",
    LastAmountReceivedCommissionGM: "",
    LastAmountTransferGM: "",
    LastCreatedOnTheBasisDateTime: "",
    LastCreatedOnTheBasisDocumentType: "",
    LastCreatedOnTheBasisNumber: "",
    LastCreatedOnTheBasisPayerType: "",
    LastTransactionDateTimeGM: "",
    LastTransactionStatusGM: "",
    LightReturnNumber: "",
    LoyaltyCardRecipient: "",
    LoyaltyCardSender: "",
    MarketplacePartnerToken: "",
    Number: "20400048799000",
    OwnerDocumentNumber: "",
    OwnerDocumentType: "",
    Packaging: [],
    PartialReturnGoods: [],
    PayerType: "",
    PaymentMethod: "",
    PaymentStatus: "",
    PaymentStatusDate: "",
    PhoneRecipient: "",
    PhoneSender: "",
    PossibilityChangeCash2Card: false,
    PossibilityChangeDeliveryIntervals: false,
    PossibilityChangeEW: false,
    PossibilityCreateRedirecting: false,
    PossibilityCreateRefusal: false,
    PossibilityCreateReturn: false,
    PossibilityLightReturn: false,
    PossibilityTermExtensio: false,
    PossibilityTrusteeRecipient: false,
    PostomatV3CellReservationNumber: false,
    RecipientAddress: "",
    RecipientDateTime: "",
    RecipientFullName: "",
    RecipientFullNameEW: "",
    RecipientWarehouseTypeRef: "",
    Redelivery: false,
    RedeliveryNum: "",
    RedeliveryPayer: "",
    RedeliveryPaymentCardDescription: "",
    RedeliveryPaymentCardRef: "",
    RedeliveryServiceCost: "",
    RedeliverySum: "",
    RefCityRecipient: "",
    RefCitySender: "",
    RefEW: "",
    RefSettlementRecipient: "",
    RefSettlementSender: "",
    ScheduledDeliveryDate: "",
    SeatsAmount: "",
    SecurePayment: false,
    SenderAddress: "",
    SenderFullNameEW: "",
    ServiceType: "",
    Status: "",
    StatusCode: 1,
    StorageAmount: "",
    StoragePrice: "",
    SumBeforeCheckWeight: "",
    TrackingUpdateDate: "",
    TrusteeRecipientPhone: "",
    UndeliveryReasons: "",
    UndeliveryReasonsDate: "",
    UndeliveryReasonsSubtypeDescription: "",
    VolumeWeight: "",
    WarehouseRecipient: "",
    WarehouseRecipientAddress: "",
    WarehouseRecipientInternetAddressRef: "",
    WarehouseRecipientNumber: "",
    WarehouseRecipientRef: "",
    WarehouseSender: "",
    WarehouseSenderAddress: "",
    WarehouseSenderInternetAddressRef: "",
    ...overrides,
  };
}

describe("tracking-document domain types (T1, AC-07)", () => {
  it("TrackingDocumentFilter/GetStatusDocumentsPayload match contracts/public-api.md §2 field-for-field", () => {
    const filter: TrackingDocumentFilter = { DocumentNumber: "20400048799000", Phone: "" };
    const payload: GetStatusDocumentsPayload = { Documents: [filter] };

    expect(payload.Documents[0]).toEqual(filter);

    // @ts-expect-error — Phone is mandatory on TrackingDocumentFilter (always sent, per AC-02).
    const missingPhone: TrackingDocumentFilter = { DocumentNumber: "20400048799000" };
    expect(missingPhone).toBeDefined();
  });

  it("TrackingStatus types StatusCode as a plain number, never narrowed by TRACKING_STATUS_CODES (AC-07)", () => {
    const status = buildTrackingStatus({ StatusCode: 999999 });
    expect(status.StatusCode).toBe(999999);

    // A value with no corresponding entry in TRACKING_STATUS_CODES must still be assignable —
    // proves StatusCode isn't narrowed to a closed union derived from the const.
    const unseenCode: TrackingStatus["StatusCode"] = 777;
    expect(unseenCode).toBe(777);
  });

  it("the 5 disputed fields accept both boolean and string (AC-07, api-sync-report.md drift finding 1)", () => {
    const asBoolean = buildTrackingStatus({
      AviaDelivery: true,
      CargoReturnRefusal: true,
      PostomatV3CellReservationNumber: true,
      Redelivery: true,
      SecurePayment: true,
    });
    const asString = buildTrackingStatus({
      AviaDelivery: "0",
      CargoReturnRefusal: "0",
      PostomatV3CellReservationNumber: "",
      Redelivery: "0",
      SecurePayment: "0",
    });

    expect(asBoolean.AviaDelivery).toBe(true);
    expect(asString.AviaDelivery).toBe("0");
  });

  it("TRACKING_STATUS_CODES is a documentation-only const — Ukrainian descriptions keyed by all 21 status codes", () => {
    expect(TRACKING_STATUS_CODES[2]).toBe("Видалено");
    expect(TRACKING_STATUS_CODES[3]).toBe("Номер не знайдено");
    expect(Object.keys(TRACKING_STATUS_CODES)).toHaveLength(21);
  });

  it("TrackingStatus types the full 118-field union — Go-only and TypeScript-only fields both compile", () => {
    const status = buildTrackingStatus();

    expect(typeof status.ActualDeliveryDate).toBe("string");
    expect(typeof status.WarehouseSenderInternetAddressRef).toBe("string");
    expect(Array.isArray(status.Packaging)).toBe(true);
    expect(Array.isArray(status.PartialReturnGoods)).toBe(true);
    expect(status.Number).toBe("20400048799000");
  });
});
