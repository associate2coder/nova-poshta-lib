import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../../src/index.js";
import { createInternetDocumentModule } from "../../../src/modules/internet-document/index.js";
import type { InternetDocumentModule } from "../../../src/modules/internet-document/index.js";
import type { SaveInternetDocumentPayload, UpdateInternetDocumentPayload } from "../../../src/types/internet-document.js";

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

const validSavePayload: SaveInternetDocumentPayload = {
  ServiceType: "WarehouseWarehouse",
  RecipientAddress: "warehouse-ref-1",
  CargoType: "Parcel",
  PayerType: "Sender",
  PaymentMethod: "Cash",
  DateTime: "21.09.2026",
  Weight: 1,
  SeatsAmount: 1,
  Description: "Books",
  Cost: 500,
  CitySender: "city-sender-1",
  Sender: "sender-1",
  SenderAddress: "sender-addr-1",
  ContactSender: "contact-sender-1",
  SendersPhone: "380500000000",
  CityRecipient: "city-recipient-1",
  Recipient: "recipient-1",
  ContactRecipient: "contact-recipient-1",
  RecipientsPhone: "380500000001",
};

const validUpdatePayload: UpdateInternetDocumentPayload = {
  ...validSavePayload,
  BackwardDeliveryData: undefined,
  Ref: "waybill-1",
};

const savedWaybill = {
  Ref: "waybill-1",
  CostOnSite: 520,
  EstimatedDeliveryDate: "23.09.2026",
  IntDocNumber: "20450000000001",
  TypeDocument: "InternetDocument",
};

describe("internet-document module — save/update (T2, AC-01/AC-02/AC-05/AC-06)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("save sends modelName InternetDocument / calledMethod save and resolves the created waybill's Ref + IntDocNumber (AC-01)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedWaybill]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.save(validSavePayload)).resolves.toEqual(savedWaybill);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("InternetDocument");
    expect(sentBody.calledMethod).toBe("save");
  });

  it("save resolves undefined when Nova Poshta reports success with an empty data array (AC-05)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.save(validSavePayload)).resolves.toBeUndefined();
  });

  it("update sends calledMethod update and resolves the updated waybill's Ref + IntDocNumber", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedWaybill]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.update(validUpdatePayload)).resolves.toEqual(savedWaybill);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("InternetDocument");
    expect(sentBody.calledMethod).toBe("update");
  });

  it("update resolves undefined when Nova Poshta reports success with an empty data array (AC-05)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.update(validUpdatePayload)).resolves.toBeUndefined();
  });

  it("update without a previously-set BackwardDeliveryData clears it, per the full-replace convention (AC-06)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedWaybill]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));
    const { BackwardDeliveryData, ...payloadWithoutBackwardDelivery } = validUpdatePayload;
    void BackwardDeliveryData;

    await internetDocument.update({ ...validUpdatePayload, BackwardDeliveryData: undefined });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    // Falsifiable form: the sent body is exactly the caller's payload minus the omitted field —
    // not merely "the key parses to undefined", which JSON.stringify would guarantee regardless
    // of module behavior.
    expect(sentBody.methodProperties).toEqual(payloadWithoutBackwardDelivery);
  });

  // AC-02's compile-time discriminated-payload coverage (every ServiceType leg, both sender and
  // recipient sides, plus CargoType) lives in test/unit/types/internet-document.test.ts, per this
  // repo's convention (address/counterparty keep type-level tests in a separate file).
});

describe("internet-document module — delete (T3, AC-07/AC-08)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a single-Ref delete returns a one-element outcome array confirming the Ref was removed (AC-07)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "waybill-1" }]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.delete({ Documents: ["waybill-1"] })).resolves.toEqual([
      { Ref: "waybill-1", Removed: true },
    ]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("InternetDocument");
    expect(sentBody.calledMethod).toBe("delete");
    expect(sentBody.methodProperties).toEqual({ DocumentRefs: ["waybill-1"] });
  });

  it("a batch delete returns one outcome entry per submitted Ref, all removed", async () => {
    mockFetchOnce(() => successEnvelope([{ Ref: "waybill-1" }, { Ref: "waybill-2" }]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.delete({ Documents: ["waybill-1", "waybill-2"] })).resolves.toEqual([
      { Ref: "waybill-1", Removed: true },
      { Ref: "waybill-2", Removed: true },
    ]);
  });

  it("a batch delete reconciles a Ref missing from Nova Poshta's confirmed-removed set as Removed:false, with a fallback Reason when Nova Poshta gives none (AC-08)", async () => {
    mockFetchOnce(() => successEnvelope([{ Ref: "waybill-1" }]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.delete({ Documents: ["waybill-1", "waybill-2"] })).resolves.toEqual([
      { Ref: "waybill-1", Removed: true },
      { Ref: "waybill-2", Removed: false, Reason: "Not confirmed removed by Nova Poshta" },
    ]);
  });

  it("a batch delete's rejected Reason is Nova Poshta's own success-path warning text, when present (AC-08)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [{ Ref: "waybill-1" }],
          errors: [],
          warnings: ["waybill-2: Ref does not belong to caller's account"],
        }),
    }));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.delete({ Documents: ["waybill-1", "waybill-2"] })).resolves.toEqual([
      { Ref: "waybill-1", Removed: true },
      {
        Ref: "waybill-2",
        Removed: false,
        Reason: "waybill-2: Ref does not belong to caller's account",
      },
    ]);
  });

  it("a rejected Ref's Reason is read from errors too, not only warnings, when both are present (N3)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [{ Ref: "waybill-1" }],
          errors: ["waybill-2: Ref does not belong to caller's account"],
          warnings: ["unrelated success-path notice"],
        }),
    }));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.delete({ Documents: ["waybill-1", "waybill-2"] })).resolves.toEqual([
      { Ref: "waybill-1", Removed: true },
      {
        Ref: "waybill-2",
        Removed: false,
        Reason: "waybill-2: Ref does not belong to caller's account",
      },
    ]);
  });

  it("each rejected Ref in a batch gets its own matching reason, not one text stamped onto all of them (N3)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [{ Ref: "waybill-1" }],
          errors: [],
          warnings: [
            "waybill-2: Ref does not belong to caller's account",
            "waybill-3: Ref already deleted",
          ],
        }),
    }));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(
      internetDocument.delete({ Documents: ["waybill-1", "waybill-2", "waybill-3"] }),
    ).resolves.toEqual([
      { Ref: "waybill-1", Removed: true },
      { Ref: "waybill-2", Removed: false, Reason: "waybill-2: Ref does not belong to caller's account" },
      { Ref: "waybill-3", Removed: false, Reason: "waybill-3: Ref already deleted" },
    ]);
  });
});

describe("internet-document module — getDocumentList/getDocumentPrice/getDocumentDeliveryDate (T4, AC-03/AC-04/AC-09/AC-10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const listItem = {
    Ref: "waybill-1",
    DateTime: "21.09.2026",
    IntDocNumber: "20450000000001",
    Cost: 500,
    CitySender: "city-sender-1",
    CityRecipient: "city-recipient-1",
    CostOnSite: 520,
    PayerType: "Sender",
    PaymentMethod: "Cash",
    AfterpaymentOnGoodsCost: 0,
    StateId: 1,
    StateName: "In transit",
  };

  it("getDocumentList with no filters returns the typed page and never injects Page (AC-09)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([listItem]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.getDocumentList()).resolves.toEqual([listItem]);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("InternetDocument");
    expect(sentBody.calledMethod).toBe("getDocumentList");
    expect(sentBody.methodProperties).toEqual({});
  });

  it("getDocumentList passes a documented date-range filter through unmodified, no client-side re-filtering (AC-10)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([listItem]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await internetDocument.getDocumentList({ DateTimeFrom: "01.09.2026", DateTimeTo: "21.09.2026", Page: 2 });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties).toEqual({ DateTimeFrom: "01.09.2026", DateTimeTo: "21.09.2026", Page: 2 });
  });

  it("getDocumentPrice returns Nova Poshta's calculated price unchanged (AC-03)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([{ Cost: 500, AssessedCost: 500, CostRedelivery: 0 }]),
    );
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(
      internetDocument.getDocumentPrice({
        CitySender: "city-sender-1",
        CityRecipient: "city-recipient-1",
        Weight: 1,
        ServiceType: "WarehouseWarehouse",
        CargoType: "Parcel",
        Cost: 500,
        SeatsAmount: 1,
      }),
    ).resolves.toEqual({ Cost: 500, AssessedCost: 500, CostRedelivery: 0 });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("InternetDocument");
    expect(sentBody.calledMethod).toBe("getDocumentPrice");
  });

  it("getDocumentDeliveryDate returns Nova Poshta's calculated date unchanged (AC-04)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Date: "23.09.2026", Timezone: "Europe/Kyiv" }]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(
      internetDocument.getDocumentDeliveryDate({
        DateTime: "21.09.2026",
        ServiceType: "WarehouseWarehouse",
        CitySender: "city-sender-1",
        CityRecipient: "city-recipient-1",
      }),
    ).resolves.toEqual({ Date: "23.09.2026", Timezone: "Europe/Kyiv" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("InternetDocument");
    expect(sentBody.calledMethod).toBe("getDocumentDeliveryDate");
  });
});

describe("internet-document module — printDocument/printMarkings (T5, AC-11/AC-12/AC-13)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("printDocument builds the exact expected URL and verifies it with a single GET request, never through the JSON-envelope path (AC-11)", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      void init;
      return { ok: true, status: 200 };
    });
    vi.stubGlobal("fetch", fetchMock);
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    const link = await internetDocument.printDocument({ Documents: ["waybill-1", "waybill-2"] });

    expect(link).toBe(
      "https://my.novaposhta.ua/orders/printDocument/orders[]/waybill-1/orders[]/waybill-2/apiKey/test-api-key",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(link);
    // GET, not HEAD (N5): Nova Poshta's print endpoint never confirmed HEAD support (spec.md §8
    // OQ-1), so verification uses the same verb a browser would and discards the body itself
    // (finding 11) rather than betting on an unconfirmed method.
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: "GET" });
  });

  it("printDocument discards the verification response body instead of holding the connection open (finding 11, P6)", async () => {
    const cancel = vi.fn(() => Promise.resolve());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, body: { cancel } })),
    );
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await internetDocument.printDocument({ Documents: ["waybill-1"] });

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("printDocument doesn't reject when the response body's cancel() itself rejects (P5)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        body: { cancel: () => Promise.reject(new Error("stream already errored")) },
      })),
    );
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.printDocument({ Documents: ["waybill-1"] })).resolves.toBeDefined();
  });

  it("printDocument builds the Type and Copies segments into the URL when supplied (AC-11)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200 })),
    );
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    const link = await internetDocument.printDocument({
      Documents: ["waybill-1"],
      Type: "Pdf",
      Copies: "double",
    });

    expect(link).toBe(
      "https://my.novaposhta.ua/orders/printDocument/orders[]/waybill-1/type/Pdf/copies/double/apiKey/test-api-key",
    );
  });

  it("printDocument rejects an empty Documents list without issuing a request (contracts/public-api.md §3)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.printDocument({ Documents: [] })).rejects.toThrow(NovaPoshtaApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("printMarkings returns a single verified URL string for the label, same contract as printDocument (AC-12)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200 })),
    );
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    const link = await internetDocument.printMarkings({ Documents: ["waybill-1"] });

    expect(link).toBe("https://my.novaposhta.ua/orders/printMarkings/orders[]/waybill-1/apiKey/test-api-key");
  });

  it("the returned link is the constructed URL unmodified — no redaction of the embedded apiKey (AC-13)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200 })),
    );
    const internetDocument = createInternetDocumentModule(createClient("my-secret-key"));

    const link = await internetDocument.printDocument({ Documents: ["waybill-1"] });

    expect(link).toContain("my-secret-key");
  });

  it("printDocument throws NovaPoshtaApiError when the verification check fails (invalid Ref / unmaterialized document) (AC-11)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.printDocument({ Documents: ["waybill-1"] })).rejects.toThrow(NovaPoshtaApiError);
  });

  it("printMarkings throws NovaPoshtaApiError when the verification fetch itself fails (network failure) (AC-16)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.printMarkings({ Documents: ["waybill-1"] })).rejects.toThrow(NovaPoshtaApiError);
  });
});

const validPricePayload = {
  CitySender: "city-sender-1",
  CityRecipient: "city-recipient-1",
  Weight: 1,
  ServiceType: "WarehouseWarehouse",
  CargoType: "Parcel",
  Cost: 500,
  SeatsAmount: 1,
} as const;

const validDeliveryDatePayload = {
  DateTime: "21.09.2026",
  ServiceType: "WarehouseWarehouse",
  CitySender: "city-sender-1",
  CityRecipient: "city-recipient-1",
} as const;

// The 6 JSON-enveloped methods (save/update/delete/getDocumentList/getDocumentPrice/
// getDocumentDeliveryDate) all share client.request()'s single error-mapping path — exercised once
// per method here rather than duplicated per-AC block above.
const enveloped: [string, (m: InternetDocumentModule) => Promise<unknown>][] = [
  ["save", (m) => m.save(validSavePayload)],
  ["update", (m) => m.update(validUpdatePayload)],
  ["delete", (m) => m.delete({ Documents: ["waybill-1"] })],
  ["getDocumentList", (m) => m.getDocumentList()],
  ["getDocumentPrice", (m) => m.getDocumentPrice(validPricePayload)],
  ["getDocumentDeliveryDate", (m) => m.getDocumentDeliveryDate(validDeliveryDatePayload)],
];

describe("internet-document module — shared error contract across all 8 methods (T7, AC-14/AC-15/AC-16)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(enveloped)("%s throws NovaPoshtaApiError when Nova Poshta declines the request (AC-14)", async (_name, invoke) => {
    mockFetchOnce(() => ({
      ok: true,
      json: () =>
        Promise.resolve({ success: false, data: [], errors: ["Invalid Ref"], errorCodes: ["400"], warnings: [] }),
    }));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    const err = await invoke(internetDocument).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Invalid Ref"]);
  });

  it.each(enveloped)("%s throws NovaPoshtaApiError when success is true but data isn't array-shaped (AC-14)", async (_name, invoke) => {
    mockFetchOnce(() => ({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { not: "a list" }, errors: [], warnings: [] }),
    }));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(invoke(internetDocument)).rejects.toThrow(NovaPoshtaApiError);
  });

  it.each(enveloped)("%s throws NovaPoshtaApiError with Nova Poshta's message on an authorization denial (AC-15)", async (_name, invoke) => {
    mockFetchOnce(() => ({
      ok: true,
      json: () =>
        Promise.resolve({ success: false, data: [], errors: ["Invalid API key"], errorCodes: ["401"], warnings: [] }),
    }));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    const err = await invoke(internetDocument).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Invalid API key"]);
  });

  it.each(enveloped)("%s throws NovaPoshtaApiError (not a raw error) on a network/transport failure (AC-16)", async (_name, invoke) => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(invoke(internetDocument)).rejects.toThrow(NovaPoshtaApiError);
  });

  it.each(enveloped)("%s throws NovaPoshtaApiError (not a raw error) when the response body isn't valid JSON (AC-16)", async (_name, invoke) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError("Unexpected token")) }),
    );
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(invoke(internetDocument)).rejects.toThrow(NovaPoshtaApiError);
  });

  it("getDocumentPrice throws NovaPoshtaApiError when Nova Poshta reports success but returns no estimate (AC-14)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.getDocumentPrice(validPricePayload)).rejects.toThrow(NovaPoshtaApiError);
  });

  it("getDocumentDeliveryDate throws NovaPoshtaApiError when Nova Poshta reports success but returns no estimate (AC-14)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.getDocumentDeliveryDate(validDeliveryDatePayload)).rejects.toThrow(
      NovaPoshtaApiError,
    );
  });
});

describe("internet-document module — authoritative Ref source, no caching (T7, AC-17)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("save issues an independent request every call — the returned Ref/IntDocNumber is exactly Nova Poshta's response, never invented or cached", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async () => {
      callCount += 1;
      return successEnvelope([{ ...savedWaybill, Ref: `waybill-${callCount}`, IntDocNumber: `2045000000000${callCount}` }]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    const first = await internetDocument.save(validSavePayload);
    const second = await internetDocument.save(validSavePayload);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first?.Ref).toBe("waybill-1");
    expect(second?.Ref).toBe("waybill-2");
  });
});

describe("internet-document module — no local Ref validation (T7, AC-18)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a syntactically-arbitrary Ref string reaches the outgoing delete request unchanged — no local validity/ownership check", async () => {
    const arbitraryRef = "not-a-real-uuid-!@#$%";
    const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: arbitraryRef }]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await internetDocument.delete({ Documents: [arbitraryRef] });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.DocumentRefs).toEqual([arbitraryRef]);
  });

  it("only Nova Poshta's own decline rejects an out-of-scope Ref — the library performs no check of its own before sending", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () =>
        Promise.resolve({ success: false, data: [], errors: ["Ref does not belong to caller"], errorCodes: ["403"], warnings: [] }),
    }));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.delete({ Documents: ["someone-elses-waybill"] })).rejects.toThrow(
      NovaPoshtaApiError,
    );
  });
});

describe("internet-document module — overhead benchmark across all 8 methods (T7, spec §6 NFR row 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const benchmarked: [string, (m: InternetDocumentModule) => Promise<unknown>][] = [
    ...enveloped,
    ["printDocument", (m) => m.printDocument({ Documents: ["waybill-1"] })],
    ["printMarkings", (m) => m.printMarkings({ Documents: ["waybill-1"] })],
  ];

  it.each(benchmarked)("%s median library-added overhead is <=5ms across >=30 stubbed calls", async (_name, invoke) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (typeof url === "string" && url.startsWith("https://my.novaposhta.ua/")) {
          return { ok: true, status: 200 };
        }
        return successEnvelope([savedWaybill]);
      }),
    );
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    const samples: number[] = [];
    const runs = 30;
    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      await invoke(internetDocument);
      samples.push(performance.now() - start);
    }

    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(runs / 2)];
    expect(median).toBeLessThanOrEqual(5);
  });
});
