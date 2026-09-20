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

describe("address module — search-wrapper lookups (T4, AC-01/AC-02/AC-03)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("searchSettlements resolves the wrapper object itself, not just Addresses (AC-03)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ TotalCount: 1, Addresses: [{ Ref: "settlement-1", Present: "Київ" }] }]),
    );
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.searchSettlements({ CityName: "Ки" })).resolves.toEqual({
      TotalCount: 1,
      Addresses: [{ Ref: "settlement-1", Present: "Київ" }],
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("searchSettlements");
    expect(sentBody.methodProperties).toEqual({ CityName: "Ки" });
  });

  it("searchSettlements resolves undefined when the envelope's data array is empty", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.searchSettlements({ CityName: "??" })).resolves.toBeUndefined();
  });

  it("searchSettlementStreets resolves the wrapper object itself, Addresses left verbatim (AC-03)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ TotalCount: 1, Addresses: [{ Ref: "street-1", Present: "Хрещатик" }] }]),
    );
    const address = createAddressModule(createClient("test-api-key"));

    await expect(
      address.searchSettlementStreets({ StreetName: "Хрещ", SettlementRef: "settlement-1" }),
    ).resolves.toEqual({ TotalCount: 1, Addresses: [{ Ref: "street-1", Present: "Хрещатик" }] });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("searchSettlementStreets");
  });

  it("searchSettlementStreets resolves undefined when the envelope's data array is empty", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(
      address.searchSettlementStreets({ StreetName: "??", SettlementRef: "settlement-1" }),
    ).resolves.toBeUndefined();
  });
});

describe("address module — write methods (T5, AC-04/AC-05/AC-06/AC-07)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("save resolves the saved record including its own Ref (AC-04)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "address-1", CounterpartyRef: "cp-1", StreetRef: "street-1", BuildingNumber: "12" }]),
    );
    const address = createAddressModule(createClient("test-api-key"));

    await expect(
      address.save({ CounterpartyRef: "cp-1", StreetRef: "street-1", BuildingNumber: "12" }),
    ).resolves.toEqual({ Ref: "address-1", CounterpartyRef: "cp-1", StreetRef: "street-1", BuildingNumber: "12" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("save");
    expect(sentBody.methodProperties).toEqual({ CounterpartyRef: "cp-1", StreetRef: "street-1", BuildingNumber: "12" });
  });

  it("save resolves undefined when Nova Poshta reports success with an empty data array (AC-07)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(
      address.save({ CounterpartyRef: "cp-1", StreetRef: "street-1", BuildingNumber: "12" }),
    ).resolves.toBeUndefined();
  });

  it("update resolves the updated record including its own Ref (AC-05 happy path)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "address-1", BuildingNumber: "13" }]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(
      address.update({
        Ref: "address-1",
        CounterpartyRef: "cp-1",
        StreetRef: "street-1",
        BuildingNumber: "13",
        Flat: "3",
        Note: "",
      }),
    ).resolves.toEqual({ Ref: "address-1", BuildingNumber: "13" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("update");
  });

  it("update resolves undefined when Nova Poshta reports success with an empty data array (AC-07)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(
      address.update({
        Ref: "address-1",
        CounterpartyRef: "cp-1",
        StreetRef: "street-1",
        BuildingNumber: "13",
        Flat: "3",
        Note: "",
      }),
    ).resolves.toBeUndefined();
  });

  it("delete resolves the deleted address's own Ref (AC-06)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "address-1" }]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.delete({ Ref: "address-1" })).resolves.toEqual({ Ref: "address-1" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("delete");
    expect(sentBody.methodProperties).toEqual({ Ref: "address-1" });
  });

  it("delete resolves undefined when Nova Poshta reports success with an empty data array (AC-07)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.delete({ Ref: "address-1" })).resolves.toBeUndefined();
  });

  it("rejects an UpdateAddressPayload missing a field at compile time (AC-05)", () => {
    const address = createAddressModule(createClient("test-api-key"));

    // @ts-expect-error — Flat is optional on SaveAddressPayload but mandatory on UpdateAddressPayload.
    void address.update({
      Ref: "address-1",
      CounterpartyRef: "cp-1",
      StreetRef: "street-1",
      BuildingNumber: "13",
      Note: "",
    });

    expect(true).toBe(true);
  });
});

describe("address module — findCityByName convenience method (T6, AC-11)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes exactly one call to getCities with FindByString set to the given name", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "city-1", Description: "Київ" }]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.findCityByName("Київ")).resolves.toEqual([{ Ref: "city-1", Description: "Київ" }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getCities");
    expect(sentBody.methodProperties).toEqual({ FindByString: "Київ" });
  });

  it("returns every match unmodified, without reshaping to a single record (AC-11)", async () => {
    mockFetchOnce(() =>
      successEnvelope([
        { Ref: "city-1", Description: "Київ" },
        { Ref: "city-2", Description: "Київське" },
      ]),
    );
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.findCityByName("Ки")).resolves.toEqual([
      { Ref: "city-1", Description: "Київ" },
      { Ref: "city-2", Description: "Київське" },
    ]);
  });

  it("resolves an empty array when the result is empty", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.findCityByName("Nonexistent")).resolves.toEqual([]);
  });
});

describe("address module — no caching across calls (AC-12)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("issues an independent request on every call — nothing memoized or stale", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { methodProperties?: { FindByString?: string } };
      const description = body.methodProperties?.FindByString === "Львів" ? "Львів" : "Київ";
      return successEnvelope([{ Ref: `city-${description}`, Description: description }]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const address = createAddressModule(createClient("test-api-key"));

    const first = await address.getCities({ FindByString: "Київ" });
    const second = await address.getCities({ FindByString: "Львів" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first).toEqual([{ Ref: "city-Київ", Description: "Київ" }]);
    expect(second).toEqual([{ Ref: "city-Львів", Description: "Львів" }]);
  });
});

describe("address module — shared error contract (T8, AC-08/AC-09/AC-10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws NovaPoshtaApiError when declined for a non-authorization reason (AC-08)", async () => {
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
    const address = createAddressModule(createClient("test-api-key"));

    const err = await address.getCities().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Unsupported filter value"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["400"]);
  });

  it("throws NovaPoshtaApiError when success is true but data isn't array-shaped (AC-08)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { not: "a list" }, errors: [], warnings: [] }),
    }));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.getCities()).rejects.toThrow(NovaPoshtaApiError);
  });

  it("throws NovaPoshtaApiError with Nova Poshta's own message on an invalid/expired API key or cross-counterparty write (AC-09)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () =>
        Promise.resolve({ success: false, data: [], errors: ["Invalid API key"], errorCodes: ["401"], warnings: [] }),
    }));
    const address = createAddressModule(createClient("test-api-key"));

    const err = await address
      .save({ CounterpartyRef: "cp-other", StreetRef: "street-1", BuildingNumber: "12" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Invalid API key"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["401"]);
  });

  it("throws NovaPoshtaApiError (not a raw error) on a network/transport failure (AC-10)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.getCities()).rejects.toThrow(NovaPoshtaApiError);
  });

  it("throws NovaPoshtaApiError (not a raw error) when the response body isn't valid JSON (AC-10)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError("Unexpected token")) }),
    );
    const address = createAddressModule(createClient("test-api-key"));

    await expect(address.getCities()).rejects.toThrow(NovaPoshtaApiError);
  });
});

describe("address module — overhead benchmark (spec §6 NFR row 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("median library-added overhead is <=5ms across >=30 stubbed calls", async () => {
    mockFetchOnce(() => successEnvelope([{ Ref: "city-1" }]));
    const address = createAddressModule(createClient("test-api-key"));

    const samples: number[] = [];
    const runs = 30;
    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      await address.getCities();
      samples.push(performance.now() - start);
    }

    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(runs / 2)];
    expect(median).toBeLessThanOrEqual(5);
  });
});
