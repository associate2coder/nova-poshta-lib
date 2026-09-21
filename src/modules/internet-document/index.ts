import { NovaPoshtaApiError, type NovaPoshtaClient } from "../../client.js";
import type {
  DeleteInternetDocumentPayload,
  DeletedInternetDocumentOutcome,
  DocumentDeliveryDateEstimate,
  DocumentPriceEstimate,
  GetDocumentDeliveryDatePayload,
  GetDocumentListFilters,
  GetDocumentPricePayload,
  PrintLinkPayload,
  SaveInternetDocumentPayload,
  SavedInternetDocument,
  UpdateInternetDocumentPayload,
  WaybillListItem,
} from "../../types/internet-document.js";

export interface InternetDocumentModule {
  save(payload: SaveInternetDocumentPayload): Promise<SavedInternetDocument | undefined>;
  /**
   * Full-replace (AC-06): every field the chosen ServiceType/CargoType combination's Save payload
   * declares is mandatory, including BackwardDeliveryData — an omitted backward-delivery instruction
   * is never carried forward from a previous version.
   */
  update(payload: UpdateInternetDocumentPayload): Promise<SavedInternetDocument | undefined>;
  delete(payload: DeleteInternetDocumentPayload): Promise<DeletedInternetDocumentOutcome[]>;
  getDocumentList(filters?: GetDocumentListFilters): Promise<WaybillListItem[]>;
  getDocumentPrice(payload: GetDocumentPricePayload): Promise<DocumentPriceEstimate>;
  getDocumentDeliveryDate(payload: GetDocumentDeliveryDatePayload): Promise<DocumentDeliveryDateEstimate>;
  printDocument(payload: PrintLinkPayload): Promise<string>;
  printMarkings(payload: PrintLinkPayload): Promise<string>;
}

async function firstOrUndefined<T>(
  client: NovaPoshtaClient,
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
): Promise<T | undefined> {
  const records = await client.request<T>(modelName, calledMethod, methodProperties);
  return records[0];
}

async function firstOrThrow<T>(
  client: NovaPoshtaClient,
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
): Promise<T> {
  const records = await client.request<T>(modelName, calledMethod, methodProperties);
  const [first] = records;
  if (first === undefined) {
    throw new NovaPoshtaApiError(
      `Nova Poshta API response for ${modelName}.${calledMethod} reported success but returned no record`,
    );
  }
  return first;
}

const PRINT_BASE_URL = "https://my.novaposhta.ua/orders";

/** ADR-0003: builds the print URL per Nova Poshta's documented pattern (community-SDK cross-check,
 *  spec.md §1/§8 OQ-1) — embeds every submitted Ref plus the caller's own apiKey — then issues one
 *  live verification check against that exact URL, never routed through client.request()'s envelope
 *  unwrap. Only returns the URL if that check succeeds; otherwise raises the standard error. */
async function buildAndVerifyPrintLink(
  client: NovaPoshtaClient,
  kind: "printDocument" | "printMarkings",
  payload: PrintLinkPayload,
): Promise<string> {
  if (payload.Documents.length === 0) {
    throw new NovaPoshtaApiError(`Nova Poshta ${kind} requires at least one waybill Ref`);
  }

  const refsPath = payload.Documents.map((ref) => `orders[]/${encodeURIComponent(ref)}`).join("/");
  const typeSegment = payload.Type ? `/type/${payload.Type}` : "";
  const copiesSegment = payload.Copies ? `/copies/${payload.Copies}` : "";
  const url = `${PRINT_BASE_URL}/${kind}/${refsPath}${typeSegment}${copiesSegment}/apiKey/${client.apiKey}`;

  let response: { ok: boolean; status?: number; body?: ReadableStream | null };
  try {
    // GET, not HEAD: Nova Poshta's print endpoint never confirmed HEAD support (spec.md §8 OQ-1),
    // so this issues the same request a browser would, then discards the body unread below rather
    // than leaving it open against a real PDF/label endpoint.
    response = await fetch(url, { method: "GET" });
  } catch (cause) {
    throw new NovaPoshtaApiError(
      `Nova Poshta print-link verification for ${kind} failed: ${(cause as Error).message}`,
    );
  }

  // Best-effort discard: an already-errored stream can reject cancel() itself. Verification's
  // outcome is decided below by response.ok, not by this cleanup, so swallow it here rather than
  // letting it surface as an unhandled rejection.
  void response.body?.cancel()?.catch(() => {});

  if (!response.ok) {
    throw new NovaPoshtaApiError(`Nova Poshta print-link verification for ${kind} failed with status ${response.status}`);
  }

  return url;
}

export function createInternetDocumentModule(client: NovaPoshtaClient): InternetDocumentModule {
  const module: InternetDocumentModule = {
    save: (payload: SaveInternetDocumentPayload) =>
      firstOrUndefined<SavedInternetDocument>(
        client,
        "InternetDocument",
        "save",
        payload as unknown as Record<string, unknown>,
      ),
    update: (payload: UpdateInternetDocumentPayload) =>
      firstOrUndefined<SavedInternetDocument>(
        client,
        "InternetDocument",
        "update",
        payload as unknown as Record<string, unknown>,
      ),
    delete: async (payload: DeleteInternetDocumentPayload): Promise<DeletedInternetDocumentOutcome[]> => {
      // contracts/api-sync-report.md:94-99: the wire field is `DocumentRefs`, not `Documents` —
      // `Documents` is only this module's public field name.
      const envelope = await client.requestEnvelope<{ Ref: string }>("InternetDocument", "delete", {
        DocumentRefs: payload.Documents,
      });
      const removedRefs = new Set(envelope.data.map((item) => item.Ref));
      // AC-08: Nova Poshta's own reason, when it gives one. The confirmed-removed response shape
      // carries only Ref per item (no per-item outcome field — see ADR-0002), so a rejected Ref's
      // explanation can only come from the envelope's success-path warnings/errors, which aren't
      // themselves keyed by Ref. Per rejected Ref, prefer whichever message actually names that
      // Ref (N3); when nothing matches, fall back to every warning/error joined together rather
      // than silently dropping errors whenever a warning is also present.
      const combinedMessages = [...envelope.warnings, ...envelope.errors];
      const fallbackReason = combinedMessages.join("; ") || undefined;
      // Word-boundary match, not a plain substring: a Ref that's a textual prefix of another
      // submitted Ref (e.g. "waybill-1" vs "waybill-10") must not match the longer Ref's message.
      const namesRef = (message: string, ref: string): boolean =>
        new RegExp(`(^|[^\\w-])${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\w-]|$)`).test(message);
      const reasonForRef = (ref: string): string | undefined =>
        combinedMessages.find((message) => namesRef(message, ref)) ?? fallbackReason;
      return payload.Documents.map((ref) =>
        removedRefs.has(ref)
          ? { Ref: ref, Removed: true }
          : { Ref: ref, Removed: false, Reason: reasonForRef(ref) ?? "Not confirmed removed by Nova Poshta" },
      );
    },
    getDocumentList: (filters?: GetDocumentListFilters) =>
      client.request<WaybillListItem>(
        "InternetDocument",
        "getDocumentList",
        filters as unknown as Record<string, unknown>,
      ),
    getDocumentPrice: (payload: GetDocumentPricePayload) =>
      firstOrThrow<DocumentPriceEstimate>(
        client,
        "InternetDocument",
        "getDocumentPrice",
        payload as unknown as Record<string, unknown>,
      ),
    getDocumentDeliveryDate: (payload: GetDocumentDeliveryDatePayload) =>
      firstOrThrow<DocumentDeliveryDateEstimate>(
        client,
        "InternetDocument",
        "getDocumentDeliveryDate",
        payload as unknown as Record<string, unknown>,
      ),
    printDocument: (payload: PrintLinkPayload) => buildAndVerifyPrintLink(client, "printDocument", payload),
    printMarkings: (payload: PrintLinkPayload) => buildAndVerifyPrintLink(client, "printMarkings", payload),
  };
  return module;
}
