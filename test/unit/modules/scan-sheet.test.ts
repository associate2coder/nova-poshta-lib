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

/** Sequential per-call fetch mock (addToTodaysScanSheet, T3, AC-03) — call N gets handlers[N],
 *  or the last handler if there are more calls than handlers. Lets a test control
 *  getScanSheetList's response distinctly from insertDocuments's. */
function mockFetchSequence(
  handlers: Array<(body: { calledMethod: string; methodProperties: Record<string, unknown> }) => {
    ok: boolean;
    json: () => Promise<unknown>;
  }>,
) {
  let call = 0;
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const handler = handlers[call] ?? handlers[handlers.length - 1]!;
    call += 1;
    return handler(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** T3/AC-03 — today's Europe/Kyiv calendar date as YYYY-MM-DD, computed independently of the
 *  module under test so the fixtures stay correct regardless of when the suite runs. */
function kyivTodayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

  it("resolves with [] and does not throw when success is true but data is a completely empty array (AC-01, ADR-0001)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await expect(
      scanSheet.insertDocuments({ DocumentRefs: ["waybill-ref-1", "waybill-ref-2"], Date: "2026-09-22" }),
    ).resolves.toEqual([]);
  });

  // review-2026-09-22.md finding 7 — mirrors the equivalent removeDocuments/deleteScanSheet tests
  // below; README.md explicitly tells callers to inspect insertDocuments's per-item Errors field.
  it("does not throw when one item among several carries its own per-item Errors value (AC-01, ADR-0001)", async () => {
    mockFetchOnce(() =>
      successEnvelope([
        insertItem(),
        insertItem({ Ref: "sheet-ref-2", Errors: ["Waybill already on a scan sheet"] }),
      ]),
    );
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const result = await scanSheet.insertDocuments({
      DocumentRefs: ["waybill-ref-1", "waybill-ref-2"],
      Date: "2026-09-22",
    });

    expect(result[1]!.Errors).toEqual(["Waybill already on a scan sheet"]);
  });

  // review-2026-09-22.md finding 8 — the empty-array tests above cover an empty *response*
  // (ADR-0001); this covers an empty *request* array reaching the wire unmodified.
  it("passes an empty DocumentRefs request array through to the wire unmodified (AC-01, pass-through non-goal)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await scanSheet.insertDocuments({ DocumentRefs: [], Date: "2026-09-22" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.DocumentRefs).toEqual([]);
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

  it("resolves with [] and does not throw when success is true but data is a completely empty array (AC-07, ADR-0001)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await expect(
      scanSheet.removeDocuments({ Ref: "sheet-ref-1", DocumentRefs: ["waybill-ref-1", "waybill-ref-2"] }),
    ).resolves.toEqual([]);
  });

  // review-2026-09-22.md finding 8 (re-review) — T12's DoD covers DocumentRefs/ScanSheetRefs on
  // both write methods, not just insertDocuments's DocumentRefs.
  it("passes an empty DocumentRefs request array through to the wire unmodified (AC-07, pass-through non-goal)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await scanSheet.removeDocuments({ Ref: "sheet-ref-1", DocumentRefs: [] });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.DocumentRefs).toEqual([]);
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

  it("resolves with [] and does not throw when success is true but data is a completely empty array (AC-09, ADR-0001)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await expect(
      scanSheet.deleteScanSheet({ ScanSheetRefs: ["sheet-ref-1", "sheet-ref-2"] }),
    ).resolves.toEqual([]);
  });

  // review-2026-09-22.md finding 8 (re-review) — T12's DoD covers DocumentRefs/ScanSheetRefs on
  // both write methods, not just insertDocuments's DocumentRefs.
  it("passes an empty ScanSheetRefs request array through to the wire unmodified (AC-09, pass-through non-goal)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await scanSheet.deleteScanSheet({ ScanSheetRefs: [] });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.ScanSheetRefs).toEqual([]);
  });

  // review-2026-09-22.md finding 8 — AC-09's "a subsequent getScanSheetList call no longer includes
  // a successfully deleted sheet" postcondition, observed end-to-end across two calls.
  it("a deleted sheet's Ref is absent from a subsequent getScanSheetList call (AC-09 postcondition)", async () => {
    const fetchMock = mockFetchSequence([
      () => successEnvelope([deleteItem({ Ref: "sheet-ref-1" })]),
      () => successEnvelope([listItem({ Ref: "sheet-ref-2" })]),
    ]);
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    await scanSheet.deleteScanSheet({ ScanSheetRefs: ["sheet-ref-1"] });
    const remaining = await scanSheet.getScanSheetList();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(remaining.some((sheet) => sheet.Ref === "sheet-ref-1")).toBe(false);
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

describe("scan-sheet module — addToTodaysScanSheet (T3, AC-03)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("picks the most recently created still-unprinted today-sheet when 2+ match (AC-03)", async () => {
    const today = kyivTodayDateString();
    const olderTodayUnprinted = listItem({ Ref: "older-today-ref", DateTime: `${today} 09:00:00`, Printed: "0" });
    const newerTodayUnprinted = listItem({ Ref: "newer-today-ref", DateTime: `${today} 15:30:00`, Printed: "0" });
    const todayButPrinted = listItem({ Ref: "printed-today-ref", DateTime: `${today} 23:00:00`, Printed: "1" });
    const otherDayUnprinted = listItem({ Ref: "other-day-ref", DateTime: "2020-01-01 10:00:00", Printed: "0" });

    const fetchMock = mockFetchSequence([
      () => successEnvelope([olderTodayUnprinted, newerTodayUnprinted, todayButPrinted, otherDayUnprinted]),
      () => successEnvelope([insertItem({ Ref: "newer-today-ref" })]),
    ]);
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const documentRefs = ["waybill-ref-1", "waybill-ref-2"];
    const result = await scanSheet.addToTodaysScanSheet(documentRefs);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(firstBody.calledMethod).toBe("getScanSheetList");
    expect(secondBody.calledMethod).toBe("insertDocuments");
    expect(secondBody.methodProperties.Ref).toBe("newer-today-ref");
    expect(secondBody.methodProperties.DocumentRefs).toEqual(documentRefs);
    expect(secondBody.methodProperties.Date).toBe(today);
    expect(result).toEqual([insertItem({ Ref: "newer-today-ref" })]);
  });

  it("creates a new sheet (empty-string Ref) when no today-unprinted sheet exists (AC-03)", async () => {
    const today = kyivTodayDateString();
    const todayButPrinted = listItem({ Ref: "printed-today-ref", DateTime: `${today} 08:00:00`, Printed: "1" });
    const otherDayUnprinted = listItem({ Ref: "other-day-ref", DateTime: "2020-01-01 10:00:00", Printed: "0" });

    const fetchMock = mockFetchSequence([
      () => successEnvelope([todayButPrinted, otherDayUnprinted]),
      () => successEnvelope([insertItem({ Ref: "brand-new-ref" })]),
    ]);
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const documentRefs = ["waybill-ref-1"];
    const result = await scanSheet.addToTodaysScanSheet(documentRefs);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondBody.calledMethod).toBe("insertDocuments");
    expect(secondBody.methodProperties.Ref).toBe("");
    expect(secondBody.methodProperties.DocumentRefs).toEqual(documentRefs);
    expect(secondBody.methodProperties.Date).toBe(today);
    expect(result).toEqual([insertItem({ Ref: "brand-new-ref" })]);
  });

  it("propagates getScanSheetList's NovaPoshtaApiError without falling through to insertDocuments (AC-03 edge case)", async () => {
    const fetchMock = mockFetchSequence([() => declinedEnvelope(["Invalid API key"], ["401"])]);
    const scanSheet = createScanSheetModule(createClient("bad-api-key"));

    const err = await scanSheet.addToTodaysScanSheet(["waybill-ref-1"]).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Invalid API key"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledMethods = fetchMock.mock.calls.map((call) => JSON.parse(call[1]!.body as string).calledMethod);
    expect(calledMethods).not.toContain("insertDocuments");
  });

  // review-2026-09-22.md finding 1/3 — spec.md §8 tracks the real DateTime/Date wire format as an
  // open question (no live API key available). Nova Poshta date fields have shipped in this repo
  // as both ISO-ish (this feature's own fixtures above) and DD.MM.YYYY (internet-document's
  // confirmed convention) — the "today" match must be correct either way.
  it("matches today's still-unprinted sheet when DateTime is DD.MM.YYYY-formatted (AC-03, format-agnostic)", async () => {
    const today = kyivTodayDateString();
    const [year, month, day] = today.split("-");
    const dottedToday = `${day}.${month}.${year}`;
    const todayUnprintedDotted = listItem({
      Ref: "dotted-today-ref",
      DateTime: `${dottedToday} 09:00:00`,
      Printed: "0",
    });
    const otherDayDotted = listItem({ Ref: "other-day-dotted-ref", DateTime: "01.01.2020 10:00:00", Printed: "0" });

    const fetchMock = mockFetchSequence([
      () => successEnvelope([todayUnprintedDotted, otherDayDotted]),
      () => successEnvelope([insertItem({ Ref: "dotted-today-ref" })]),
    ]);
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const result = await scanSheet.addToTodaysScanSheet(["waybill-ref-1"]);

    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondBody.methodProperties.Ref).toBe("dotted-today-ref");
    expect(result).toEqual([insertItem({ Ref: "dotted-today-ref" })]);
  });

  it("picks the correct most-recent sheet when getScanSheetList mixes DateTime formats across items (AC-03, format-agnostic)", async () => {
    const today = kyivTodayDateString();
    const [year, month, day] = today.split("-");
    const dottedToday = `${day}.${month}.${year}`;
    // The later (20:00) sheet is dotted-formatted, the earlier (08:00) one is ISO-formatted — a
    // raw string comparison across these two formats is not reliably ordered by actual time (e.g.
    // "05.01.2026 20:00:00" < "2026-01-05 08:00:00" lexically despite being the later timestamp),
    // so this only passes if the module normalizes both through a shared comparable form first.
    const isoTodayOlder = listItem({ Ref: "iso-today-ref", DateTime: `${today} 08:00:00`, Printed: "0" });
    const dottedTodayNewer = listItem({ Ref: "dotted-today-ref", DateTime: `${dottedToday} 20:00:00`, Printed: "0" });

    const fetchMock = mockFetchSequence([
      () => successEnvelope([isoTodayOlder, dottedTodayNewer]),
      () => successEnvelope([insertItem({ Ref: "dotted-today-ref" })]),
    ]);
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const result = await scanSheet.addToTodaysScanSheet(["waybill-ref-1"]);

    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondBody.methodProperties.Ref).toBe("dotted-today-ref");
    expect(result).toEqual([insertItem({ Ref: "dotted-today-ref" })]);
  });

  // review-2026-09-22.md finding 4 — a malformed/missing DateTime or Printed field must still raise
  // the library's single NovaPoshtaApiError-or-nothing contract, never a raw TypeError.
  it("does not throw a raw error when a sheet's DateTime/Printed field is missing (AC-11/AC-13 contract)", async () => {
    const malformedSheet = { Ref: "malformed-ref", Number: "1" } as unknown as ScanSheetListItem;

    const fetchMock = mockFetchSequence([
      () => successEnvelope([malformedSheet]),
      () => successEnvelope([insertItem({ Ref: "brand-new-ref" })]),
    ]);
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const result = await scanSheet.addToTodaysScanSheet(["waybill-ref-1"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondBody.methodProperties.Ref).toBe("");
    expect(result).toEqual([insertItem({ Ref: "brand-new-ref" })]);
  });
});

describe("scan-sheet module — overhead benchmark for insertDocuments (T5, spec.md §6 NFR row 5)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("insertDocuments median library-added overhead is <=5ms across >=30 stubbed single-item calls", async () => {
    mockFetchOnce(() => successEnvelope([insertItem()]));
    const scanSheet = createScanSheetModule(createClient("test-api-key"));

    const samples: number[] = [];
    const runs = 30;
    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      await scanSheet.insertDocuments({ DocumentRefs: ["waybill-ref-1"], Date: "2026-09-22" });
      samples.push(performance.now() - start);
    }

    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(runs / 2)];
    expect(median).toBeLessThanOrEqual(5);
  });
});
