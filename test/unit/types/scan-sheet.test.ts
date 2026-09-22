import { describe, expect, it } from "vitest";
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
} from "../../../src/types/scan-sheet.js";

// T1 (domain layer, no ACs): src/types/scan-sheet.ts doesn't exist yet. This is a type-level /
// compile check, following internet-document.test.ts's precedent of constructing a fixture object
// typed against each exported interface — a missing export or a wrong field name fails to
// compile/run. Field sets are copied field-for-field from spec.md §1's quoted Go/TypeScript/Python
// structs; every Ref/DocumentRefs/ScanSheetRefs/CounterpartyRef field is inlined as string/string[]
// (sad.md §5), and Count/DateTime/Date/Printed stay raw unparsed strings (sad.md §4 decision 6).

describe("scan-sheet domain types (T1)", () => {
  it("InsertDocumentsPayload/InsertDocumentsItem match spec.md §1's insertDocuments shapes", () => {
    const createPayload: InsertDocumentsPayload = {
      DocumentRefs: ["waybill-ref-1", "waybill-ref-2"],
      Date: "22.09.2026",
    };
    const addPayload: InsertDocumentsPayload = {
      DocumentRefs: ["waybill-ref-1"],
      Ref: "scan-sheet-ref-1",
      Date: "22.09.2026",
    };
    const item: InsertDocumentsItem = {
      Ref: "scan-sheet-ref-1",
      Number: "1234567",
      Date: "22.09.2026",
      Errors: [],
    };

    expect(createPayload.Ref).toBeUndefined();
    expect(addPayload.Ref).toBe("scan-sheet-ref-1");
    expect(item.Number).toBe("1234567");
  });

  it("GetScanSheetPayload/ScanSheetDetail match spec.md §1's getScanSheet shapes", () => {
    const byRef: GetScanSheetPayload = { Ref: "scan-sheet-ref-1", CounterpartyRef: "" };
    const byCounterparty: GetScanSheetPayload = { Ref: "", CounterpartyRef: "counterparty-ref-1" };
    const detail: ScanSheetDetail = {
      Ref: "scan-sheet-ref-1",
      Number: "1234567",
      DateTime: "22.09.2026 10:00:00",
      Count: "3",
      CitySenderRef: "city-sender-ref-1",
      CitySender: "Kyiv",
      SenderAddressRef: "sender-address-ref-1",
      SenderAddress: "Khreshchatyk 1",
      SenderRef: "sender-ref-1",
      Sender: "Sender LLC",
    };

    expect(byRef.Ref).toBe("scan-sheet-ref-1");
    expect(byCounterparty.CounterpartyRef).toBe("counterparty-ref-1");
    expect(detail.Count).toBe("3");
  });

  it("ScanSheetListItem matches spec.md §1's getScanSheetList shape", () => {
    const item: ScanSheetListItem = {
      Ref: "scan-sheet-ref-1",
      Number: "1234567",
      DateTime: "22.09.2026 10:00:00",
      Printed: "0",
    };

    expect(item.Printed).toBe("0");
  });

  it("DeleteScanSheetPayload/DeleteScanSheetItem match spec.md §1's deleteScanSheet shapes", () => {
    const payload: DeleteScanSheetPayload = { ScanSheetRefs: ["scan-sheet-ref-1", "scan-sheet-ref-2"] };
    const item: DeleteScanSheetItem = { Ref: "scan-sheet-ref-1", Number: "1234567", Error: "" };

    expect(payload.ScanSheetRefs).toHaveLength(2);
    expect(item.Error).toBe("");
  });

  it("RemoveDocumentsPayload/RemoveDocumentsItem match spec.md §1's removeDocuments shapes", () => {
    const payload: RemoveDocumentsPayload = {
      DocumentRefs: ["waybill-ref-1"],
      Ref: "scan-sheet-ref-1",
    };
    const item: RemoveDocumentsItem = { Ref: "waybill-ref-1", Number: "1234567", Error: "" };

    expect(payload.Ref).toBe("scan-sheet-ref-1");
    expect(item.Error).toBe("");
  });
});
