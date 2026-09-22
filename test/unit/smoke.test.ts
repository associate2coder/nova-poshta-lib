import { describe, expect, it } from "vitest";
import {
  createAddressModule,
  createClient,
  createCounterpartyModule,
  createInternetDocumentModule,
  createScanSheetModule,
  createTrackingDocumentModule,
  TRACKING_STATUS_CODES,
} from "../../src/index.js";
import type {
  DeleteScanSheetItem,
  DeleteScanSheetPayload,
  GetScanSheetPayload,
  InsertDocumentsItem,
  InsertDocumentsPayload,
  RemoveDocumentsItem,
  RemoveDocumentsPayload,
  ScanSheetDetail,
  ScanSheetListItem,
  ScanSheetModule,
} from "../../src/index.js";

describe("package entry point", () => {
  it("imports and exports a client factory without throwing", () => {
    expect(typeof createClient).toBe("function");
    expect(() => createClient("test-api-key")).not.toThrow();
  });

  it("imports and exports createAddressModule, type-checked against a real client (T7, AC-12)", () => {
    expect(typeof createAddressModule).toBe("function");
    expect(() => createAddressModule(createClient("test-api-key"))).not.toThrow();
  });

  it("imports and exports createCounterpartyModule, type-checked against a real client (T7, AC-17)", () => {
    expect(typeof createCounterpartyModule).toBe("function");
    expect(() => createCounterpartyModule(createClient("test-api-key"))).not.toThrow();
  });

  it("imports and exports createInternetDocumentModule, type-checked against a real client (T6, AC-17/AC-18)", () => {
    expect(typeof createInternetDocumentModule).toBe("function");
    expect(() => createInternetDocumentModule(createClient("test-api-key"))).not.toThrow();
  });

  it("imports and exports createTrackingDocumentModule + TRACKING_STATUS_CODES, type-checked against a real client (T4)", () => {
    expect(typeof createTrackingDocumentModule).toBe("function");
    expect(() => createTrackingDocumentModule(createClient("test-api-key"))).not.toThrow();
    expect(TRACKING_STATUS_CODES[3]).toBe("Номер не знайдено");
  });

  it("imports and exports createScanSheetModule, type-checked against a real client (T4)", () => {
    expect(typeof createScanSheetModule).toBe("function");
    const scanSheet: ScanSheetModule = createScanSheetModule(createClient("test-api-key"));
    expect(typeof scanSheet.insertDocuments).toBe("function");

    // Type-only usages below exist purely to prove these types are re-exported from the package
    // root (not just from src/modules/scan-sheet/index.ts or src/types/scan-sheet.ts directly).
    // If any of them stopped being exported from src/index.ts, this file would fail to typecheck.
    const insertPayload: InsertDocumentsPayload = { DocumentRefs: [], Date: "2026-09-22" };
    const insertItem: InsertDocumentsItem | undefined = undefined;
    const getPayload: GetScanSheetPayload = { Ref: "", CounterpartyRef: "" };
    const detail: ScanSheetDetail | undefined = undefined;
    const listItem: ScanSheetListItem | undefined = undefined;
    const removePayload: RemoveDocumentsPayload = { DocumentRefs: [], Ref: "" };
    const removeItem: RemoveDocumentsItem | undefined = undefined;
    const deletePayload: DeleteScanSheetPayload = { ScanSheetRefs: [] };
    const deleteItem: DeleteScanSheetItem | undefined = undefined;
    expect([
      insertPayload,
      insertItem,
      getPayload,
      detail,
      listItem,
      removePayload,
      removeItem,
      deletePayload,
      deleteItem,
    ]).toBeDefined();
  });
});
