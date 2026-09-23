import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

describe("Area/WarehouseType extend their base instead of aliasing it (T10, AC-01, AC-03)", () => {
  const contents = readFileSync(repoPath("src/types/address.ts"), "utf8");

  it.each(["Area", "WarehouseType"])(
    "%s is declared as `export interface %s extends AddressReferenceRecordBase {}`, not a bare type alias",
    (name) => {
      const aliasPattern = new RegExp(`export\\s+type\\s+${name}\\s*=`);
      expect(aliasPattern.test(contents), `${name} must not be a plain type alias — TypeDoc renders it as a dangling unlinked name`).toBe(false);

      const extendsPattern = new RegExp(`export\\s+interface\\s+${name}\\s+extends\\s+AddressReferenceRecordBase\\s*\\{`);
      expect(extendsPattern.test(contents)).toBe(true);
    },
  );
});
