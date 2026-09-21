import { describe, expect, it } from "vitest";
import { createClient } from "../../src/index.js";
import { createInternetDocumentModule } from "../../src/modules/internet-document/index.js";

const apiKey = process.env.NOVA_POSHTA_TEST_API_KEY;

// Opt-in only, per CLAUDE.md: hits the real Nova Poshta API, skipped automatically when
// NOVA_POSHTA_TEST_API_KEY is absent — never blocks CI without a key configured (spec.md §5 AC-09,
// test-plan.md "CI placement").
//
// Scope note (review 2026-09-21 finding 9): getDocumentList needs no seed Ref (matches
// counterparty's getCounterparties precedent), so it's covered here. save/update/delete and the two
// calculators need a real sender Ref, recipient Ref, and city/warehouse Refs to exercise honestly —
// this suite doesn't fabricate those, so their integration-tier coverage stays tracked in
// test-plan.md pending seeded fixtures (owner: Tech Lead), rather than silently claimed here.
describe.skipIf(!apiKey)("internet-document module — integration (AC-09)", () => {
  it("getDocumentList returns a real, typed page of the caller's own waybills", async () => {
    const internetDocument = createInternetDocumentModule(createClient(apiKey as string));

    const result = await internetDocument.getDocumentList();

    expect(Array.isArray(result)).toBe(true);
    for (const item of result) {
      expect(typeof item.Ref).toBe("string");
      expect(typeof item.IntDocNumber).toBe("string");
    }
  });
});
