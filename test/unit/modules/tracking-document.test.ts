import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../../src/index.js";
import { createTrackingDocumentModule } from "../../../src/modules/tracking-document/index.js";
import type { TrackingStatus } from "../../../src/types/tracking-document.js";

function mockFetchOnce(handler: (body: unknown) => { ok: boolean; status?: number; json: () => Promise<unknown> }) {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return handler(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function successEnvelope(data: unknown[]) {
  return { ok: true, json: () => Promise.resolve({ success: true, data, errors: [], warnings: [] }) };
}

function record(overrides: Partial<TrackingStatus> & { Number: string }): TrackingStatus {
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
    StatusCode: 5,
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

describe("tracking-document module — getStatusDocuments raw batch (T2, AC-01/AC-02/AC-03/AC-05/AC-06/AC-11)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends modelName TrackingDocument / calledMethod getStatusDocuments with Documents passed through unmodified (AC-01, AC-03)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([record({ Number: "20400048799000" }), record({ Number: "20400048799001" })]),
    );
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    const documents = [
      { DocumentNumber: "20400048799000", Phone: "" },
      { DocumentNumber: "20400048799001", Phone: "380500000000" },
    ];
    await trackingDocument.getStatusDocuments({ Documents: documents });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("TrackingDocument");
    expect(sentBody.calledMethod).toBe("getStatusDocuments");
    expect(sentBody.methodProperties.Documents).toEqual(documents);
    // AC-03: a multi-waybill request is passed through as ONE call, never split into several.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a longer-than-requested, reordered response with every record's own Number field intact (AC-05)", async () => {
    mockFetchOnce(() =>
      successEnvelope([
        record({ Number: "20400048799002" }),
        record({ Number: "20400048799000" }),
        record({ Number: "20400048799003" }),
      ]),
    );
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    const result = await trackingDocument.getStatusDocuments({
      Documents: [
        { DocumentNumber: "20400048799000", Phone: "" },
        { DocumentNumber: "20400048799001", Phone: "" },
      ],
    });

    expect(result.map((r) => r.Number)).toEqual([
      "20400048799002",
      "20400048799000",
      "20400048799003",
    ]);
  });

  it("returns a shorter-than-requested response — the one returned record's own Number field intact, not padded or reindexed (AC-05)", async () => {
    mockFetchOnce(() => successEnvelope([record({ Number: "20400048799000" })]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    const result = await trackingDocument.getStatusDocuments({
      Documents: [
        { DocumentNumber: "20400048799000", Phone: "" },
        { DocumentNumber: "20400048799001", Phone: "" },
        { DocumentNumber: "20400048799002", Phone: "" },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.Number).toBe("20400048799000");
  });

  it("resolves a validly-shaped, zero-record response as success, not an error — the smallest instance of AC-05", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await expect(
      trackingDocument.getStatusDocuments({ Documents: [{ DocumentNumber: "20400048799000", Phone: "" }] }),
    ).resolves.toEqual([]);
  });

  it("resolves a not-found/removed status code (2 or 3) as a normal record, no exception (AC-06)", async () => {
    mockFetchOnce(() => successEnvelope([record({ Number: "20400048799000", StatusCode: 3, Status: "Номер не знайдено" })]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    const result = await trackingDocument.getStatusDocuments({
      Documents: [{ DocumentNumber: "20400048799000", Phone: "" }],
    });

    expect(result[0]!.StatusCode).toBe(3);
    expect(result[0]!.Status).toBe("Номер не знайдено");
  });

  it("imports nothing from internet-document or common (AC-11)", () => {
    const sourcePath = fileURLToPath(new URL("../../../src/modules/tracking-document/index.ts", import.meta.url));
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toMatch(/from ["'].*internet-document/);
    expect(source).not.toMatch(/from ["'].*\/common/);
  });
});

describe("tracking-document module — getDocumentStatus convenience (T3, AC-04)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes exactly one call carrying a single-item Documents array", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([record({ Number: "20400048799000" })]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await trackingDocument.getDocumentStatus("20400048799000");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getStatusDocuments");
    expect(sentBody.methodProperties.Documents).toEqual([{ DocumentNumber: "20400048799000", Phone: "" }]);
  });

  it("passes a supplied phone through, not defaulted", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([record({ Number: "20400048799000" })]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await trackingDocument.getDocumentStatus("20400048799000", "380500000000");

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.Documents).toEqual([
      { DocumentNumber: "20400048799000", Phone: "380500000000" },
    ]);
  });

  it("resolves undefined when zero returned records match the requested Number", async () => {
    mockFetchOnce(() => successEnvelope([record({ Number: "some-other-waybill" })]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await expect(trackingDocument.getDocumentStatus("20400048799000")).resolves.toBeUndefined();
  });

  it("resolves undefined on a whitespace/case mismatch — exact comparison only, no trimming or case-folding (AC-04)", async () => {
    mockFetchOnce(() => successEnvelope([record({ Number: " 20400048799000 " })]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await expect(trackingDocument.getDocumentStatus("20400048799000")).resolves.toBeUndefined();
  });

  it("resolves the single matching record by exact string comparison, no trimming/case-folding", async () => {
    mockFetchOnce(() => successEnvelope([record({ Number: "20400048799000", Status: "У місті отримувача" })]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await expect(trackingDocument.getDocumentStatus("20400048799000")).resolves.toEqual(
      record({ Number: "20400048799000", Status: "У місті отримувача" }),
    );
  });

  it("throws NovaPoshtaApiError when more than one returned record matches the requested Number", async () => {
    mockFetchOnce(() =>
      successEnvelope([record({ Number: "20400048799000" }), record({ Number: "20400048799000" })]),
    );
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await expect(trackingDocument.getDocumentStatus("20400048799000")).rejects.toThrow(NovaPoshtaApiError);
  });
});

describe("tracking-document module — forward-compatible status (T5, AC-07)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserves a status code/description not previously documented, unchanged", async () => {
    mockFetchOnce(() =>
      successEnvelope([record({ Number: "20400048799000", StatusCode: 9999, Status: "A brand-new status Nova Poshta added later" })]),
    );
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    const result = await trackingDocument.getStatusDocuments({
      Documents: [{ DocumentNumber: "20400048799000", Phone: "" }],
    });

    expect(result[0]!.StatusCode).toBe(9999);
    expect(result[0]!.Status).toBe("A brand-new status Nova Poshta added later");
  });
});

describe("tracking-document module — shared error contract (T5, AC-08/AC-09/AC-10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws NovaPoshtaApiError when Nova Poshta declines the request (AC-08)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () =>
        Promise.resolve({
          success: false,
          data: [],
          errors: ["Unsupported filter value"],
          errorCodes: ["400"],
          warnings: [],
        }),
    }));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    const err = await trackingDocument
      .getStatusDocuments({ Documents: [{ DocumentNumber: "20400048799000", Phone: "" }] })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Unsupported filter value"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["400"]);
  });

  it("throws NovaPoshtaApiError when success is true but data isn't array-shaped (AC-08)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { not: "a list" }, errors: [], warnings: [] }),
    }));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await expect(
      trackingDocument.getStatusDocuments({ Documents: [{ DocumentNumber: "20400048799000", Phone: "" }] }),
    ).rejects.toThrow(NovaPoshtaApiError);
  });

  it("does not throw when a document merely comes back not-found/removed — 0% of AC-06 cases raise (AC-08 contrast)", async () => {
    mockFetchOnce(() => successEnvelope([record({ Number: "20400048799000", StatusCode: 2, Status: "Видалено" })]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await expect(
      trackingDocument.getStatusDocuments({ Documents: [{ DocumentNumber: "20400048799000", Phone: "" }] }),
    ).resolves.not.toThrow();
  });

  it("throws NovaPoshtaApiError with Nova Poshta's own message on an invalid/expired API key (AC-09)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () =>
        Promise.resolve({ success: false, data: [], errors: ["Invalid API key"], errorCodes: ["401"], warnings: [] }),
    }));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    const err = await trackingDocument
      .getStatusDocuments({ Documents: [{ DocumentNumber: "20400048799000", Phone: "" }] })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Invalid API key"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["401"]);
  });

  it("throws NovaPoshtaApiError (not a raw error) on a network/transport failure (AC-10)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await expect(
      trackingDocument.getStatusDocuments({ Documents: [{ DocumentNumber: "20400048799000", Phone: "" }] }),
    ).rejects.toThrow(NovaPoshtaApiError);
  });

  it("throws NovaPoshtaApiError (not a raw error) when the response body isn't valid JSON (AC-10)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError("Unexpected token")) }),
    );
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    await expect(
      trackingDocument.getStatusDocuments({ Documents: [{ DocumentNumber: "20400048799000", Phone: "" }] }),
    ).rejects.toThrow(NovaPoshtaApiError);
  });
});

describe("tracking-document module — overhead benchmark (T5, spec.md §6 NFR row 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("median library-added overhead is <=5ms across >=30 stubbed single-waybill calls", async () => {
    mockFetchOnce(() => successEnvelope([record({ Number: "20400048799000" })]));
    const trackingDocument = createTrackingDocumentModule(createClient("test-api-key"));

    const samples: number[] = [];
    const runs = 30;
    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      await trackingDocument.getDocumentStatus("20400048799000");
      samples.push(performance.now() - start);
    }

    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(runs / 2)];
    expect(median).toBeLessThanOrEqual(5);
  });
});
