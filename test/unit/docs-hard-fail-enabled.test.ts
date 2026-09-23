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

  it("enables notDocumented (spec §6 NFR: the coverage row fails CI, per AC-02)", () => {
    expect(config.validation?.notDocumented).toBe(true);
  });

  it("enables notExported now that every reference type it flags is fixed (T11) — a public export referencing an unexported type is a real bug, not noise", () => {
    expect(config.validation?.notExported).toBe(true);
  });
});
