import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../../src/index.js";
import { createAddressModule } from "../../../src/modules/address/index.js";

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

describe("address module — plain lookups (T2, AC-01/AC-02)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getCities sends modelName Address / calledMethod getCities and returns the typed array unmodified", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "city-1", Description: "Київ" }]),
    );
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.getCities()).resolves.toEqual([{ Ref: "city-1", Description: "Київ" }]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("Address");
    expect(sentBody.calledMethod).toBe("getCities");
  });

  it("getCities never injects Page/Limit when the caller omits them (AC-01)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([]));
    const address = createAddressModule(createClient("test-api-key"));

    await address.getCities();

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties).toEqual({});
  });

  it("getSettlements passes filters through unmodified (AC-02)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "settlement-1" }]));
    const address = createAddressModule(createClient("test-api-key"));

    await address.getSettlements({ FindByString: "Львів", Page: 2 });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getSettlements");
    expect(sentBody.methodProperties).toEqual({ FindByString: "Львів", Page: 2 });
  });

  it("getAreas sends calledMethod getAreas and returns the typed array unmodified", async () => {
    mockFetchOnce(() => successEnvelope([{ Ref: "area-1", Description: "Київська область" }]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.getAreas()).resolves.toEqual([{ Ref: "area-1", Description: "Київська область" }]);
  });

  it("getWarehouseTypes sends calledMethod getWarehouseTypes and returns the typed array unmodified", async () => {
    mockFetchOnce(() => successEnvelope([{ Ref: "wtype-1", Description: "Відділення" }]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.getWarehouseTypes()).resolves.toEqual([{ Ref: "wtype-1", Description: "Відділення" }]);
  });

});

describe("address module — filtered directory lookups (T3, AC-01/AC-02)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getStreet requires CityRef and passes the full filter object through verbatim", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "street-1", Description: "Хрещатик" }]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.getStreet({ CityRef: "city-1", FindByString: "Хрещ" })).resolves.toEqual([
      { Ref: "street-1", Description: "Хрещатик" },
    ]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getStreet");
    expect(sentBody.methodProperties).toEqual({ CityRef: "city-1", FindByString: "Хрещ" });
  });

  it("getWarehouses passes every documented filter field through with no client-side re-filtering (AC-02)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "wh-1", Number: "1" }]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(
      address.getWarehouses({ CityRef: "city-1", TypeOfWarehouseRef: "type-1" }),
    ).resolves.toEqual([{ Ref: "wh-1", Number: "1" }]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getWarehouses");
    expect(sentBody.methodProperties).toEqual({ CityRef: "city-1", TypeOfWarehouseRef: "type-1" });
  });
});

describe("address module — decline error branch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws NovaPoshtaApiError on a decline, passing Nova Poshta's message through (AC-08)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () => Promise.resolve({ success: false, data: [], errors: ["Invalid API key"], errorCodes: ["401"], warnings: [] }),
    }));
    const address = createAddressModule(createClient("test-api-key"));

    const err = await address.getCities().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Invalid API key"]);
  });
});
