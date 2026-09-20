import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../../../src/index.js";
import { createCounterpartyModule } from "../../../src/modules/counterparty/index.js";
import type { SavedAddress } from "../../../src/types/address.js";

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

describe("counterparty module — lookups (T2, AC-01/AC-02)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getCounterparties sends modelName Counterparty / calledMethod getCounterparties and returns the typed array unmodified", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "cp-1", CounterpartyType: "PrivatePerson", FirstName: "Ivan" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.getCounterparties()).resolves.toEqual([
      { Ref: "cp-1", CounterpartyType: "PrivatePerson", FirstName: "Ivan" },
    ]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("Counterparty");
    expect(sentBody.calledMethod).toBe("getCounterparties");
  });

  it("getCounterparties never injects Page when the caller omits it (AC-01)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await counterparty.getCounterparties();

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties).toEqual({});
  });

  it("getCounterparties passes Page and CounterpartyProperty through unmodified when supplied (AC-01/AC-02)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "cp-1", CounterpartyType: "Organization" }]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await counterparty.getCounterparties({ CounterpartyProperty: "Sender", Page: 2 });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getCounterparties");
    expect(sentBody.methodProperties).toEqual({ CounterpartyProperty: "Sender", Page: 2 });
  });

  it("getCounterpartiesCatalog sends calledMethod getCounterpartiesCatalog with the phone + last-name filter unmodified", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "cp-2", CounterpartyType: "PrivatePerson", LastName: "Franko" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.getCounterpartiesCatalog({ Phone: "380500000000", LastName: "Fra" }),
    ).resolves.toEqual([{ Ref: "cp-2", CounterpartyType: "PrivatePerson", LastName: "Franko" }]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("Counterparty");
    expect(sentBody.calledMethod).toBe("getCounterpartiesCatalog");
    expect(sentBody.methodProperties).toEqual({ Phone: "380500000000", LastName: "Fra" });
  });

  it("getCounterpartiesCatalog resolves an empty array, not an error, when no match is found", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.getCounterpartiesCatalog({ Phone: "380500000000" })).resolves.toEqual([]);
  });

  it("getCounterpartyContactPersons sends calledMethod getCounterpartyContactPersons with Ref unmodified", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "contact-1", FirstName: "Petro", LastName: "Ivanenko" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.getCounterpartyContactPersons({ Ref: "cp-1" })).resolves.toEqual([
      { Ref: "contact-1", FirstName: "Petro", LastName: "Ivanenko" },
    ]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("Counterparty");
    expect(sentBody.calledMethod).toBe("getCounterpartyContactPersons");
    expect(sentBody.methodProperties).toEqual({ Ref: "cp-1" });
  });
});

describe("counterparty module — cross-module address + options lookups (T3, AC-01/AC-02)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getCounterpartyAddresses sends calledMethod getCounterpartyAddresses and resolves address's own SavedAddress shape", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "addr-1", CounterpartyRef: "cp-1", StreetRef: "street-1", BuildingNumber: "12" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    const result: SavedAddress[] = await counterparty.getCounterpartyAddresses({ Ref: "cp-1" });
    expect(result).toEqual([
      { Ref: "addr-1", CounterpartyRef: "cp-1", StreetRef: "street-1", BuildingNumber: "12" },
    ]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("Counterparty");
    expect(sentBody.calledMethod).toBe("getCounterpartyAddresses");
    expect(sentBody.methodProperties).toEqual({ Ref: "cp-1" });
  });

  it("getCounterpartyOptions sends calledMethod getCounterpartyOptions and returns the typed array unmodified", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ someOption: true }]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.getCounterpartyOptions({ Ref: "cp-1" })).resolves.toEqual([{ someOption: true }]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("Counterparty");
    expect(sentBody.calledMethod).toBe("getCounterpartyOptions");
    expect(sentBody.methodProperties).toEqual({ Ref: "cp-1" });
  });
});
