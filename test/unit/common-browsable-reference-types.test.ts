import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

describe("ReferenceRecordBase is exported and its 8 aliases extend it (T11, AC-01)", () => {
  const contents = readFileSync(repoPath("src/types/common.ts"), "utf8");

  it("ReferenceRecordBase is exported (not left as a bare `interface`)", () => {
    expect(/export\s+interface\s+ReferenceRecordBase\s*\{/.test(contents)).toBe(true);
  });

  it("ReferenceRecordBase has a TSDoc comment", () => {
    const pattern = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export\s+interface\s+ReferenceRecordBase\b/;
    expect(pattern.test(contents)).toBe(true);
  });

  it.each(["CargoType", "CargoDescription", "DocumentStatus", "Pallet", "ServiceType", "TireWheel", "Tray", "AlternativePayerType", "PayerTypeForRedelivery"])(
    "%s is declared as `export interface %s extends ReferenceRecordBase {}`, not a bare type alias",
    (name) => {
      const aliasPattern = new RegExp(`export\\s+type\\s+${name}\\s*=`);
      expect(aliasPattern.test(contents), `${name} must not be a plain type alias — TypeDoc renders it as a dangling unlinked name`).toBe(false);

      const extendsPattern = new RegExp(`export\\s+interface\\s+${name}\\s+extends\\s+ReferenceRecordBase\\s*\\{`);
      expect(extendsPattern.test(contents)).toBe(true);
    },
  );
});

describe("typedoc.json re-enables notExported now that the underlying gap is fixed (T11)", () => {
  const config = JSON.parse(readFileSync(repoPath("typedoc.json"), "utf8")) as {
    validation?: { notExported?: boolean };
  };

  it("validation.notExported is true", () => {
    expect(config.validation?.notExported).toBe(true);
  });
});
