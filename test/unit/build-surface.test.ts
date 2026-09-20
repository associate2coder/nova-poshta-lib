import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const METHOD_NAMES = [
  "getCargoTypes",
  "getBackwardDeliveryCargoTypes",
  "getCargoDescriptionList",
  "getDocumentStatuses",
  "getOwnershipFormsList",
  "getPalletsList",
  "getPaymentForms",
  "getServiceTypes",
  "getTimeIntervals",
  "getTiresWheelsList",
  "getTraysList",
  "getTypesOfAlternativePayers",
  "getTypesOfPayers",
  "getTypesOfPayersForRedelivery",
  "getTypesOfCounterparties",
];

describe("published build surface (AC-07)", () => {
  it.each([
    ["dist/index.d.ts", "ESM"],
    ["dist/index.d.cts", "CJS"],
  ])("%s (%s) declares createCommonModule and all 15 reference-list methods", (declarationPath) => {
    let contents: string;
    try {
      contents = readFileSync(declarationPath, "utf8");
    } catch {
      throw new Error(`${declarationPath} is missing — run "npm run build" before this test`);
    }

    expect(contents).toContain("createCommonModule");
    for (const method of METHOD_NAMES) {
      expect(contents).toContain(method);
    }
  });
});
