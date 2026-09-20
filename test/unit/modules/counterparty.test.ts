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

describe("counterparty module — write methods (T4, AC-03/AC-04/AC-05/AC-06/AC-07)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("save resolves the saved PrivatePerson counterparty including its own Ref (AC-04)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "cp-1", CounterpartyType: "PrivatePerson", FirstName: "Ivan", LastName: "Franko" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.save({
        CounterpartyType: "PrivatePerson",
        CounterpartyProperty: "Recipient",
        FirstName: "Ivan",
        LastName: "Franko",
        Phone: "380500000000",
      }),
    ).resolves.toEqual({ Ref: "cp-1", CounterpartyType: "PrivatePerson", FirstName: "Ivan", LastName: "Franko" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("Counterparty");
    expect(sentBody.calledMethod).toBe("save");
  });

  it("save resolves the saved Organization counterparty including its own Ref (AC-04)", async () => {
    mockFetchOnce(() => successEnvelope([{ Ref: "cp-2", CounterpartyType: "Organization", EDRPOU: "12345678" }]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.save({ CounterpartyType: "Organization", CounterpartyProperty: "Sender", EDRPOU: "12345678" }),
    ).resolves.toEqual({ Ref: "cp-2", CounterpartyType: "Organization", EDRPOU: "12345678" });
  });

  it("save resolves the saved ThirdParty counterparty including its own Ref (AC-04)", async () => {
    mockFetchOnce(() =>
      successEnvelope([{ Ref: "cp-3", CounterpartyType: "ThirdParty", EDRPOU: "87654321", CityRef: "city-1" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.save({
        CounterpartyType: "ThirdParty",
        CounterpartyProperty: "ThirdParty",
        EDRPOU: "87654321",
        CityRef: "city-1",
      }),
    ).resolves.toEqual({ Ref: "cp-3", CounterpartyType: "ThirdParty", EDRPOU: "87654321", CityRef: "city-1" });
  });

  it("save resolves undefined when Nova Poshta reports success with an empty data array (AC-07)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.save({
        CounterpartyType: "PrivatePerson",
        CounterpartyProperty: "Recipient",
        FirstName: "Ivan",
        LastName: "Franko",
        Phone: "380500000000",
      }),
    ).resolves.toBeUndefined();
  });

  it("update resolves the updated PrivatePerson counterparty including its own Ref (AC-05 happy path)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "cp-1", CounterpartyType: "PrivatePerson", FirstName: "Ivanko" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.update({
        Ref: "cp-1",
        CounterpartyType: "PrivatePerson",
        CounterpartyProperty: "Recipient",
        FirstName: "Ivanko",
        MiddleName: "Stepanovych",
        LastName: "Franko",
        Phone: "380500000000",
        Email: "ivan@example.com",
      }),
    ).resolves.toEqual({ Ref: "cp-1", CounterpartyType: "PrivatePerson", FirstName: "Ivanko" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("update");
  });

  it("update resolves undefined when Nova Poshta reports success with an empty data array (AC-07)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.update({
        Ref: "cp-1",
        CounterpartyType: "Organization",
        CounterpartyProperty: "Sender",
        EDRPOU: "12345678",
      }),
    ).resolves.toBeUndefined();
  });

  it("delete resolves the deleted counterparty's own Ref (AC-06)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "cp-1" }]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.delete({ Ref: "cp-1" })).resolves.toEqual({ Ref: "cp-1" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("Counterparty");
    expect(sentBody.calledMethod).toBe("delete");
    expect(sentBody.methodProperties).toEqual({ Ref: "cp-1" });
  });

  it("delete resolves undefined when Nova Poshta reports success with an empty data array (AC-07)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.delete({ Ref: "cp-1" })).resolves.toBeUndefined();
  });

  it("rejects an UpdateCounterpartyPayload missing a required field at compile time (AC-05)", () => {
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    // @ts-expect-error — Email/MiddleName are optional on SavePrivatePersonPayload but mandatory on update.
    void counterparty.update({
      Ref: "cp-1",
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
      FirstName: "Ivan",
      LastName: "Franko",
      Phone: "380500000000",
    });

    expect(true).toBe(true);
  });

  it("rejects an UpdateCounterpartyPayload mixing fields from more than one counterparty type at compile time (AC-05)", () => {
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    void counterparty.update({
      Ref: "cp-1",
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
      FirstName: "Ivan",
      MiddleName: "Stepanovych",
      LastName: "Franko",
      Phone: "380500000000",
      Email: "ivan@example.com",
      // @ts-expect-error — EDRPOU belongs to Organization/ThirdParty, not PrivatePerson.
      EDRPOU: "12345678",
    });

    expect(true).toBe(true);
  });
});

describe("counterparty module — contact-person write methods (T5, AC-07/AC-08/AC-09/AC-10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saveContactPerson sends modelName ContactPerson / calledMethod save and resolves the saved record's own Ref (AC-08)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "contact-1", FirstName: "Petro", LastName: "Ivanenko" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.saveContactPerson({
        CounterpartyRef: "cp-1",
        FirstName: "Petro",
        LastName: "Ivanenko",
        Phone: "380500000001",
      }),
    ).resolves.toEqual({ Ref: "contact-1", FirstName: "Petro", LastName: "Ivanenko" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("ContactPerson");
    expect(sentBody.calledMethod).toBe("save");
  });

  it("saveContactPerson resolves undefined when Nova Poshta reports success with an empty data array (AC-07)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.saveContactPerson({
        CounterpartyRef: "cp-1",
        FirstName: "Petro",
        LastName: "Ivanenko",
        Phone: "380500000001",
      }),
    ).resolves.toBeUndefined();
  });

  it("updateContactPerson sends modelName ContactPerson / calledMethod update and resolves the updated record's own Ref (AC-10)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "contact-1", FirstName: "Petro", LastName: "Ivanenko" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.updateContactPerson({
        Ref: "contact-1",
        FirstName: "Petro",
        MiddleName: "Petrovych",
        LastName: "Ivanenko",
        Phone: "380500000001",
      }),
    ).resolves.toEqual({ Ref: "contact-1", FirstName: "Petro", LastName: "Ivanenko" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("ContactPerson");
    expect(sentBody.calledMethod).toBe("update");
  });

  it("updateContactPerson resolves undefined when Nova Poshta reports success with an empty data array (AC-07)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(
      counterparty.updateContactPerson({
        Ref: "contact-1",
        FirstName: "Petro",
        MiddleName: "Petrovych",
        LastName: "Ivanenko",
        Phone: "380500000001",
      }),
    ).resolves.toBeUndefined();
  });

  it("deleteContactPerson sends modelName ContactPerson / calledMethod delete and resolves the deleted record's own Ref (AC-10)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "contact-1" }]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.deleteContactPerson({ Ref: "contact-1" })).resolves.toEqual({ Ref: "contact-1" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("ContactPerson");
    expect(sentBody.calledMethod).toBe("delete");
    expect(sentBody.methodProperties).toEqual({ Ref: "contact-1" });
  });

  it("deleteContactPerson resolves undefined when Nova Poshta reports success with an empty data array (AC-07)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.deleteContactPerson({ Ref: "contact-1" })).resolves.toBeUndefined();
  });

  it("rejects an UpdateContactPersonPayload missing MiddleName at compile time (AC-09)", () => {
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    // @ts-expect-error — MiddleName is optional on SaveContactPersonPayload but mandatory on update.
    void counterparty.updateContactPerson({
      Ref: "contact-1",
      FirstName: "Petro",
      LastName: "Ivanenko",
      Phone: "380500000001",
    });

    expect(true).toBe(true);
  });
});

describe("counterparty module — findCounterparty convenience method (T6, AC-11)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes exactly one call to getCounterparties with FindByString set to the given search string", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Ref: "cp-1", CounterpartyType: "PrivatePerson", LastName: "Franko" }]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.findCounterparty("Franko")).resolves.toEqual([
      { Ref: "cp-1", CounterpartyType: "PrivatePerson", LastName: "Franko" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.calledMethod).toBe("getCounterparties");
    expect(sentBody.methodProperties).toEqual({ FindByString: "Franko" });
  });

  it("passes the optional CounterpartyProperty through when supplied, and omits it when not (AC-11)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([]));
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await counterparty.findCounterparty("Franko", "Recipient");

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties).toEqual({ FindByString: "Franko", CounterpartyProperty: "Recipient" });
  });

  it("returns every match unmodified, without reshaping to a single record (AC-11)", async () => {
    mockFetchOnce(() =>
      successEnvelope([
        { Ref: "cp-1", CounterpartyType: "PrivatePerson", LastName: "Franko" },
        { Ref: "cp-2", CounterpartyType: "Organization", EDRPOU: "12345678" },
      ]),
    );
    const counterparty = createCounterpartyModule(createClient("test-api-key"));

    await expect(counterparty.findCounterparty("Fra")).resolves.toEqual([
      { Ref: "cp-1", CounterpartyType: "PrivatePerson", LastName: "Franko" },
      { Ref: "cp-2", CounterpartyType: "Organization", EDRPOU: "12345678" },
    ]);
  });
});
