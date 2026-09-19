import { describe, expect, it } from "vitest";
import { createClient } from "../../src/index.js";

describe("package entry point", () => {
  it("imports and exports a client factory without throwing", () => {
    expect(typeof createClient).toBe("function");
    expect(() => createClient("test-api-key")).not.toThrow();
  });
});
