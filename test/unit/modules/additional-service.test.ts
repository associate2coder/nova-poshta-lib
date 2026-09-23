import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../../src/index.js";
import { createAdditionalServiceModule } from "../../../src/modules/additional-service/index.js";
import type {
  CreateReturnPayload,
  CreateReturnToNewAddressPayload,
  CreateReturnToNewWarehousePayload,
  CreateReturnToSenderAddressPayload,
  OrderListFilters,
  OrderPricingEstimate,
  ReturnAddressOption,
  ReturnEditOption,
  ReturnOrderListItem,
  ReturnReason,
  ReturnReasonSubtype,
  ReturnReasonSubtypeFilters,
  SavedReturnOrder,
  UpdateReturnPayload,
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
