import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

describe("ci.yml documentation-coverage step (T7, AC-06)", () => {
  const contents = readFileSync(repoPath(".github/workflows/ci.yml"), "utf8");

  it("runs typedoc's validation against the existing build-test-lint job", () => {
    expect(contents).toMatch(/run:\s*npx typedoc --emit none/);
  });

  it("does not yet pass --treatWarningsAsErrors to the CLI invocation (report-only until T8's spike confirms zero missing)", () => {
    expect(contents).not.toMatch(/typedoc[^\n]*--treatWarningsAsErrors/);
  });

  it("the step appears after the existing lint step, in the same job", () => {
    const lintIndex = contents.indexOf("npm run lint");
    const docsStepIndex = contents.indexOf("npx typedoc --emit none");
    expect(lintIndex).toBeGreaterThan(-1);
    expect(docsStepIndex).toBeGreaterThan(lintIndex);
  });
});

describe("typedoc.json scopes the coverage check to type/function/method level (T7)", () => {
  const config = JSON.parse(readFileSync(repoPath("typedoc.json"), "utf8")) as {
    validation?: { notDocumented?: boolean };
    requiredToBeDocumented?: string[];
  };

  it("enables the notDocumented check", () => {
    expect(config.validation?.notDocumented).toBe(true);
  });

  it("does not require documentation on individual Property fields (spec.md §1 ¶4 override)", () => {
    expect(config.requiredToBeDocumented).not.toContain("Property");
  });

  it("does require documentation on Interface/Class/Function/Method/TypeAlias declarations", () => {
    for (const kind of ["Interface", "Class", "Function", "Method", "TypeAlias"]) {
      expect(config.requiredToBeDocumented).toContain(kind);
    }
  });
});

describe("src/types/envelope.ts exports are documented (found by T7's report-only spike)", () => {
  const contents = readFileSync(repoPath("src/types/envelope.ts"), "utf8");

  it.each(["NovaPoshtaEnvelope", "NovaPoshtaRequest"])("%s has a TSDoc comment", (name) => {
    const pattern = new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*export\\s+interface\\s+${name}\\b`);
    expect(pattern.test(contents)).toBe(true);
  });
});
