import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

describe("documentation hard-fail rule is enabled (T8, AC-02, AC-04, AC-06)", () => {
  const config = JSON.parse(readFileSync(repoPath("typedoc.json"), "utf8")) as {
    treatWarningsAsErrors?: boolean;
    validation?: { notExported?: boolean; notDocumented?: boolean };
  };

  it("typedoc.json's treatWarningsAsErrors is true, after the report-only spike confirmed zero missing", () => {
    expect(config.treatWarningsAsErrors).toBe(true);
  });

  it("scopes the hard-fail to missing comments only — notExported stays off (spec §6 NFR: only the coverage row fails CI)", () => {
    expect(config.validation?.notExported).toBe(false);
    expect(config.validation?.notDocumented).toBe(true);
  });
});
