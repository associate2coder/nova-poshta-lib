import { describe, expect, it } from "vitest";
import { createAddressModule, createClient } from "../../src/index.js";

describe("package entry point", () => {
  it("imports and exports a client factory without throwing", () => {
    expect(typeof createClient).toBe("function");
    expect(() => createClient("test-api-key")).not.toThrow();
  });

  it("imports and exports createAddressModule, type-checked against a real client (T7, AC-12)", () => {
    expect(typeof createAddressModule).toBe("function");
    expect(() => createAddressModule(createClient("test-api-key"))).not.toThrow();
  });
});
