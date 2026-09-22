import { describe, expect, it } from "vitest";
import { createClient } from "../../src/index.js";
import { createTrackingDocumentModule } from "../../src/modules/tracking-document/index.js";

const apiKey = process.env.NOVA_POSHTA_TEST_API_KEY;
const waybill = process.env.NOVA_POSHTA_TEST_WAYBILL;

// Opt-in only, per CLAUDE.md: hits the real Nova Poshta API, skipped automatically when either
// NOVA_POSHTA_TEST_API_KEY or NOVA_POSHTA_TEST_WAYBILL is absent — never blocks CI without both
// configured (spec.md §5 AC-01, "Test data" — the waybill is supplied via its own env var rather
// than hardcoded, matching this repo's existing caution around committing a real record into a
// test).
describe.skipIf(!apiKey || !waybill)("tracking-document module — integration (AC-01)", () => {
  it("getStatusDocuments returns a real, typed tracking status for a known waybill", async () => {
    const trackingDocument = createTrackingDocumentModule(createClient(apiKey as string));

    const result = await trackingDocument.getStatusDocuments({
      Documents: [{ DocumentNumber: waybill as string, Phone: "" }],
    });

    expect(Array.isArray(result)).toBe(true);
    for (const record of result) {
      expect(typeof record.Number).toBe("string");
      expect(typeof record.StatusCode).toBe("number");
      expect(typeof record.Status).toBe("string");
    }
  });
});
