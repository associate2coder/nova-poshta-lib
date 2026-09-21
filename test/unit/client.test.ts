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

  it("throws NovaPoshtaApiError when success:true but data is null", async () => {
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

describe("core client — failure wrapping (AC-08)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wraps a rejected fetch() (network/transport failure) as NovaPoshtaApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const client = createClient("test-api-key");

    await expect(client.request("Common", "getPaymentForms")).rejects.toThrow(NovaPoshtaApiError);
  });

  it("wraps a response.json() parse failure (invalid JSON body) as NovaPoshtaApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      }),
    );
    const client = createClient("test-api-key");

    await expect(client.request("Common", "getPaymentForms")).rejects.toThrow(NovaPoshtaApiError);
  });
});

describe("core client — declined response missing optional envelope fields (AC-04/05)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws NovaPoshtaApiError, not a raw TypeError, when a declined envelope omits errors/errorCodes/warnings", async () => {
    mockFetchOnce({ success: false });
    const client = createClient("test-api-key");

    await expect(client.request("Common", "getPaymentForms")).rejects.toThrow(NovaPoshtaApiError);
  });
});

describe("core client — apiKey is not enumerable (review 2026-09-21 finding 3)", () => {
  it("does not leak the raw apiKey through JSON.stringify or Object.keys, while remaining directly readable", () => {
    const client = createClient("my-secret-key");

    expect(JSON.stringify(client)).not.toContain("my-secret-key");
    expect(Object.keys(client)).not.toContain("apiKey");
    expect(client.apiKey).toBe("my-secret-key");
  });
});
