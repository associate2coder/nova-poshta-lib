import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../../src/index.js";
import { createCommonModule } from "../../../src/modules/common/index.js";

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

describe("common module", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("happy path (AC-01)", () => {
    it("getPaymentForms returns typed data", async () => {
      mockFetchOnce(() => successEnvelope([{ Ref: "1", Description: "Готівка" }]));
      const common = createCommonModule(createClient("test-api-key"));

      await expect(common.getPaymentForms()).resolves.toEqual([{ Ref: "1", Description: "Готівка" }]);
    });
  });

  describe("filtered happy path (AC-02)", () => {
    it("getCargoDescriptionList passes the filter through unmodified", async () => {
      const fetchMock = mockFetchOnce(() => successEnvelope([{ Ref: "1", Description: "Документи" }]));
      const common = createCommonModule(createClient("test-api-key"));

      await common.getCargoDescriptionList({ FindByString: "Документи" });

      const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
      expect(sentBody.calledMethod).toBe("getCargoDescriptionList");
      expect(sentBody.methodProperties).toEqual({ FindByString: "Документи" });
    });

    it("getTimeIntervals requires and passes RecipientCityRef through unmodified", async () => {
      const fetchMock = mockFetchOnce(() => successEnvelope([{ Number: "1", Start: "08:00", End: "10:00" }]));
      const common = createCommonModule(createClient("test-api-key"));

      await common.getTimeIntervals({ RecipientCityRef: "city-ref-1" });

      const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
      expect(sentBody.calledMethod).toBe("getTimeIntervals");
      expect(sentBody.methodProperties).toEqual({ RecipientCityRef: "city-ref-1" });
    });
  });

  describe("error branches (AC-03/04/05/08)", () => {
    it("throws NovaPoshtaApiError when data isn't array-shaped (AC-03)", async () => {
      mockFetchOnce(() => ({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { not: "a list" }, errors: [], warnings: [] }),
      }));
      const common = createCommonModule(createClient("test-api-key"));

      await expect(common.getPaymentForms()).rejects.toThrow(NovaPoshtaApiError);
    });

    it("throws NovaPoshtaApiError when the API key is rejected (AC-04), passing through Nova Poshta's own message", async () => {
      mockFetchOnce(() => ({
        ok: true,
        json: () =>
          Promise.resolve({ success: false, data: [], errors: ["Invalid API key"], errorCodes: ["401"], warnings: [] }),
      }));
      const common = createCommonModule(createClient("test-api-key"));

      const err = await common.getPaymentForms().catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NovaPoshtaApiError);
      expect((err as NovaPoshtaApiError).errors).toEqual(["Invalid API key"]);
      expect((err as NovaPoshtaApiError).errorCodes).toEqual(["401"]);
    });

    it("throws NovaPoshtaApiError when declined for another reason (AC-05), passing through Nova Poshta's own explanation", async () => {
      mockFetchOnce(() => ({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            data: [],
            errors: ["Unsupported filter value"],
            errorCodes: ["400"],
            warnings: [],
          }),
      }));
      const common = createCommonModule(createClient("test-api-key"));

      const err = await common.getCargoDescriptionList({ FindByString: "??" }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NovaPoshtaApiError);
      expect((err as NovaPoshtaApiError).errors).toEqual(["Unsupported filter value"]);
      expect((err as NovaPoshtaApiError).errorCodes).toEqual(["400"]);
    });

    it("throws NovaPoshtaApiError (not a raw native error) on a network/transport failure (AC-08)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("fetch failed")),
      );
      const common = createCommonModule(createClient("test-api-key"));

      await expect(common.getPaymentForms()).rejects.toThrow(NovaPoshtaApiError);
    });

    it("throws NovaPoshtaApiError (not a raw native error) when the response body isn't valid JSON (AC-08)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        }),
      );
      const common = createCommonModule(createClient("test-api-key"));

      await expect(common.getPaymentForms()).rejects.toThrow(NovaPoshtaApiError);
    });
  });

  describe("tolerated per-field noise (AC-03 note) — must NOT throw", () => {
    it("passes through a record missing a documented field, a null field, an off-type field, and an extra field", async () => {
      const noisyRecord = { Ref: "1", Description: null, ExtraUndocumented: 42 };
      mockFetchOnce(() => successEnvelope([{}, noisyRecord]));
      const common = createCommonModule(createClient("test-api-key"));

      await expect(common.getPaymentForms()).resolves.toEqual([{}, noisyRecord]);
    });
  });

  describe("overhead benchmark (§6 NFR row 3)", () => {
    it("median library-added overhead is <=5ms across >=30 stubbed calls", async () => {
      mockFetchOnce(() => successEnvelope([{ Ref: "1" }]));
      const common = createCommonModule(createClient("test-api-key"));

      const samples: number[] = [];
      const runs = 30;
      for (let i = 0; i < runs; i++) {
        const start = performance.now();
        await common.getPaymentForms();
        samples.push(performance.now() - start);
      }

      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(runs / 2)];
      expect(median).toBeLessThanOrEqual(5);
    });
  });
});
