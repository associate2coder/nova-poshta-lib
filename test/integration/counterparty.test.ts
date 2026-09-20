import { describe, expect, it } from "vitest";
import { createClient } from "../../src/index.js";
import { createCounterpartyModule } from "../../src/modules/counterparty/index.js";

const apiKey = process.env.NOVA_POSHTA_TEST_API_KEY;

// Opt-in only, per CLAUDE.md: hits the real Nova Poshta API, skipped automatically when
// NOVA_POSHTA_TEST_API_KEY is absent — never blocks CI without a key configured (spec.md §5
// AC-01/AC-02, test plan "CI placement").
describe.skipIf(!apiKey)("counterparty module — integration (AC-01/AC-02)", () => {
  it("getCounterparties returns a real, typed page of the caller's own counterparties", async () => {
    const counterparty = createCounterpartyModule(createClient(apiKey as string));

    const result = await counterparty.getCounterparties({ CounterpartyProperty: "Sender" });

    expect(Array.isArray(result)).toBe(true);
    for (const record of result) {
      expect(typeof record.Ref).toBe("string");
      expect(["PrivatePerson", "Organization", "ThirdParty"]).toContain(record.CounterpartyType);
    }
  });
});
