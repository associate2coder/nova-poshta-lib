import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../../src/index.js";
import { createAdditionalServiceModule } from "../../../src/modules/additional-service/index.js";
import type {
  CreateReturnPayload,
  CreateReturnToNewAddressPayload,
  CreateReturnToNewWarehousePayload,
  CreateReturnToSenderAddressPayload,
  OrderPricingEstimate,
  ReturnAddressOption,
  ReturnEditOption,
  SavedReturnOrder,
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
