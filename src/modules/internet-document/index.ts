import type { NovaPoshtaClient } from "../../client.js";
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
    delete: (payload: DeleteInternetDocumentPayload): Promise<DeletedInternetDocumentOutcome[]> => {
      void payload;
      throw new Error("not implemented");
    },
    getDocumentList: (filters?: GetDocumentListFilters): Promise<WaybillListItem[]> => {
      void filters;
      throw new Error("not implemented");
    },
    getDocumentPrice: (payload: GetDocumentPricePayload): Promise<DocumentPriceEstimate> => {
      void payload;
      throw new Error("not implemented");
    },
    getDocumentDeliveryDate: (payload: GetDocumentDeliveryDatePayload): Promise<DocumentDeliveryDateEstimate> => {
      void payload;
      throw new Error("not implemented");
    },
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
