import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../../src/index.js";
import { createScanSheetModule } from "../../../src/modules/scan-sheet/index.js";
import type {
  DeleteScanSheetItem,
  InsertDocumentsItem,
  RemoveDocumentsItem,
  ScanSheetDetail,
  ScanSheetListItem,
} from "../../../src/types/scan-sheet.js";

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

function declinedEnvelope(errors: string[], errorCodes: string[] = []) {
  return {
    ok: true,
    json: () => Promise.resolve({ success: false, data: [], errors, errorCodes, warnings: [] }),
  };
}

function insertItem(overrides: Partial<InsertDocumentsItem> = {}): InsertDocumentsItem {
  return { Ref: "sheet-ref-1", Number: "1", Date: "2026-09-22", Errors: [], ...overrides };
}

function scanSheetDetail(overrides: Partial<ScanSheetDetail> = {}): ScanSheetDetail {
  return {
    Ref: "sheet-ref-1",
    Number: "1",
    DateTime: "2026-09-22 10:00:00",
    Count: "3",
    CitySenderRef: "city-ref-1",
    CitySender: "Kyiv",
    SenderAddressRef: "addr-ref-1",
    SenderAddress: "1 Khreshchatyk St",
    SenderRef: "sender-ref-1",
    Sender: "ACME LLC",
    ...overrides,
  };
}

function listItem(overrides: Partial<ScanSheetListItem> = {}): ScanSheetListItem {
  return { Ref: "sheet-ref-1", Number: "1", DateTime: "2026-09-22 10:00:00", Printed: "0", ...overrides };
}

function removeItem(overrides: Partial<RemoveDocumentsItem> = {}): RemoveDocumentsItem {
  return { Ref: "waybill-ref-1", Number: "20400048799000", Error: "", ...overrides };
}

function deleteItem(overrides: Partial<DeleteScanSheetItem> = {}): DeleteScanSheetItem {
  return { Ref: "sheet-ref-1", Number: "1", Error: "", ...overrides };
}

describe("scan-sheet module — insertDocuments (T2, AC-01/AC-02)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a new sheet: omitted Ref sends an empty-string Ref on the wire, DocumentRefs unmodified (AC-01)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([insertItem()]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const documentRefs = ["waybill-ref-1", "waybill-ref-2"];
    const result = await scanSheet.insertDocuments({ DocumentRefs: documentRefs, Date: "2026-09-22" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("ScanSheet");
    expect(sentBody.calledMethod).toBe("insertDocuments");
    expect(sentBody.methodProperties.Ref).toBe("");
    expect(sentBody.methodProperties.Date).toBe("2026-09-22");
    expect(sentBody.methodProperties.DocumentRefs).toEqual(documentRefs);
    expect(result).toEqual([insertItem()]);
  });

  it("creates a new sheet when Ref is explicitly the empty string (AC-01)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([insertItem()]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await scanSheet.insertDocuments({ DocumentRefs: ["waybill-ref-1"], Ref: "", Date: "2026-09-22" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.Ref).toBe("");
  });

  it("adds to an existing sheet: a supplied Ref reaches the wire unmodified (AC-02)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([insertItem({ Ref: "existing-sheet-ref" })]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const documentRefs = ["waybill-ref-3", "waybill-ref-4", "waybill-ref-5"];
    const result = await scanSheet.insertDocuments({
      DocumentRefs: documentRefs,
      Ref: "existing-sheet-ref",
      Date: "2026-09-22",
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.Ref).toBe("existing-sheet-ref");
    // NFR §6 row 4 — a multi-item batch reaches the wire unmodified, no split/cap/reorder.
    expect(sentBody.methodProperties.DocumentRefs).toEqual(documentRefs);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual([insertItem({ Ref: "existing-sheet-ref" })]);
  });
});

describe("scan-sheet module — getScanSheet (T2, AC-04/AC-05)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns typed detail for a matching Ref (AC-04)", async () => {
    mockFetchOnce(() => successEnvelope([scanSheetDetail()]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const result = await scanSheet.getScanSheet({ Ref: "sheet-ref-1", CounterpartyRef: "" });

    expect(result).toEqual([scanSheetDetail()]);
  });

  it("returns an empty array, not an error, for a non-matching Ref (AC-04)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await expect(
      scanSheet.getScanSheet({ Ref: "no-such-sheet-ref", CounterpartyRef: "" }),
    ).resolves.toEqual([]);
  });

  it("passes CounterpartyRef through unmodified instead of Ref (AC-05)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([scanSheetDetail(), scanSheetDetail({ Ref: "sheet-ref-2" })]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const result = await scanSheet.getScanSheet({ Ref: "", CounterpartyRef: "counterparty-ref-1" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.CounterpartyRef).toBe("counterparty-ref-1");
    expect(sentBody.methodProperties.Ref).toBe("");
    expect(result).toHaveLength(2);
  });
});

describe("scan-sheet module — getScanSheetList (T2, AC-06)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns every visible sheet with Ref/Number/DateTime/Printed typed (AC-06)", async () => {
    const fetchMock = mockFetchOnce(() =>
      successEnvelope([listItem(), listItem({ Ref: "sheet-ref-2", Printed: "1" })]),
    );
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const result = await scanSheet.getScanSheetList();

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("ScanSheet");
    expect(sentBody.calledMethod).toBe("getScanSheetList");
    expect(result).toEqual([listItem(), listItem({ Ref: "sheet-ref-2", Printed: "1" })]);
  });
});

describe("scan-sheet module — removeDocuments (T2, AC-07/AC-08)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("removes waybills and returns typed per-waybill confirmation, batch unmodified (AC-07)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([removeItem(), removeItem({ Ref: "waybill-ref-2" })]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const documentRefs = ["waybill-ref-1", "waybill-ref-2"];
    const result = await scanSheet.removeDocuments({ Ref: "sheet-ref-1", DocumentRefs: documentRefs });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.Ref).toBe("sheet-ref-1");
    expect(sentBody.methodProperties.DocumentRefs).toEqual(documentRefs);
    expect(result).toEqual([removeItem(), removeItem({ Ref: "waybill-ref-2" })]);
  });

  it("does not throw when one item among several carries its own per-item Error (AC-07, ADR-0001)", async () => {
    mockFetchOnce(() =>
      successEnvelope([
        removeItem(),
        removeItem({ Ref: "waybill-ref-2", Error: "Document already removed from this sheet" }),
      ]),
    );
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const result = await scanSheet.removeDocuments({
      Ref: "sheet-ref-1",
      DocumentRefs: ["waybill-ref-1", "waybill-ref-2"],
    });

    expect(result[1]!.Error).toBe("Document already removed from this sheet");
  });

  it("makes no call to any waybill-invalidating endpoint (AC-08)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([removeItem()]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await scanSheet.removeDocuments({ Ref: "sheet-ref-1", DocumentRefs: ["waybill-ref-1"] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledMethods = fetchMock.mock.calls.map((call) => JSON.parse(call[1]!.body as string).calledMethod);
    const modelNames = fetchMock.mock.calls.map((call) => JSON.parse(call[1]!.body as string).modelName);
    expect(modelNames).toEqual(["ScanSheet"]);
    expect(calledMethods).toEqual(["removeDocuments"]);
    expect(calledMethods).not.toContain("delete");
  });
});

describe("scan-sheet module — deleteScanSheet (T2, AC-09/AC-10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes sheets and returns typed per-sheet confirmation, batch unmodified (AC-09)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([deleteItem(), deleteItem({ Ref: "sheet-ref-2" })]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const scanSheetRefs = ["sheet-ref-1", "sheet-ref-2"];
    const result = await scanSheet.deleteScanSheet({ ScanSheetRefs: scanSheetRefs });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.ScanSheetRefs).toEqual(scanSheetRefs);
    expect(result).toEqual([deleteItem(), deleteItem({ Ref: "sheet-ref-2" })]);
  });

  it("does not throw when one sheet among several carries its own per-item Error (AC-09, ADR-0001)", async () => {
    mockFetchOnce(() =>
      successEnvelope([deleteItem(), deleteItem({ Ref: "sheet-ref-2", Error: "Sheet already deleted" })]),
    );
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const result = await scanSheet.deleteScanSheet({ ScanSheetRefs: ["sheet-ref-1", "sheet-ref-2"] });

    expect(result[1]!.Error).toBe("Sheet already deleted");
  });

  it("makes no call to any waybill-invalidating endpoint (AC-10)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([deleteItem()]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await scanSheet.deleteScanSheet({ ScanSheetRefs: ["sheet-ref-1"] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledMethods = fetchMock.mock.calls.map((call) => JSON.parse(call[1]!.body as string).calledMethod);
    const modelNames = fetchMock.mock.calls.map((call) => JSON.parse(call[1]!.body as string).modelName);
    expect(modelNames).toEqual(["ScanSheet"]);
    expect(calledMethods).toEqual(["deleteScanSheet"]);
    expect(calledMethods).not.toContain("delete");
  });
});

describe("scan-sheet module — shared error contract (T2, AC-11/AC-12/AC-13)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws NovaPoshtaApiError when Nova Poshta declines the request outright (AC-11)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Scan sheet not found"], ["404"]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const err = await scanSheet
      .insertDocuments({ DocumentRefs: ["waybill-ref-1"], Date: "2026-09-22" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Scan sheet not found"]);
  });

  it("throws NovaPoshtaApiError when success is true but data isn't array-shaped (AC-11)", async () => {
    mockFetchOnce(() => ({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { not: "a list" }, errors: [], warnings: [] }),
    }));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await expect(scanSheet.getScanSheetList()).rejects.toThrow(NovaPoshtaApiError);
  });

  it("throws NovaPoshtaApiError with Nova Poshta's own message on an invalid/expired API key (AC-12)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Invalid API key"], ["401"]));
    const scanSheet = createScanSheetModule(createClient("bad-api-key"));

    const err = await scanSheet
      .insertDocuments({ DocumentRefs: ["waybill-ref-1"], Date: "2026-09-22" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Invalid API key"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["401"]);
  });

  it("throws NovaPoshtaApiError (not a raw error) on a network/transport failure (AC-13)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await expect(scanSheet.getScanSheetList()).rejects.toThrow(NovaPoshtaApiError);
  });

  it("throws NovaPoshtaApiError (not a raw error) when the response body isn't valid JSON (AC-13)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError("Unexpected token")) }),
    );
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await expect(scanSheet.getScanSheetList()).rejects.toThrow(NovaPoshtaApiError);
  });
});
