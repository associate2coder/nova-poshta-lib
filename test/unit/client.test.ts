import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, NovaPoshtaApiError } from "../../src/index.js";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

describe("core client — array-shape check (ADR-0001)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws NovaPoshtaApiError when success:true but data is not an array", async () => {
    mockFetchOnce({ success: true, data: { Ref: "not-a-list" }, errors: [], warnings: [] });
    const client = createClient("test-api-key");

    await expect(client.request("Common", "getPaymentForms")).rejects.toThrow(NovaPoshtaApiError);
  });

  it("throws NovaPoshtaApiError when success:true but data is a plain object with no array-like shape", async () => {
    mockFetchOnce({ success: true, data: null, errors: [], warnings: [] });
    const client = createClient("test-api-key");

    await expect(client.request("Common", "getPaymentForms")).rejects.toThrow(NovaPoshtaApiError);
  });

  it("does not throw when data is an array, even with sparse/off-shape records", async () => {
    mockFetchOnce({
      success: true,
      data: [{ Ref: "1" }, { Description: null, extra: "unexpected" }, {}],
      errors: [],
      warnings: [],
    });
    const client = createClient("test-api-key");

    await expect(client.request("Common", "getPaymentForms")).resolves.toEqual([
      { Ref: "1" },
      { Description: null, extra: "unexpected" },
      {},
    ]);
  });
});
