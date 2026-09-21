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
      const removed = await client.request<{ Ref: string }>(
        "InternetDocument",
        "delete",
        payload as unknown as Record<string, unknown>,
      );
      const removedRefs = new Set(removed.map((item) => item.Ref));
      return payload.Documents.map((ref) =>
        removedRefs.has(ref)
          ? { Ref: ref, Removed: true }
          : { Ref: ref, Removed: false, Reason: "Not confirmed removed by Nova Poshta" },
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
    printDocument: (payload: PrintLinkPayload): Promise<string> => {
      void payload;
      throw new Error("not implemented");
    },
    printMarkings: (payload: PrintLinkPayload): Promise<string> => {
      void payload;
      throw new Error("not implemented");
    },
  };
  return module;
}
