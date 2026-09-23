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
 *  regardless of where the calling code runs (spec.md §1 Decision override). Internal comparison
 *  format only — see `toWireDate` for what actually goes on the wire. */
function kyivTodayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Converts a YYYY-MM-DD date into the `insertDocuments`/`Date` wire format Nova Poshta actually
 *  requires — confirmed live 2026-09-23 (`"Невірний формат дати"` / "invalid date format" on the
 *  ISO-ish form; `DD.MM.YYYY` accepted), closing spec.md §8's previously-open question. */
function toWireDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

/** Extracts a comparable YYYY-MM-DD date part from a Nova Poshta timestamp string, tolerating
 *  either wire format this library's own precedent has seen for a Nova Poshta date field —
 *  ISO-ish (`YYYY-MM-DD...`) or `DD.MM.YYYY...` (internet-document's confirmed-working DateTime
 *  convention). The exact ScanSheet wire format is an open question (spec.md §8, no live key
 *  available to confirm it) — this keeps the "today" match correct either way instead of silently
 *  picking the wrong sheet or none at all. A missing/malformed value degrades to a string that
 *  can't match any real date, never a thrown error. */
function extractDatePart(dateTime: unknown): string {
  const value = String(dateTime ?? "");
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (isoMatch) return isoMatch[1]!;
  const dottedMatch = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(value);
  if (dottedMatch) return `${dottedMatch[3]}-${dottedMatch[2]}-${dottedMatch[1]}`;
  return value.slice(0, 10);
}

/** Normalizes a Nova Poshta timestamp into a `YYYY-MM-DD HH:MM:SS`-shaped string that sorts
 *  correctly regardless of which of the two plausible wire formats produced it. Raw `DateTime`
 *  strings can't be compared directly across formats — e.g. `"05.01.2026 20:00:00"` sorts before
 *  `"2026-01-05 08:00:00"` lexicographically even though it's a later timestamp — so
 *  `addToTodaysScanSheet`'s "most recently created" tie-break normalizes both sides through this
 *  first (review-2026-09-22.md re-review finding: mixed-format ordering). */
function toComparableTimestamp(dateTime: unknown): string {
  const value = String(dateTime ?? "");
  const timeMatch = /(\d{2}:\d{2}:\d{2})/.exec(value);
  return `${extractDatePart(dateTime)} ${timeMatch ? timeMatch[1] : ""}`;
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
    // Confirmed live 2026-09-23: unlike every other method in this module, deleteScanSheet's
    // successful `data` is a single object — `{ ScanSheetRefs: { Success: [...], Errors: [...] } }`
    // — not a navigable list, so client.request()'s Array.isArray(data) check would always throw
    // here. requestObject() skips that check; the two branches are combined into one flat
    // DeleteScanSheetItem[] (Error: "" for a successful item) matching this module's existing
    // per-item-Error convention (removeDocuments, insertDocuments).
    deleteScanSheet: async (payload: DeleteScanSheetPayload): Promise<DeleteScanSheetItem[]> => {
      const raw = await client.requestObject<{
        ScanSheetRefs?: {
          Success?: Array<{ Ref: string; Number: string }>;
          Errors?: Array<{ Ref: string; Number: string; Error: string }>;
        };
      }>("ScanSheet", "deleteScanSheet", payload as unknown as Record<string, unknown>);
      const succeeded = (raw.ScanSheetRefs?.Success ?? []).map((item) => ({ ...item, Error: "" }));
      const failed = raw.ScanSheetRefs?.Errors ?? [];
      return [...succeeded, ...failed];
    },
    addToTodaysScanSheet: async (documentRefs: string[]) => {
      const today = kyivTodayDateString();
      const sheets = await getScanSheetList();
      const todaysUnprinted = sheets.filter(
        (sheet) => extractDatePart(sheet.DateTime) === today && String(sheet.Printed) === "0",
      );

      const targetRef =
        todaysUnprinted.length > 0
          ? todaysUnprinted.reduce((latest, sheet) =>
              toComparableTimestamp(sheet.DateTime) > toComparableTimestamp(latest.DateTime) ? sheet : latest,
            ).Ref
          : "";

      return insertDocuments({ DocumentRefs: documentRefs, Ref: targetRef, Date: toWireDate(today) });
    },
  };
}
