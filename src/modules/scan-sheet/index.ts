import type { NovaPoshtaClient } from "../../client.js";
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
} from "../../types/scan-sheet.js";

export interface ScanSheetModule {
  /** sad.md §4 decision 2: delegates straight to client.request(), no client-side split/cap/reorder
   *  of DocumentRefs. Fills `Ref` with `""` internally when the caller omits it — the caller-facing
   *  `Ref` stays optional (AC-01/AC-02). */
  insertDocuments(payload: InsertDocumentsPayload): Promise<InsertDocumentsItem[]>;
  getScanSheet(payload: GetScanSheetPayload): Promise<ScanSheetDetail[]>;
  getScanSheetList(): Promise<ScanSheetListItem[]>;
  removeDocuments(payload: RemoveDocumentsPayload): Promise<RemoveDocumentsItem[]>;
  deleteScanSheet(payload: DeleteScanSheetPayload): Promise<DeleteScanSheetItem[]>;
}

export function createScanSheetModule(client: NovaPoshtaClient): ScanSheetModule {
  return {
    insertDocuments: (payload: InsertDocumentsPayload) =>
      client.request<InsertDocumentsItem>("ScanSheet", "insertDocuments", {
        ...payload,
        Ref: payload.Ref ?? "",
      }),
    getScanSheet: (payload: GetScanSheetPayload) =>
      client.request<ScanSheetDetail>("ScanSheet", "getScanSheet", payload as unknown as Record<string, unknown>),
    getScanSheetList: () => client.request<ScanSheetListItem>("ScanSheet", "getScanSheetList"),
    removeDocuments: (payload: RemoveDocumentsPayload) =>
      client.request<RemoveDocumentsItem>(
        "ScanSheet",
        "removeDocuments",
        payload as unknown as Record<string, unknown>,
      ),
    deleteScanSheet: (payload: DeleteScanSheetPayload) =>
      client.request<DeleteScanSheetItem>(
        "ScanSheet",
        "deleteScanSheet",
        payload as unknown as Record<string, unknown>,
      ),
  };
}
