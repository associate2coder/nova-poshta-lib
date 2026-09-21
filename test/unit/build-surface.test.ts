import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

const ADDRESS_METHOD_NAMES = [
  "getCities",
  "getSettlements",
  "searchSettlements",
  "getAreas",
  "getStreet",
  "searchSettlementStreets",
  "getWarehouses",
  "getWarehouseTypes",
  "save",
  "update",
  "delete",
  "findCityByName",
];

const COUNTERPARTY_METHOD_NAMES = [
  "getCounterparties",
  "getCounterpartiesCatalog",
  "getCounterpartyContactPersons",
  "getCounterpartyAddresses",
  "getCounterpartyOptions",
  "save",
  "update",
  "delete",
  "saveContactPerson",
  "updateContactPerson",
  "deleteContactPerson",
  "findCounterparty",
];

const INTERNET_DOCUMENT_METHOD_NAMES = [
  "save",
  "update",
  "delete",
  "getDocumentList",
  "getDocumentPrice",
  "getDocumentDeliveryDate",
  "printDocument",
  "printMarkings",
];

function declarationPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath.replace(/^\.\//, "")}`, import.meta.url));
}

interface PackageJsonExportsCondition {
  import?: { types?: string };
  require?: { types?: string };
}

function resolvedTypesPaths(): { esm: string; cjs: string } {
  const packageJson = JSON.parse(readFileSync(declarationPath("package.json"), "utf8")) as {
    exports: { ".": PackageJsonExportsCondition };
  };
  const condition = packageJson.exports["."];
  const esm = condition.import?.types;
  const cjs = condition.require?.types;
  if (!esm || !cjs) {
    // A regression class AC-13 exists to catch: e.g. collapsing "exports['.']" back to flat
    // import/require strings silently drops the CJS "types" condition, leaving CJS consumers
    // unable to resolve a .d.cts at all even though the file is still built.
    throw new Error(
      "package.json exports['.'] must declare both import.types and require.types (AC-13) — got: " +
        JSON.stringify(condition),
    );
  }
  return { esm, cjs };
}

const { esm: ESM_TYPES_PATH, cjs: CJS_TYPES_PATH } = resolvedTypesPaths();

describe("published build surface (AC-07)", () => {
  it.each([
    [ESM_TYPES_PATH, "ESM"],
    [CJS_TYPES_PATH, "CJS"],
  ])("%s (%s) declares createCommonModule and all 15 reference-list methods as distinct identifiers", (relativePath) => {
    let contents: string;
    try {
      contents = readFileSync(declarationPath(relativePath), "utf8");
    } catch {
      throw new Error(`${relativePath} is missing — run "npm run build" before this test`);
    }

    expect(contents).toMatch(/\bcreateCommonModule\b/);
    for (const method of METHOD_NAMES) {
      // A word-boundary match, not a substring check — "getTypesOfPayers" is itself a
      // substring of "getTypesOfPayersForRedelivery", so a plain `.toContain` would still
      // pass even if the shorter method were deleted entirely.
      expect(contents, `expected ${relativePath} to declare ${method} as its own identifier`).toMatch(
        new RegExp(`\\b${method}\\b`),
      );
    }
  });

  it.each([
    [ESM_TYPES_PATH, "ESM"],
    [CJS_TYPES_PATH, "CJS"],
  ])("%s (%s) declares createAddressModule and all 12 address identifiers (AC-13)", (relativePath) => {
    let contents: string;
    try {
      contents = readFileSync(declarationPath(relativePath), "utf8");
    } catch {
      throw new Error(`${relativePath} is missing — run "npm run build" before this test`);
    }

    expect(contents).toMatch(/\bcreateAddressModule\b/);
    for (const method of ADDRESS_METHOD_NAMES) {
      // Word-boundary match — "update"/"save"/"delete" are common enough identifiers that a
      // loose substring check could false-positive against unrelated declarations.
      expect(contents, `expected ${relativePath} to declare ${method} as its own identifier`).toMatch(
        new RegExp(`\\b${method}\\b`),
      );
    }
  });

  it.each([
    [ESM_TYPES_PATH, "ESM"],
    [CJS_TYPES_PATH, "CJS"],
  ])("%s (%s) declares createCounterpartyModule and all 12 counterparty identifiers (AC-17)", (relativePath) => {
    let contents: string;
    try {
      contents = readFileSync(declarationPath(relativePath), "utf8");
    } catch {
      throw new Error(`${relativePath} is missing — run "npm run build" before this test`);
    }

    expect(contents).toMatch(/\bcreateCounterpartyModule\b/);

    // Sliced to the CounterpartyModule interface body — several of its method names
    // ("save"/"update"/"delete") are shared with AddressModule, so matching against the
    // whole file would still pass even if these were deleted from CounterpartyModule itself.
    const interfaceMatch = contents.match(/interface CounterpartyModule \{([\s\S]*?)\n\}/);
    expect(interfaceMatch, `expected ${relativePath} to declare a CounterpartyModule interface`).not.toBeNull();
    const interfaceBody = interfaceMatch![1];

    for (const method of COUNTERPARTY_METHOD_NAMES) {
      // Word-boundary match — "update"/"save"/"delete" are common enough identifiers that a
      // loose substring check could false-positive against unrelated declarations.
      expect(interfaceBody, `expected ${relativePath}'s CounterpartyModule to declare ${method}`).toMatch(
        new RegExp(`\\b${method}\\b`),
      );
    }
  });

  it.each([
    [ESM_TYPES_PATH, "ESM"],
    [CJS_TYPES_PATH, "CJS"],
  ])("%s (%s) declares createInternetDocumentModule and all 8 internet-document identifiers (AC-19)", (relativePath) => {
    let contents: string;
    try {
      contents = readFileSync(declarationPath(relativePath), "utf8");
    } catch {
      throw new Error(`${relativePath} is missing — run "npm run build" before this test`);
    }

    expect(contents).toMatch(/\bcreateInternetDocumentModule\b/);

    // Sliced to the InternetDocumentModule interface body — several of its method names
    // ("save"/"update"/"delete") are shared with AddressModule/CounterpartyModule, so matching
    // against the whole file would still pass even if these were deleted from this interface.
    const interfaceMatch = contents.match(/interface InternetDocumentModule \{([\s\S]*?)\n\}/);
    expect(interfaceMatch, `expected ${relativePath} to declare an InternetDocumentModule interface`).not.toBeNull();
    const interfaceBody = interfaceMatch![1];

    for (const method of INTERNET_DOCUMENT_METHOD_NAMES) {
      expect(interfaceBody, `expected ${relativePath}'s InternetDocumentModule to declare ${method}`).toMatch(
        new RegExp(`\\b${method}\\b`),
      );
    }
  });
});
