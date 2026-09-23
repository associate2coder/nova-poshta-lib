import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../../src/index.js";
import { createAdditionalServiceModule } from "../../../src/modules/additional-service/index.js";
import type { ReturnAddressOption, ReturnEditOption } from "../../../src/types/additional-service.js";

function mockFetchOnce(handler: (body: unknown) => { ok: boolean; status?: number; json: () => Promise<unknown> }) {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return handler(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function successEnvelope(data: unknown[], info?: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve({ success: true, data, errors: [], warnings: [], ...(info !== undefined ? { info } : {}) }),
  };
}

function declinedEnvelope(errors: string[], errorCodes: string[] = []) {
  return {
    ok: true,
    json: () => Promise.resolve({ success: false, data: [], errors, errorCodes, warnings: [] }),
  };
}

function returnAddressOption(overrides: Partial<ReturnAddressOption> = {}): ReturnAddressOption {
  return {
    Ref: "return-address-ref-1",
    NonCash: "1",
    City: "Kyiv",
    Counterparty: "ACME LLC",
    ContactPerson: "Jane Doe",
    Address: "1 Khreshchatyk St",
    Phone: "380500000000",
    ...overrides,
  };
}

function returnEditOption(overrides: Partial<ReturnEditOption> = {}): ReturnEditOption {
  return { Type: "OrderReturn", ...overrides };
}

describe("additional-service module — checkReturnPossible (T4, AC-01/AC-02)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns typed ReturnAddressOption[] including NonCash, sending Number via request() (AC-01)", async () => {
    const fetchMock = mockFetchOnce(() => successEnvelope([returnAddressOption()]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result = await additionalService.checkReturnPossible({ Number: "20450000000001" });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("CheckPossibilityCreateReturn");
    expect(sentBody.methodProperties.Number).toBe("20450000000001");
    expect(result).toEqual([returnAddressOption()]);
    expect(result[0]!.NonCash).toBe("1");
  });

  it("propagates NovaPoshtaApiError unchanged when Nova Poshta declines a recipient-key call (AC-02)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Only the shipment's sender may perform this action"], ["403"]));
    const additionalService = createAdditionalServiceModule(createClient("recipient-api-key"));

    const err = await additionalService
      .checkReturnPossible({ Number: "20450000000001" })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Only the shipment's sender may perform this action"]);
    expect((err as NovaPoshtaApiError).errorCodes).toEqual(["403"]);
  });
});

describe("additional-service module — checkReturnEditPossible (T4, AC-06)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("assembles { options, info } from requestEnvelope()'s data + info fields (ADR-0001), same calledMethod, Ref+Address payload (AC-06)", async () => {
    const info = { PayerTypeDefault: "Sender", Number: "20450000000001" };
    const fetchMock = mockFetchOnce(() => successEnvelope([returnEditOption()], info));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const result = await additionalService.checkReturnEditPossible({
      Ref: "return-request-ref-1",
      Address: { CityRef: "city-ref-1" },
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(sentBody.modelName).toBe("AdditionalServiceGeneral");
    expect(sentBody.calledMethod).toBe("CheckPossibilityCreateReturn");
    expect(sentBody.methodProperties.Ref).toBe("return-request-ref-1");
    expect(sentBody.methodProperties.Address).toEqual({ CityRef: "city-ref-1" });
    expect(result).toEqual({ options: [returnEditOption()], info });
  });

  it("propagates NovaPoshtaApiError unchanged when the check declines (AC-06 decline)", async () => {
    mockFetchOnce(() => declinedEnvelope(["Return request not found"], ["404"]));
    const additionalService = createAdditionalServiceModule(createClient("test-api-key"));

    const err = await additionalService
      .checkReturnEditPossible({ Ref: "no-such-ref", Address: {} })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NovaPoshtaApiError);
    expect((err as NovaPoshtaApiError).errors).toEqual(["Return request not found"]);
  });
});
