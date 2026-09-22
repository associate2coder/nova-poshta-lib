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
  /** spec.md §1 Decision override — convenience wrapper: calls getScanSheetList once, finds today's
   *  (Europe/Kyiv calendar date) most recently created still-unprinted sheet if one exists, then adds
   *  DocumentRefs to it via insertDocuments (or creates a new sheet, empty Ref, if none exists). */
  addToTodaysScanSheet(documentRefs: string[]): Promise<InsertDocumentsItem[]>;
}

/** Today's Europe/Kyiv calendar date as YYYY-MM-DD — matches Nova Poshta's own timezone,
 *  regardless of where the calling code runs (spec.md §1 Decision override). */
function kyivTodayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function createScanSheetModule(client: NovaPoshtaClient): ScanSheetModule {
  const insertDocuments = (payload: InsertDocumentsPayload) =>
    client.request<InsertDocumentsItem>("ScanSheet", "insertDocuments", {
      ...payload,
      Ref: payload.Ref ?? "",
    });
  const getScanSheetList = () => client.request<ScanSheetListItem>("ScanSheet", "getScanSheetList");

  return {
    insertDocuments,
    getScanSheet: (payload: GetScanSheetPayload) =>
      client.request<ScanSheetDetail>("ScanSheet", "getScanSheet", payload as unknown as Record<string, unknown>),
    getScanSheetList,
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
    addToTodaysScanSheet: async (documentRefs: string[]) => {
      const today = kyivTodayDateString();
      const sheets = await getScanSheetList();
      const todaysUnprinted = sheets.filter(
        (sheet) => sheet.DateTime.slice(0, 10) === today && sheet.Printed === "0",
      );

      const targetRef =
        todaysUnprinted.length > 0
          ? todaysUnprinted.reduce((latest, sheet) => (sheet.DateTime > latest.DateTime ? sheet : latest)).Ref
          : "";

      return insertDocuments({ DocumentRefs: documentRefs, Ref: targetRef, Date: today });
    },
  };
}
