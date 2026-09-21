import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../../../src/index.js";
import { createInternetDocumentModule } from "../../../src/modules/internet-document/index.js";
import type { SaveInternetDocumentPayload, UpdateInternetDocumentPayload } from "../../../src/types/internet-document.js";

function mockFetchOnce(handler: (body: unknown) => { ok: boolean; status?: number; json: () => Promise<unknown> }) {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return handler(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function successEnvelope(data: unknown[]) {
  return { ok: true, json: () => Promise.resolve({ success: true, data, errors: [], warnings: [] }) };
}

const validSavePayload: SaveInternetDocumentPayload = {
  ServiceType: "WarehouseWarehouse",
  RecipientAddress: "warehouse-ref-1",
  CargoType: "Parcel",
  PayerType: "Sender",
  PaymentMethod: "Cash",
  DateTime: "21.09.2026",
  Weight: 1,
  SeatsAmount: 1,
  Description: "Books",
  Cost: 500,
  CitySender: "city-sender-1",
  Sender: "sender-1",
  SenderAddress: "sender-addr-1",
  ContactSender: "contact-sender-1",
  SendersPhone: "380500000000",
  CityRecipient: "city-recipient-1",
  Recipient: "recipient-1",
  ContactRecipient: "contact-recipient-1",
  RecipientsPhone: "380500000001",
};

const validUpdatePayload: UpdateInternetDocumentPayload = {
  ...validSavePayload,
  BackwardDeliveryData: undefined,
  Ref: "waybill-1",
};

const savedWaybill = {
  Ref: "waybill-1",
  CostOnSite: 520,
  EstimatedDeliveryDate: "23.09.2026",
  IntDocNumber: "20450000000001",
  TypeDocument: "InternetDocument",
};

describe("internet-document module — save/update (T2, AC-01/AC-02/AC-05/AC-06)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("save sends modelName InternetDocument / calledMethod save and resolves the created waybill's Ref + IntDocNumber (AC-01)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedWaybill]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.save(validSavePayload)).resolves.toEqual(savedWaybill);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("InternetDocument");
    expect(sentBody.calledMethod).toBe("save");
  });

  it("save resolves undefined when Nova Poshta reports success with an empty data array (AC-05)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.save(validSavePayload)).resolves.toBeUndefined();
  });

  it("update sends calledMethod update and resolves the updated waybill's Ref + IntDocNumber", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedWaybill]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.update(validUpdatePayload)).resolves.toEqual(savedWaybill);

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("InternetDocument");
    expect(sentBody.calledMethod).toBe("update");
  });

  it("update resolves undefined when Nova Poshta reports success with an empty data array (AC-05)", async () => {
    mockFetchOnce(() => successEnvelope([]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await expect(internetDocument.update(validUpdatePayload)).resolves.toBeUndefined();
  });

  it("update without a previously-set BackwardDeliveryData clears it, per the full-replace convention (AC-06)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([savedWaybill]));
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    await internetDocument.update({ ...validUpdatePayload, BackwardDeliveryData: undefined });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.methodProperties.BackwardDeliveryData).toBeUndefined();
  });

  it("rejects a save payload mixing ServiceType/CargoType fields from a different combination at compile time (AC-02)", () => {
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    void internetDocument.save({
      ...validSavePayload,
      // @ts-expect-error — RecipientCityName belongs to the WarehouseDoors/DoorsDoors legs, not WarehouseWarehouse.
      RecipientCityName: "Kyiv",
    });

    expect(true).toBe(true);
  });

  it("rejects an update payload missing a required field (e.g. omitted DateTime) at compile time (AC-02)", () => {
    const internetDocument = createInternetDocumentModule(createClient("test-api-key"));

    const { DateTime, ...incomplete } = validUpdatePayload;
    void DateTime;
    // @ts-expect-error — DateTime is required on UpdateInternetDocumentPayload.
    void internetDocument.update(incomplete);

    expect(true).toBe(true);
  });
});
