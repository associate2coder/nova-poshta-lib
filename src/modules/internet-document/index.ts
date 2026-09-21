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

  let response: { ok: boolean; status?: number };
  try {
    // HEAD, not GET: this only verifies the link resolves — it never needs the response body, so
    // there is nothing to leave unread/uncancelled against a real PDF/label endpoint.
    response = await fetch(url, { method: "HEAD" });
  } catch (cause) {
    throw new NovaPoshtaApiError(
      `Nova Poshta print-link verification for ${kind} failed: ${(cause as Error).message}`,
    );
  }

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
      const envelope = await client.requestEnvelope<{ Ref: string }>(
        "InternetDocument",
        "delete",
        payload as unknown as Record<string, unknown>,
      );
      const removedRefs = new Set(envelope.data.map((item) => item.Ref));
      // AC-08: Nova Poshta's own reason, when it gives one. The confirmed-removed response shape
      // carries only Ref per item (no per-item outcome field — see ADR-0002), so a rejected Ref's
      // explanation can only come from the envelope's success-path warnings/errors, which aren't
      // themselves keyed by Ref — every rejected Ref in the same batch shares the same joined text,
      // a documented best-effort attribution (spec.md §8 OQ-5), not a per-Ref-precise one.
      const novaPoshtaReason =
        envelope.warnings.join("; ") || envelope.errors.join("; ") || undefined;
      return payload.Documents.map((ref) =>
        removedRefs.has(ref)
          ? { Ref: ref, Removed: true }
          : { Ref: ref, Removed: false, Reason: novaPoshtaReason ?? "Not confirmed removed by Nova Poshta" },
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
