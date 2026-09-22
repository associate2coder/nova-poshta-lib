import type { NovaPoshtaClient } from "../../client.js";
import { NovaPoshtaApiError } from "../../client.js";
import type { GetStatusDocumentsPayload, TrackingStatus } from "../../types/tracking-document.js";

export interface TrackingDocumentModule {
  getStatusDocuments(payload: GetStatusDocumentsPayload): Promise<TrackingStatus[]>;
  /** sad.md §4 decision 3: makes exactly one call carrying a single-item Documents array, then
   *  matches the response by the returned record's own Number field against the requested
   *  documentNumber — exact string comparison, no trimming/case-folding (AC-04). Zero matches
   *  resolves undefined (distinct from AC-06's "not found" status record, which is normal data);
   *  more than one match throws NovaPoshtaApiError — the library cannot safely guess which record
   *  was meant. */
  getDocumentStatus(documentNumber: string, phone?: string): Promise<TrackingStatus | undefined>;
}

export function createTrackingDocumentModule(client: NovaPoshtaClient): TrackingDocumentModule {
  return {
    getStatusDocuments: (payload: GetStatusDocumentsPayload) =>
      client.request<TrackingStatus>(
        "TrackingDocument",
        "getStatusDocuments",
        payload as unknown as Record<string, unknown>,
      ),
    async getDocumentStatus(documentNumber: string, phone?: string): Promise<TrackingStatus | undefined> {
      const records = await client.request<TrackingStatus>("TrackingDocument", "getStatusDocuments", {
        Documents: [{ DocumentNumber: documentNumber, Phone: phone ?? "" }],
      });
      const matches = records.filter((r) => r.Number === documentNumber);
      if (matches.length > 1) {
        throw new NovaPoshtaApiError(
          `Nova Poshta returned ${matches.length} tracking records for waybill ${documentNumber}; cannot determine which one was meant`,
        );
      }
      return matches[0];
    },
  };
}
