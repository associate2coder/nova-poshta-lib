import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../../src/index.js";
import { createAdditionalServiceModule } from "../../../src/modules/additional-service/index.js";
import type {
  ChangeEWOrderListItem,
  CreateRedirectPayload,
  CreateReturnIfPossiblePayload,
  CreateReturnPayload,
  CreateReturnToNewAddressPayload,
  CreateReturnToNewWarehousePayload,
  CreateReturnToSenderAddressPayload,
  CreateWaybillEditPayload,
  DeleteAdditionalServiceOrderPayload,
  DeletedAdditionalServiceOrder,
  OrderListFilters,
  OrderPricingEstimate,
  RedirectOrderListItem,
  RedirectPossibility,
  ReturnAddressOption,
  ReturnEditOption,
  ReturnOrderListItem,
  ReturnReason,
  ReturnReasonSubtype,
  ReturnReasonSubtypeFilters,
  SavedRedirectOrder,
  SavedReturnOrder,
  SavedWaybillEditOrder,
  UpdateRedirectPayload,
  UpdateReturnPayload,
  WaybillEditPossibility,
} from "../../../src/types/additional-service.js";

function mockFetchOnce(handler: (body: unknown) => { ok: boolean; status?: number; json: () => Promise<unknown> }) {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return handler(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function successEnvelope(data: unknown[], info?: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve({ success: true, data, errors: [], warnings: [], ...(info !== undefined ? { info } : {}) }),
  };
}

function declinedEnvelope(errors: string[], errorCodes: string[] = []) {
  return {
    ok: true,
    json: () => Promise.resolve({ success: false, data: [], errors, errorCodes, warnings: [] }),
  };
}

function returnAddressOption(overrides: Partial<ReturnAddressOption> = {}): ReturnAddressOption {
  return {
    Ref: "return-address-ref-1",
    NonCash: "1",
    City: "Kyiv",
    Counterparty: "ACME LLC",
    ContactPerson: "Jane Doe",
    Address: "1 Khreshchatyk St",
    Phone: "380500000000",
    ...overrides,
  };
}

function returnEditOption(overrides: Partial<ReturnEditOption> = {}): ReturnEditOption {
  return { Type: "OrderReturn", ...overrides };
}

describe("additional-service module — checkReturnPossible (T4, AC-01/AC-02)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns typed ReturnAddressOption[] including NonCash, sending Number via request() (AC-01)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([returnAddressOption()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result = await additionalService.checkReturnPossible({ Number: "20450000000001" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("CheckPossibilityCreateReturn");
    expect(sentBody.methodProperties.Number).toBe("20450000000001");
    expect(result).toEqual([returnAddressOption()]);
    expect(result[0]!.NonCash).toBe("1");
  });

  it("propagates NovaPoshtaApiError unchanged when Nova Poshta declines a recipient-key call (AC-02)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Only the shipment's sender may perform this action"], ["403"]));
    const additionalService = createAdditionalServiceModule(createClient("recipient-api-key"));

    const err = await additionalService
      .checkReturnPossible({ Number: "20450000000001" })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Only the shipment's sender may perform this action"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["403"]);
  });
});

describe("additional-service module — checkReturnEditPossible (T4, AC-06)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("assembles { options, info } from requestEnvelope()'s data + info fields (ADR-0001), same calledMethod, Ref+Address payload (AC-06)", async () => {
    const info = { PayerTypeDefault: "Sender", Number: "20450000000001" };
    const fetchMock = mockFetchOnce(() => successEnvelope([returnEditOption()], info));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result = await additionalService.checkReturnEditPossible({
      Ref: "return-request-ref-1",
      Address: { CityRef: "city-ref-1" },
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("CheckPossibilityCreateReturn");
    expect(sentBody.methodProperties.Ref).toBe("return-request-ref-1");
    expect(sentBody.methodProperties.Address).toEqual({ CityRef: "city-ref-1" });
    expect(result).toEqual({ options: [returnEditOption()], info });
  });

  it("propagates NovaPoshtaApiError unchanged when the check declines (AC-06 decline)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Return request not found"], ["404"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService
      .checkReturnEditPossible({ Ref: "no-such-ref", Address: {} })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Return request not found"]);
  });
});

// --- T5 (app layer, AC-02/AC-03/AC-04/AC-05): createReturn / calculateReturn ---
//
// public-api.md §3.1/§5: both route through client.requestFirst() to `save`/`orderCargoReturn`;
// calculateReturn additionally injects OnlyGetPricing: "1". A shared internal payload builder
// strips CreateReturnPayload's own Destination discriminant (TS-only, no wire counterpart) before
// the call, and sets OrderType: "orderCargoReturn" internally — never caller-settable. Neither
// method exists on the module yet (T4 only shipped checkReturnPossible/checkReturnEditPossible),
// so this is expected to fail to compile/run until T5's implementation lands.

const returnCommon = {
  IntDocNumber: "20450000000001",
  PaymentMethod: "Cash" as const,
  Reason: "reason-ref-1",
};

function senderAddressPayload(overrides: Partial<CreateReturnToSenderAddressPayload> = {}): CreateReturnToSenderAddressPayload {
  return {
    ...returnCommon,
    Destination: "SenderAddress",
    ReturnAddressRef: "return-address-ref-1",
    ...overrides,
  };
}

function newAddressPayload(overrides: Partial<CreateReturnToNewAddressPayload> = {}): CreateReturnToNewAddressPayload {
  return {
    ...returnCommon,
    Destination: "NewAddress",
    RecipientSettlement: "settlement-1",
    RecipientSettlementStreet: "street-1",
    BuildingNumber: "10",
    ...overrides,
  };
}

function newWarehousePayload(overrides: Partial<CreateReturnToNewWarehousePayload> = {}): CreateReturnToNewWarehousePayload {
  return {
    ...returnCommon,
    Destination: "NewWarehouse",
    RecipientWarehouse: "warehouse-ref-1",
    ...overrides,
  };
}

function savedReturnOrder(overrides: Partial<SavedReturnOrder> = {}): SavedReturnOrder {
  return { Number: "20450000000001", Ref: "return-order-ref-1", ...overrides };
}

function orderPricingEstimate(overrides: Partial<OrderPricingEstimate> = {}): OrderPricingEstimate {
  return {
    Pricing: { Services: [], Total: 4500, FirstDayStorage: 0 },
    ScheduledDeliveryDate: "2026-09-25 00:00:00",
    ...overrides,
  };
}

describe("additional-service module — createReturn (T5, AC-02/AC-03/AC-04)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("SenderAddress variant: creates the return, strips Destination, sets OrderType internally, keeps ReturnAddressRef (AC-03)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedReturnOrder()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: SavedReturnOrder = await additionalService.createReturn(senderAddressPayload());

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("save");
    expect(sentBody.methodProperties.OrderType).toBe("orderCargoReturn");
    expect(sentBody.methodProperties.Destination).toBeUndefined();
    expect(sentBody.methodProperties.ReturnAddressRef).toBe("return-address-ref-1");
    expect(result).toEqual(savedReturnOrder());
  });

  it("NewAddress variant: creates the return, strips Destination, keeps the new-address fields (AC-03)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedReturnOrder({ Ref: "return-order-ref-2" })]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: SavedReturnOrder = await additionalService.createReturn(newAddressPayload());

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.OrderType).toBe("orderCargoReturn");
    expect(sentBody.methodProperties.Destination).toBeUndefined();
    expect(sentBody.methodProperties.RecipientSettlement).toBe("settlement-1");
    expect(sentBody.methodProperties.RecipientSettlementStreet).toBe("street-1");
    expect(sentBody.methodProperties.BuildingNumber).toBe("10");
    expect(result).toEqual(savedReturnOrder({ Ref: "return-order-ref-2" }));
  });

  it("NewWarehouse variant: creates the return, strips Destination, keeps RecipientWarehouse (AC-03)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedReturnOrder({ Ref: "return-order-ref-3" })]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: SavedReturnOrder = await additionalService.createReturn(newWarehousePayload());

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.OrderType).toBe("orderCargoReturn");
    expect(sentBody.methodProperties.Destination).toBeUndefined();
    expect(sentBody.methodProperties.RecipientWarehouse).toBe("warehouse-ref-1");
    expect(result).toEqual(savedReturnOrder({ Ref: "return-order-ref-3" }));
  });

  it("propagates NovaPoshtaApiError unchanged when Nova Poshta declines a recipient-key call (AC-02)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Only the shipment's sender may perform this action"], ["403"]));
    const additionalService = createAdditionalServiceModule(createClient("recipient-api-key"));

    const err = await additionalService.createReturn(senderAddressPayload()).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Only the shipment's sender may perform this action"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["403"]);
  });
});

describe("additional-service module — calculateReturn (T5, AC-02/AC-05)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends OnlyGetPricing: \"1\" alongside OrderType: \"orderCargoReturn\", returns typed OrderPricingEstimate, creates no order (AC-05)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([orderPricingEstimate()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: OrderPricingEstimate = await additionalService.calculateReturn(senderAddressPayload());

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("save");
    expect(sentBody.methodProperties.OrderType).toBe("orderCargoReturn");
    expect(sentBody.methodProperties.OnlyGetPricing).toBe("1");
    expect(sentBody.methodProperties.Destination).toBeUndefined();
    // proves the result is a pricing estimate, not a SavedReturnOrder — no Number/Ref order-creation
    // shape confused with a pricing preview (measurement, spec.md §6 "Calculate/create isolation")
    expect(result).toEqual(orderPricingEstimate());
    expect(result.Pricing.Total).toBe(4500);
    expect(result.Pricing.FirstDayStorage).toBe(0);
    expect(result.ScheduledDeliveryDate).toBe("2026-09-25 00:00:00");
    expect((result as unknown as Partial<SavedReturnOrder>).Number).toBeUndefined();
    expect((result as unknown as Partial<SavedReturnOrder>).Ref).toBeUndefined();
  });

  it("propagates NovaPoshtaApiError unchanged when Nova Poshta declines a recipient-key call (AC-02)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Only the shipment's sender may perform this action"], ["403"]));
    const additionalService = createAdditionalServiceModule(createClient("recipient-api-key"));

    const err = await additionalService.calculateReturn(senderAddressPayload()).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Only the shipment's sender may perform this action"]);
  });
});

describe("additional-service module — createReturn/calculateReturn discriminant safety at the call boundary (T5, AC-04)", () => {
  // Compile-time only (checked by `npm run typecheck`, not vitest — types are erased at runtime).
  // T1's test/unit/types/additional-service.test.ts already proves CreateReturnPayload itself
  // rejects a mixed-variant object. This proves the SAME guard holds at createReturn/calculateReturn's
  // own call boundary — passing a field-by-field-assembled variable with a foreign field, or invoking
  // the module methods directly with a mixed literal, is still a compile-time error. Per T1's own
  // lesson: `@ts-expect-error` must sit directly above the offending property line, not above the
  // enclosing const/call statement (TS attributes a suppressed diagnostic to the line it's placed on).
  it("rejects passing a variable that mixes a wrong variant's field under a given Destination tag to createReturn (AC-04)", () => {
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const mixedSenderAddress: CreateReturnToSenderAddressPayload = senderAddressPayload();
    // @ts-expect-error — RecipientWarehouse belongs to the NewWarehouse variant, not SenderAddress,
    // even assigned field-by-field post-construction, and even though it's about to be passed
    // straight into createReturn's own CreateReturnPayload-typed parameter.
    mixedSenderAddress.RecipientWarehouse = "warehouse-ref-9";

    void additionalService.createReturn(mixedSenderAddress as CreateReturnPayload);

    expect(mixedSenderAddress.Destination).toBe("SenderAddress");
  });

  it("rejects calling calculateReturn with a fresh object literal mixing two variants under one Destination tag (AC-04)", () => {
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    void additionalService.calculateReturn({
      ...returnCommon,
      Destination: "NewWarehouse",
      RecipientWarehouse: "warehouse-ref-10",
      // @ts-expect-error — RecipientSettlementStreet belongs to the NewAddress variant, not
      // NewWarehouse; mixing it into a NewWarehouse-tagged literal passed straight to calculateReturn
      // must fail to compile.
      RecipientSettlementStreet: "street-9",
    });

    expect(true).toBe(true);
  });
});

// --- T6 (app layer, AC-06/AC-07): updateReturn ---
//
// public-api.md §3.1/§5: routes through client.requestFirst() to `update` — payload (Ref + whatever
// subset of corrected fields the caller supplies) is passed through as-is, no client-side
// transformation. Response shape is genuinely ambiguous (contract §3.1 note), so this asserts loosely:
// the resolved value equals whatever the mocked response's first record is, typed as
// Record<string, unknown>. updateReturn doesn't exist on the module yet (T4/T5 only shipped
// checkReturnPossible/checkReturnEditPossible/createReturn/calculateReturn), so this is expected to
// fail to compile/run until T6's implementation lands.

function updateReturnPayload(overrides: Partial<UpdateReturnPayload> = {}): UpdateReturnPayload {
  return {
    Ref: "return-request-ref-1",
    ...overrides,
  };
}

describe("additional-service module — updateReturn (T6, AC-06/AC-07)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies a corrected field, sends the payload through as-is via update, resolves the typed response (AC-06)", async () => {
    const updatedOrder = { Ref: "return-request-ref-1", PaymentMethod: "NonCash", BuildingNumber: "12" };
    const fetchMock = mockFetchOnce(() => successEnvelope([updatedOrder]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const payload = updateReturnPayload({ PaymentMethod: "NonCash", BuildingNumber: "12" });
    const result: Record<string, unknown> = await additionalService.updateReturn(payload);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("update");
    expect(sentBody.methodProperties).toEqual(payload);
    expect(result).toEqual(updatedOrder);
  });

  it("propagates NovaPoshtaApiError unchanged when the return's status is no longer Accepted, no client-side status check (AC-07)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Return request is not in status Accepted"], ["409"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService
      .updateReturn(updateReturnPayload({ PaymentMethod: "NonCash" }))
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Return request is not in status Accepted"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["409"]);
  });
});

// --- T7 (app layer, AC-08): getReturnOrdersList / getReturnReasons / getReturnReasonsSubtypes ---
//
// public-api.md §3.1/§5: all three route through client.request() with calledMethod matching the
// method name itself ("getReturnOrdersList", "getReturnReasons", "getReturnReasonsSubtypes"), plain
// reads — no client-side re-filtering, sorting, or pagination (AC-08). None of the three exist on
// the module yet (T4/T5/T6 only shipped the check/create/calculate/update quintet), so this is
// expected to fail to compile/run until T7's implementation lands.

function returnOrderListItem(overrides: Partial<ReturnOrderListItem> = {}): ReturnOrderListItem {
  return {
    OrderRef: "return-order-ref-1",
    OrderNumber: "1",
    OrderStatus: "Accepted",
    DocumentNumber: "20450000000001",
    CounterpartyRecipient: "ACME LLC",
    ContactPersonRecipient: "Jane Doe",
    AddressRecipient: "1 Khreshchatyk St",
    DeliveryCost: "45.00",
    EstimatedDeliveryDate: "2026-09-25",
    ExpressWaybillNumber: "20450000000099",
    ExpressWaybillStatus: "In transit",
    ...overrides,
  };
}

function returnReason(overrides: Partial<ReturnReason> = {}): ReturnReason {
  return { Ref: "reason-ref-1", Description: "Wrong size", ...overrides };
}

function returnReasonSubtype(overrides: Partial<ReturnReasonSubtype> = {}): ReturnReasonSubtype {
  return {
    Ref: "subtype-ref-1",
    Description: "Too small",
    ReasonRef: "reason-ref-1",
    ...overrides,
  };
}

describe("additional-service module — getReturnOrdersList (T7, AC-08)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unfiltered: sends calledMethod getReturnOrdersList, resolves typed ReturnOrderListItem[] (AC-08)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([returnOrderListItem()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: ReturnOrderListItem[] = await additionalService.getReturnOrdersList();

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("getReturnOrdersList");
    expect(result).toEqual([returnOrderListItem()]);
  });

  it("filter pass-through: Number/BeginDate/EndDate/Page/Limit reach the wire call unmodified, no client-side re-filtering/sorting/pagination (AC-08)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([returnOrderListItem()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const filters: OrderListFilters = {
      Number: "20450000000001",
      BeginDate: "01.09.2026",
      EndDate: "23.09.2026",
      Page: 2,
      Limit: 50,
    };

    await additionalService.getReturnOrdersList(filters);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getReturnOrdersList");
    expect(sentBody.methodProperties).toEqual(filters);
  });
});

describe("additional-service module — getReturnReasons (T7, AC-08)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("takes no arguments, sends calledMethod getReturnReasons, resolves typed ReturnReason[] (AC-08)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([returnReason()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: ReturnReason[] = await additionalService.getReturnReasons();

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("getReturnReasons");
    expect(result).toEqual([returnReason()]);
  });
});

describe("additional-service module — getReturnReasonsSubtypes (T7, AC-08)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unfiltered: sends calledMethod getReturnReasonsSubtypes, resolves typed ReturnReasonSubtype[] (AC-08)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([returnReasonSubtype()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: ReturnReasonSubtype[] = await additionalService.getReturnReasonsSubtypes();

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("getReturnReasonsSubtypes");
    expect(result).toEqual([returnReasonSubtype()]);
  });

  it("filter pass-through: ReasonRef reaches the wire call unmodified, no client-side re-filtering (AC-08)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([returnReasonSubtype()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const filters: ReturnReasonSubtypeFilters = { ReasonRef: "reason-ref-1" };

    await additionalService.getReturnReasonsSubtypes(filters);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getReturnReasonsSubtypes");
    expect(sentBody.methodProperties).toEqual(filters);
  });
});

// --- T8 (app layer, AC-09/AC-12): checkRedirectPossible / checkRedirectEditPossible ---
//
// public-api.md §3.2/§5: sad.md §5's asymmetry note — unlike checkReturnPossible's array of
// destination choices, this wire method (checkPossibilityForRedirecting) resolves ONE info record
// via client.requestFirst(), not client.request(). checkRedirectPossible and checkRedirectEditPossible
// share the same calledMethod but dispatch on payload shape (Number vs. OrderRef+fields).
// Neither method exists on the module yet (T4-T7 only shipped the return group), so this is expected
// to fail to compile/run until T8's implementation lands.

function redirectPossibility(overrides: Partial<RedirectPossibility> = {}): RedirectPossibility {
  return {
    Ref: "redirect-request-ref-1",
    Number: "20450000000001",
    PayerType: "Sender",
    PaymentMethod: "Cash",
    WarehouseRef: "warehouse-ref-1",
    WarehouseDescription: "Warehouse #1",
    AddressDescription: "1 Khreshchatyk St",
    StreetDescription: "Khreshchatyk",
    BuildingNumber: "1",
    CityRecipient: "city-ref-1",
    CityRecipientDescription: "Kyiv",
    SettlementRecipient: "settlement-ref-1",
    SettlementRecipientDescription: "Kyiv",
    SettlementType: "city",
    CounterpartyRecipientRef: "counterparty-ref-1",
    CounterpartyRecipientDescription: "ACME LLC",
    RecipientName: "Jane Doe",
    PhoneSender: "380500000000",
    PhoneRecipient: "380500000001",
    DocumentWeight: "1.5",
    ...overrides,
  };
}

describe("additional-service module — checkRedirectPossible (T8, AC-09)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves ONE typed RedirectPossibility record (not an array) via requestFirst(), sending Number, calledMethod checkPossibilityForRedirecting (AC-09)", async () => {
    const record = redirectPossibility();
    const fetchMock = mockFetchOnce(() => successEnvelope([record]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: RedirectPossibility = await additionalService.checkRedirectPossible({
      Number: "20450000000001",
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("checkPossibilityForRedirecting");
    expect(sentBody.methodProperties).toEqual({ Number: "20450000000001" });
    // requestFirst() semantics: the resolved value IS the record itself, not [record] —
    // proves this is not accidentally routed through request()/checkReturnPossible's array shape.
    expect(result).toEqual(record);
    expect(Array.isArray(result)).toBe(false);
  });

  it("propagates NovaPoshtaApiError unchanged when the check declines (AC-09 decline)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Waybill not found"], ["404"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService
      .checkRedirectPossible({ Number: "no-such-waybill" })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Waybill not found"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["404"]);
  });
});

describe("additional-service module — checkRedirectEditPossible (T8, AC-12)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves a Partial<RedirectPossibility> record via requestFirst(), sending OrderRef + address/recipient fields, SAME calledMethod as checkRedirectPossible (AC-12)", async () => {
    const partialRecord: Partial<RedirectPossibility> = {
      Ref: "redirect-request-ref-1",
      CityRecipient: "city-ref-2",
      RecipientName: "John Roe",
    };
    const fetchMock = mockFetchOnce(() => successEnvelope([partialRecord]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result = await additionalService.checkRedirectEditPossible({
      OrderRef: "redirect-request-ref-1",
      CityRecipient: "city-ref-2",
      RecipientName: "John Roe",
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    // same wire method as checkRedirectPossible — payload shape (OrderRef + fields) is what dispatches
    expect(sentBody.calledMethod).toBe("checkPossibilityForRedirecting");
    expect(sentBody.methodProperties.OrderRef).toBe("redirect-request-ref-1");
    expect(sentBody.methodProperties.CityRecipient).toBe("city-ref-2");
    expect(sentBody.methodProperties.RecipientName).toBe("John Roe");
    // requestFirst() semantics again: resolved value is the single (partial) record, not an array
    expect(result).toEqual(partialRecord);
    expect(Array.isArray(result)).toBe(false);
  });

  it("propagates NovaPoshtaApiError unchanged when the edit-possibility check declines (AC-12 decline)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Redirect request not found"], ["404"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService
      .checkRedirectEditPossible({ OrderRef: "no-such-ref" })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Redirect request not found"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["404"]);
  });
});

// --- T9 (app layer, AC-09/AC-10/AC-11): createRedirect / calculateRedirect ---
//
// public-api.md §3.2/§5: both route through client.requestFirst() to save/orderRedirecting;
// calculateRedirect additionally injects OnlyGetPricing: "1". Unlike createReturn,
// CreateRedirectPayload is one flat interface — no Destination-like discriminant exists for
// redirect (public-api.md §3.2 note, spec.md §1's "no AC-04-equivalent discriminant guard" note),
// so there is nothing to strip; OrderType: "orderRedirecting" is set internally, never
// caller-settable. AC-10: Recipient is a counterparty Ref from a separate bounded context (the
// counterparty module) — passed through unmodified, no ownership/existence check of this module's
// own. Neither method exists on the module yet (T4-T8 shipped only through
// checkRedirectEditPossible), so this is expected to fail to compile/run until T9's implementation
// lands.

function createRedirectPayload(overrides: Partial<CreateRedirectPayload> = {}): CreateRedirectPayload {
  return {
    IntDocNumber: "20450000000001",
    PaymentMethod: "Cash",
    Recipient: "counterparty-ref-1",
    RecipientContactName: "Jane Doe",
    RecipientPhone: "380500000000",
    PayerType: "Sender",
    ...overrides,
  };
}

function savedRedirectOrder(overrides: Partial<SavedRedirectOrder> = {}): SavedRedirectOrder {
  return { Number: "20450000000001", Ref: "redirect-order-ref-1", ...overrides };
}

describe("additional-service module — createRedirect (T9, AC-09/AC-10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates the redirect via save/orderRedirecting (OrderType set internally), resolves typed SavedRedirectOrder (AC-09)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedRedirectOrder()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: SavedRedirectOrder = await additionalService.createRedirect(createRedirectPayload());

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("save");
    expect(sentBody.methodProperties.OrderType).toBe("orderRedirecting");
    // no Destination-like discriminant exists on CreateRedirectPayload — nothing for this module
    // to strip, unlike createReturn's Destination
    expect(sentBody.methodProperties.IntDocNumber).toBe("20450000000001");
    expect(sentBody.methodProperties.RecipientContactName).toBe("Jane Doe");
    expect(result).toEqual(savedRedirectOrder());
  });

  it("passes the Recipient counterparty Ref through to the wire payload byte-for-byte unmodified — no ownership/existence check of this module's own (AC-10)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedRedirectOrder()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const recipientRef = "counterparty-ref-from-a-different-bounded-context-42";
    await additionalService.createRedirect(createRedirectPayload({ Recipient: recipientRef }));

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    // byte-for-byte: the exact same string value reaches the wire, never re-derived, normalized,
    // or checked against the counterparty module by this module itself
    expect(sentBody.methodProperties.Recipient).toBe(recipientRef);
    expect(typeof sentBody.methodProperties.Recipient).toBe("string");
  });

  it("propagates NovaPoshtaApiError unchanged when Nova Poshta declines the create call", async () => {
    mockFetchOnce(() => declinedEnvelope(["Waybill not eligible for redirect"], ["409"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService.createRedirect(createRedirectPayload()).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Waybill not eligible for redirect"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["409"]);
  });
});

describe("additional-service module — calculateRedirect (T9, AC-11)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends OnlyGetPricing: \"1\" alongside OrderType: \"orderRedirecting\", returns typed OrderPricingEstimate, creates no order (AC-11)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([orderPricingEstimate()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: OrderPricingEstimate = await additionalService.calculateRedirect(createRedirectPayload());

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("save");
    expect(sentBody.methodProperties.OrderType).toBe("orderRedirecting");
    expect(sentBody.methodProperties.OnlyGetPricing).toBe("1");
    // proves the resolved value is a pricing estimate, not a SavedRedirectOrder — no order created
    // (spec.md §6 "Calculate/create isolation" measurement)
    expect(result).toEqual(orderPricingEstimate());
    expect(result.Pricing.Total).toBe(4500);
    expect(result.ScheduledDeliveryDate).toBe("2026-09-25 00:00:00");
    expect((result as unknown as Partial<SavedRedirectOrder>).Number).toBeUndefined();
    expect((result as unknown as Partial<SavedRedirectOrder>).Ref).toBeUndefined();
  });

  it("propagates NovaPoshtaApiError unchanged when Nova Poshta declines the pricing call", async () => {
    mockFetchOnce(() => declinedEnvelope(["Waybill not eligible for redirect"], ["409"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService.calculateRedirect(createRedirectPayload()).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Waybill not eligible for redirect"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["409"]);
  });
});

// --- T10 (app layer, AC-12/AC-13/AC-14): updateRedirect / getRedirectionOrdersList ---
//
// public-api.md §3.2/§5: updateRedirect routes through client.requestFirst() to `update` — payload
// (Ref + whatever subset of corrected fields the caller supplies) is passed through as-is, no
// client-side transformation and, per AC-13/§7, NO role field of any kind (sender-vs-recipient is
// inferred by Nova Poshta solely from the calling API key). getRedirectionOrdersList routes through
// client.request() with calledMethod "getRedirectionOrdersList", same OrderListFilters shape as
// getReturnOrdersList (AC-14). Neither method exists on the module yet (T4-T9 shipped only through
// calculateRedirect), so this is expected to fail to compile/run until T10's implementation lands.

function updateRedirectPayload(overrides: Partial<UpdateRedirectPayload> = {}): UpdateRedirectPayload {
  return {
    Ref: "redirect-request-ref-1",
    ...overrides,
  };
}

function redirectOrderListItem(overrides: Partial<RedirectOrderListItem> = {}): RedirectOrderListItem {
  return {
    OrderRef: "redirect-order-ref-1",
    OrderNumber: "1",
    DateTime: "2026-09-23",
    Note: "",
    CityRecipient: "city-ref-1",
    RecipientAddress: "1 Khreshchatyk St",
    CounterpartyRecipient: "ACME LLC",
    RecipientName: "Jane Doe",
    PhoneRecipient: "380500000000",
    PayerType: "Sender",
    DeliveryCost: "45.00",
    EstimatedDeliveryDate: "2026-09-25",
    ExpressWaybillNumber: "20450000000099",
    ExpressWaybillStatus: "In transit",
    ...overrides,
  };
}

describe("additional-service module — updateRedirect (T10, AC-12/AC-13)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies a corrected field, sends the payload through as-is via update with NO role/PayerType-inference field added, resolves the typed response (AC-12)", async () => {
    const updatedOrder = { Ref: "redirect-request-ref-1", CityRecipient: "city-ref-2" };
    const fetchMock = mockFetchOnce(() => successEnvelope([updatedOrder]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const payload = updateRedirectPayload({ CityRecipient: "city-ref-2" });
    const result: Record<string, unknown> = await additionalService.updateRedirect(payload);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("update");
    // exactly what was given — no added role field, no client-side role inference of any kind (AC-13/§7)
    expect(sentBody.methodProperties).toEqual(payload);
    expect(sentBody.methodProperties.role).toBeUndefined();
    expect(sentBody.methodProperties.Role).toBeUndefined();
    expect(result).toEqual(updatedOrder);
  });

  it("propagates NovaPoshtaApiError unchanged when Nova Poshta declines a field the caller's inferred role may not change, no client-side field-permission check (AC-13)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Recipient is not allowed to change PaymentMethod"], ["403"]));
    const additionalService = createAdditionalServiceModule(createClient("recipient-api-key"));

    const err = await additionalService
      .updateRedirect(updateRedirectPayload({ PaymentMethod: "NonCash" }))
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Recipient is not allowed to change PaymentMethod"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["403"]);
  });
});

describe("additional-service module — getRedirectionOrdersList (T10, AC-14)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unfiltered: sends calledMethod getRedirectionOrdersList, resolves typed RedirectOrderListItem[] (AC-14)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([redirectOrderListItem()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: RedirectOrderListItem[] = await additionalService.getRedirectionOrdersList();

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("getRedirectionOrdersList");
    expect(result).toEqual([redirectOrderListItem()]);
  });

  it("filter pass-through: Number/BeginDate/EndDate/Page/Limit reach the wire call unmodified, no client-side re-filtering/sorting/pagination (AC-14)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([redirectOrderListItem()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const filters: OrderListFilters = {
      Number: "20450000000001",
      BeginDate: "01.09.2026",
      EndDate: "23.09.2026",
      Page: 3,
      Limit: 25,
    };

    await additionalService.getRedirectionOrdersList(filters);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getRedirectionOrdersList");
    expect(sentBody.methodProperties).toEqual(filters);
  });
});

// --- T11 (app layer, AC-15/AC-16/AC-17): checkWaybillEditPossible / createWaybillEdit /
// getChangeEWOrdersList ---
//
// public-api.md §3.3/§5: checkWaybillEditPossible routes through client.requestFirst() to
// CheckPossibilityChangeEW — resolves ONE typed WaybillEditPossibility record whose 11 Can... flags
// are read-only/informational (AC-16): nothing in this module gates createWaybillEdit against them.
// createWaybillEdit routes through client.requestFirst() to save/orderChangeEW (OrderType set
// internally) — the payload is forwarded to the wire as-is, even for a field a prior
// checkWaybillEditPossible call reported as not currently changeable; Nova Poshta's own
// accept/decline is the sole outcome (AC-16, §6 error-contract row). getChangeEWOrdersList routes
// through client.request() with calledMethod getChangeEWOrdersList, same OrderListFilters shape as
// the other list methods, resolving ChangeEWOrderListItem[] including the wire's own
// BeforeChangeSenderCounterparty/AfterChangeChangeSenderCounterparty naming (AC-17). None of the
// three methods exist on the module yet (T4-T10 shipped only through the redirect group), so this
// is expected to fail to compile/run until T11's implementation lands.

function waybillEditPossibility(overrides: Partial<WaybillEditPossibility> = {}): WaybillEditPossibility {
  return {
    CanChangeSender: false,
    CanChangeRecipient: true,
    CanChangePayerTypeOrPaymentMethod: false,
    CanChangeBackwardDeliveryDocuments: true,
    CanChangeBackwardDeliveryMoney: false,
    CanChangeCash2Card: true,
    CanChangeBackwardDeliveryOther: false,
    CanChangeAfterpaymentType: true,
    CanChangeLiftingOnFloor: false,
    CanChangeLiftingOnFloorWithElevator: true,
    CanChangeFillingWarranty: false,
    SenderCounterparty: "ACME LLC",
    ContactPersonSender: "Jane Doe",
    SenderPhone: "380500000000",
    RecipientCounterparty: "Beta LLC",
    ContactPersonRecipient: "John Roe",
    RecipientPhone: "380500000001",
    PayerType: "Sender",
    PaymentMethod: "Cash",
    ...overrides,
  };
}

function createWaybillEditPayload(overrides: Partial<CreateWaybillEditPayload> = {}): CreateWaybillEditPayload {
  return {
    IntDocNumber: "20450000000001",
    PaymentMethod: "Cash",
    SenderContactName: "Jane Doe",
    SenderPhone: "380500000000",
    Recipient: "counterparty-ref-1",
    RecipientContactName: "John Roe",
    RecipientPhone: "380500000001",
    PayerType: "Sender",
    ...overrides,
  };
}

function savedWaybillEditOrder(overrides: Partial<SavedWaybillEditOrder> = {}): SavedWaybillEditOrder {
  return { Number: "20450000000001", Ref: "waybill-edit-order-ref-1", ...overrides };
}

function changeEWOrderListItem(overrides: Partial<ChangeEWOrderListItem> = {}): ChangeEWOrderListItem {
  return {
    OrderRef: "waybill-edit-order-ref-1",
    OrderNumber: "1",
    OrderStatus: "Accepted",
    DocumentNumber: "20450000000001",
    DateTime: "2026-09-23",
    BeforeChangeSenderCounterparty: "ACME LLC",
    AfterChangeChangeSenderCounterparty: "Beta LLC",
    Cost: "45.00",
    BeforeChangeSenderPhone: "380500000000",
    AfterChangeSenderPhone: "380500000002",
    ...overrides,
  };
}

describe("additional-service module — checkWaybillEditPossible (T11, AC-15/AC-16)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves ONE typed WaybillEditPossibility record via requestFirst() with all 11 Can... flags returned untouched, sending IntDocNumber, calledMethod CheckPossibilityChangeEW (AC-16)", async () => {
    const record = waybillEditPossibility();
    const fetchMock = mockFetchOnce(() => successEnvelope([record]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: WaybillEditPossibility = await additionalService.checkWaybillEditPossible({
      IntDocNumber: "20450000000001",
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("CheckPossibilityChangeEW");
    expect(sentBody.methodProperties).toEqual({ IntDocNumber: "20450000000001" });
    // requestFirst() semantics: the resolved value IS the record itself, not [record]
    expect(result).toEqual(record);
    expect(Array.isArray(result)).toBe(false);
    // each of the 11 Can... flags must reach the caller untouched, exactly as Nova Poshta reported it
    expect(result.CanChangeSender).toBe(false);
    expect(result.CanChangeRecipient).toBe(true);
    expect(result.CanChangePayerTypeOrPaymentMethod).toBe(false);
    expect(result.CanChangeBackwardDeliveryDocuments).toBe(true);
    expect(result.CanChangeBackwardDeliveryMoney).toBe(false);
    expect(result.CanChangeCash2Card).toBe(true);
    expect(result.CanChangeBackwardDeliveryOther).toBe(false);
    expect(result.CanChangeAfterpaymentType).toBe(true);
    expect(result.CanChangeLiftingOnFloor).toBe(false);
    expect(result.CanChangeLiftingOnFloorWithElevator).toBe(true);
    expect(result.CanChangeFillingWarranty).toBe(false);
  });

  it("propagates NovaPoshtaApiError unchanged when the check declines (AC-15 decline)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Waybill not found"], ["404"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService
      .checkWaybillEditPossible({ IntDocNumber: "no-such-waybill" })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Waybill not found"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["404"]);
  });
});

describe("additional-service module — createWaybillEdit (T11, AC-15/AC-16)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates the waybill edit via save/orderChangeEW (OrderType set internally), resolves typed { Number, Ref } (AC-15)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedWaybillEditOrder()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: SavedWaybillEditOrder = await additionalService.createWaybillEdit(createWaybillEditPayload());

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("save");
    expect(sentBody.methodProperties.OrderType).toBe("orderChangeEW");
    expect(sentBody.methodProperties.IntDocNumber).toBe("20450000000001");
    expect(sentBody.methodProperties.SenderContactName).toBe("Jane Doe");
    expect(result).toEqual(savedWaybillEditOrder());
  });

  it("sends a change to a field checkWaybillEditPossible just reported as not currently changeable through to the wire as-is — no client-side gating against the Can... flags (AC-16)", async () => {
    // Hypothetically, checkWaybillEditPossible just reported CanChangeSender: false. AC-16 says the
    // 11 Can... flags are informational only — this module must not branch on them before calling
    // createWaybillEdit. Nova Poshta's own response is the sole judge; the mock still returns success
    // here because this test proves absence of client-side gating, not that Nova Poshta itself declines.
    const fetchMock = mockFetchOnce(() => successEnvelope([savedWaybillEditOrder()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const payload = createWaybillEditPayload({
      SenderContactName: "Changed Sender Name",
      SenderPhone: "380500009999",
    });

    const result: SavedWaybillEditOrder = await additionalService.createWaybillEdit(payload);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    // the flagged-not-changeable fields still reach the wire byte-for-byte, unmodified, unblocked
    expect(sentBody.methodProperties.SenderContactName).toBe("Changed Sender Name");
    expect(sentBody.methodProperties.SenderPhone).toBe("380500009999");
    expect(result).toEqual(savedWaybillEditOrder());
  });

  it("propagates NovaPoshtaApiError unchanged when Nova Poshta itself declines the create call (AC-16 decline)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Sender fields are not changeable for this waybill"], ["409"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService.createWaybillEdit(createWaybillEditPayload()).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Sender fields are not changeable for this waybill"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["409"]);
  });
});

describe("additional-service module — getChangeEWOrdersList (T11, AC-17)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unfiltered: sends calledMethod getChangeEWOrdersList, resolves typed ChangeEWOrderListItem[] including before/after field values (AC-17)", async () => {
    const item = changeEWOrderListItem();
    const fetchMock = mockFetchOnce(() => successEnvelope([item]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: ChangeEWOrderListItem[] = await additionalService.getChangeEWOrdersList();

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("getChangeEWOrdersList");
    expect(result).toEqual([item]);
    // the wire's own before/after naming (AfterChangeChangeSenderCounterparty is not a typo) — proves
    // both the before and after values are present and distinct on the resolved record
    expect(result[0]!.BeforeChangeSenderCounterparty).toBe("ACME LLC");
    expect(result[0]!.AfterChangeChangeSenderCounterparty).toBe("Beta LLC");
    expect(result[0]!.BeforeChangeSenderPhone).toBe("380500000000");
    expect(result[0]!.AfterChangeSenderPhone).toBe("380500000002");
  });

  it("filter pass-through: Number/BeginDate/EndDate/Page/Limit reach the wire call unmodified, no client-side re-filtering/sorting/pagination (AC-17)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([changeEWOrderListItem()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const filters: OrderListFilters = {
      Number: "20450000000001",
      BeginDate: "01.09.2026",
      EndDate: "23.09.2026",
      Page: 1,
      Limit: 20,
    };

    await additionalService.getChangeEWOrdersList(filters);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getChangeEWOrdersList");
    expect(sentBody.methodProperties).toEqual(filters);
  });
});

// --- T12 (app layer, AC-18/AC-19): deleteAdditionalServiceOrder ---
//
// public-api.md §3.4/§5: ONE method, ONE wire call (`delete` via client.requestFirst()) shared by
// return, redirect, and waybill-edit orders alike — the library never branches on which order kind a
// Ref belongs to (it can't tell). The three happy-path cases below reuse the exact same call shape
// with three different Refs to prove that: same calledMethod, same modelName, same payload shape,
// same resolved DeletedAdditionalServiceOrder result, regardless of order kind. AC-19: the
// "Accepted"-only status gate is confirmed specifically for waybill-edit orders — a decline propagates
// unchanged, no client-side status pre-check. deleteAdditionalServiceOrder doesn't exist on the module
// yet (T4-T11 only shipped the other 17 methods), so this is expected to fail to compile/run until
// T12's implementation lands.

function deleteAdditionalServiceOrderPayload(
  overrides: Partial<DeleteAdditionalServiceOrderPayload> = {},
): DeleteAdditionalServiceOrderPayload {
  return { Ref: "return-order-ref-1", ...overrides };
}

describe("additional-service module — deleteAdditionalServiceOrder (T12, AC-18/AC-19)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes a return order: sends calledMethod delete with { Ref }, resolves the typed Number (AC-18)", async () => {
    const deleted: DeletedAdditionalServiceOrder = { Number: "1" };
    const fetchMock = mockFetchOnce(() => successEnvelope([deleted]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const payload = deleteAdditionalServiceOrderPayload({ Ref: "return-order-ref-1" });
    const result = await additionalService.deleteAdditionalServiceOrder(payload);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("delete");
    expect(sentBody.methodProperties).toEqual(payload);
    expect(result).toEqual(deleted);
  });

  it("deletes a redirect order: same calledMethod/payload shape, different Ref, same resolved result (AC-18)", async () => {
    const deleted: DeletedAdditionalServiceOrder = { Number: "2" };
    const fetchMock = mockFetchOnce(() => successEnvelope([deleted]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const payload = deleteAdditionalServiceOrderPayload({ Ref: "redirect-order-ref-1" });
    const result = await additionalService.deleteAdditionalServiceOrder(payload);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("delete");
    expect(sentBody.methodProperties).toEqual(payload);
    expect(result).toEqual(deleted);
  });

  it("deletes a waybill-edit order: same calledMethod/payload shape, different Ref, same resolved result (AC-18)", async () => {
    const deleted: DeletedAdditionalServiceOrder = { Number: "3" };
    const fetchMock = mockFetchOnce(() => successEnvelope([deleted]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const payload = deleteAdditionalServiceOrderPayload({ Ref: "waybill-edit-order-ref-1" });
    const result = await additionalService.deleteAdditionalServiceOrder(payload);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("delete");
    expect(sentBody.methodProperties).toEqual(payload);
    expect(result).toEqual(deleted);
  });

  it("propagates NovaPoshtaApiError unchanged when a non-Accepted waybill-edit order is declined, no client-side status check (AC-19)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Order is not in status Accepted"], ["409"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService
      .deleteAdditionalServiceOrder(deleteAdditionalServiceOrderPayload({ Ref: "waybill-edit-order-ref-1" }))
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Order is not in status Accepted"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["409"]);
  });
});

// --- T13 (app layer, AC-20): createReturnIfPossible ---
//
// public-api.md §3.5, spec.md §1 "Decision override": composes this module's OWN already-implemented
// checkReturnPossible + createReturn internally (this repo's precedent: scan-sheet's
// addToTodaysScanSheet calling its own getScanSheetList + insertDocuments, never a second call to
// client directly). Takes the FIRST returned ReturnAddressOption's Ref as ReturnAddressRef. An empty
// option list is treated as ineligible: throws THIS module's own NovaPoshtaApiError ("no return
// address available for this waybill") without ever attempting a create call. A check-declined
// response propagates Nova Poshta's own NovaPoshtaApiError unchanged, likewise with zero create calls
// attempted. createReturnIfPossible doesn't exist on the module yet (T4-T12 shipped the 18 raw
// methods only), so this is expected to fail to compile/run until T13's implementation lands.

/** Distinguishes successive fetch calls by index — needed here (unlike every other describe block
 *  above) because createReturnIfPossible makes TWO wire calls in sequence (check, then create) and
 *  the happy-path test must assert both the call count and each call's own calledMethod/payload. */
function mockFetchSequence(
  handlers: Array<(body: unknown) => { ok: boolean; status?: number; json: () => Promise<unknown> }>,
) {
  let callIndex = 0;
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const handler = handlers[callIndex] ?? handlers[handlers.length - 1]!;
    callIndex += 1;
    return handler(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function createReturnIfPossiblePayload(
  overrides: Partial<CreateReturnIfPossiblePayload> = {},
): CreateReturnIfPossiblePayload {
  return {
    IntDocNumber: "20450000000001",
    PaymentMethod: "Cash",
    Reason: "reason-ref-1",
    ...overrides,
  };
}

describe("additional-service module — createReturnIfPossible (T13, AC-20)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("happy path: checks then creates in one call, using the FIRST option's Ref as ReturnAddressRef, resolves the same shape createReturn would (AC-20)", async () => {
    const firstOption = returnAddressOption({ Ref: "return-address-ref-first" });
    const secondOption = returnAddressOption({ Ref: "return-address-ref-second" });
    const created = savedReturnOrder({ Ref: "return-order-ref-if-possible-1" });

    const fetchMock = mockFetchSequence([
      () => successEnvelope([firstOption, secondOption]),
      () => successEnvelope([created]),
    ]);
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result: SavedReturnOrder = await additionalService.createReturnIfPossible(
      createReturnIfPossiblePayload(),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(firstBody.modelName).toBe("AdditionalServiceGeneral");
    expect(firstBody.calledMethod).toBe("CheckPossibilityCreateReturn");
    expect(firstBody.methodProperties.Number).toBe("20450000000001");

    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondBody.modelName).toBe("AdditionalServiceGeneral");
    expect(secondBody.calledMethod).toBe("save");
    expect(secondBody.methodProperties.OrderType).toBe("orderCargoReturn");
    // uses the FIRST option's Ref, not the second's
    expect(secondBody.methodProperties.ReturnAddressRef).toBe("return-address-ref-first");
    expect(secondBody.methodProperties.IntDocNumber).toBe("20450000000001");
    expect(secondBody.methodProperties.Destination).toBeUndefined();

    expect(result).toEqual(created);
  });

  it("throws this module's own NovaPoshtaApiError when checkReturnPossible returns zero address options, no create call attempted (AC-20)", async () => {
    const fetchMock = mockFetchSequence([() => successEnvelope([])]);
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService
      .createReturnIfPossible(createReturnIfPossiblePayload())
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).message).toBe("no return address available for this waybill");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propagates Nova Poshta's own decline when the eligibility check itself declines, no create call attempted (AC-20)", async () => {
    const fetchMock = mockFetchSequence([() => declinedEnvelope(["Waybill not found"], ["404"])]);
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService
      .createReturnIfPossible(createReturnIfPossiblePayload())
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    // Nova Poshta's own message, NOT this module's "no return address available for this waybill"
    expect((err as NovaPoshtaApiError).errors).toEqual(["Waybill not found"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["404"]);
    expect((err as NovaPoshtaApiError).message).not.toBe("no return address available for this waybill");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
