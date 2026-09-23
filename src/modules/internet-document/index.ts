import { NovaPoshtaApiError, type NovaPoshtaClient } from "../../client.js";
import type {
  DeleteBatchInternetDocumentPayload,
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
   * Full-replace (AC-06): every field the chosen ServiceType leg's Save payload declares is
   * mandatory here, except the fields that Save payload itself already declares optional
   * (BackwardDeliveryData, and — for a Doors-ending leg — SenderFlat/RecipientFlat): each of these
   * stays optional by design, and omitting it clears it — it is never carried forward from a
   * previous version.
   */
  update(payload: UpdateInternetDocumentPayload): Promise<SavedInternetDocument | undefined>;
  /** ADR-0005: exactly one Ref per call — Nova Poshta's `delete` is not confirmed batch-capable
   *  (see DeleteInternetDocumentPayload's doc comment). Use `deleteBatch` for more than one Ref. */
  delete(payload: DeleteInternetDocumentPayload): Promise<DeletedInternetDocumentOutcome>;
  /** ADR-0005: this module's own sequential loop over `delete`, never a single server-side batch
   *  call — resolves one outcome per submitted Ref, in submission order. */
  deleteBatch(payload: DeleteBatchInternetDocumentPayload): Promise<DeletedInternetDocumentOutcome[]>;
  getDocumentList(filters?: GetDocumentListFilters): Promise<WaybillListItem[]>;
  getDocumentPrice(payload: GetDocumentPricePayload): Promise<DocumentPriceEstimate>;
  getDocumentDeliveryDate(payload: GetDocumentDeliveryDatePayload): Promise<DocumentDeliveryDateEstimate>;
  /** PROVISIONAL (see PrintLinkPayload's doc comment) — the URL this resolves to is live-verified
   *  before returning, but the construction mechanism itself is contested across sources. */
  printDocument(payload: PrintLinkPayload): Promise<string>;
  /** PROVISIONAL — see printDocument. */
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

/** ADR-0005: one Nova Poshta call per Ref. Since the response can only ever concern this one Ref,
 *  no per-Ref message-attribution logic is needed (unlike the pre-ADR-0005 batch implementation) —
 *  any warning/error on a reported-unremoved response is this Ref's own reason. */
async function deleteOne(client: NovaPoshtaClient, ref: string): Promise<DeletedInternetDocumentOutcome> {
  const envelope = await client.requestEnvelope<{ Ref: string }>("InternetDocument", "delete", {
    DocumentRefs: [ref],
  });
  if (envelope.data.some((item) => item.Ref === ref)) {
    return { Ref: ref, Removed: true };
  }
  const combinedMessages = [...envelope.warnings, ...envelope.errors];
  return { Ref: ref, Removed: false, Reason: combinedMessages.join("; ") || "Not confirmed removed by Nova Poshta" };
}

const PRINT_BASE_URL = "https://my.novaposhta.ua/orders";

/** ADR-0003: builds the print URL per Nova Poshta's documented pattern (community-SDK cross-check,
 *  confirmed against Nova Poshta's own devcenter.novaposhta.ua docs — spec.md §1/§8 OQ-1, seventh-
 *  pass narrowing) — embeds every submitted Ref plus the caller's own apiKey — then issues one
 *  live verification check against that exact URL, never routed through client.request()'s envelope
 *  unwrap. Only returns the URL if that check succeeds; otherwise raises the standard error.
 *
 *  `Copies` is not its own URL segment (review, eighth pass, 2026-09-22 — re-fetched
 *  serj1chen/nova-poshta-sdk-php's private `getPrintLink()` implementation directly, not just its
 *  public constants): "fourfold" repeats each Ref's `orders[]/<ref>` segment twice; every other value,
 *  including "double" and omitting `Copies` entirely, repeats it once. There is no `/copies/...` path
 *  segment in the real URL — an earlier pass invented one from the field's mere *existence* on the
 *  cross-checked SDK's request struct, without re-fetching how that struct is actually consumed. */
async function buildAndVerifyPrintLink(
  client: NovaPoshtaClient,
  kind: "printDocument" | "printMarkings",
  payload: PrintLinkPayload,
): Promise<string> {
  if (payload.Documents.length === 0) {
    throw new NovaPoshtaApiError(`Nova Poshta ${kind} requires at least one waybill Ref`);
  }

  const refSegments = payload.Documents.flatMap((ref) => {
    const segment = `orders[]/${encodeURIComponent(ref)}`;
    return payload.Copies === "fourfold" ? [segment, segment] : [segment];
  });
  const refsPath = refSegments.join("/");
  const typeSegment = payload.Type ? `/type/${payload.Type}` : "";
  const url = `${PRINT_BASE_URL}/${kind}/${refsPath}${typeSegment}/apiKey/${client.apiKey}`;

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
    delete: (payload: DeleteInternetDocumentPayload) => deleteOne(client, payload.Ref),
    deleteBatch: async (payload: DeleteBatchInternetDocumentPayload): Promise<DeletedInternetDocumentOutcome[]> => {
      const outcomes: DeletedInternetDocumentOutcome[] = [];
      // Sequential, not Promise.all: this module's own client-side loop over single-Ref calls
      // (ADR-0005), not a server-side batch — sequential avoids bursting Nova Poshta's rate limit
      // with N simultaneous requests for one logical batch.
      for (const ref of payload.Documents) {
        outcomes.push(await deleteOne(client, ref));
      }
      return outcomes;
    },
    getDocumentList: (filters?: GetDocumentListFilters) =>
      client.request<WaybillListItem>(
        "InternetDocument",
        "getDocumentList",
        filters as unknown as Record<string, unknown>,
      ),
    getDocumentPrice: (payload: GetDocumentPricePayload) =>
      client.requestFirst<DocumentPriceEstimate>(
        "InternetDocument",
        "getDocumentPrice",
        payload as unknown as Record<string, unknown>,
      ),
    getDocumentDeliveryDate: (payload: GetDocumentDeliveryDatePayload) =>
      client.requestFirst<DocumentDeliveryDateEstimate>(
        "InternetDocument",
        "getDocumentDeliveryDate",
        payload as unknown as Record<string, unknown>,
      ),
    printDocument: (payload: PrintLinkPayload) => buildAndVerifyPrintLink(client, "printDocument", payload),
    printMarkings: (payload: PrintLinkPayload) => buildAndVerifyPrintLink(client, "printMarkings", payload),
  };
  return module;
}
