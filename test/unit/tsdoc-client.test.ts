import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

function hasPrecedingComment(fileContents: string, declarationPattern: RegExp): boolean {
  const match = fileContents.match(declarationPattern);
  return match !== null && /\/\*\*((?:(?!\*\/)[\s\S])*)\*\//.test(match[0]);
}

describe("client.ts TSDoc coverage (T3, AC-04)", () => {
  const contents = readFileSync(repoPath("src/client.ts"), "utf8");

  it.each([
    ["createClient", /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export\s+function\s+createClient\b/],
    ["NovaPoshtaApiError", /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export\s+class\s+NovaPoshtaApiError\b/],
    ["NovaPoshtaClient", /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export\s+interface\s+NovaPoshtaClient\b/],
  ])("%s has a TSDoc comment", (_name, pattern) => {
    expect(hasPrecedingComment(contents, pattern)).toBe(true);
  });

  it("NovaPoshtaClient.request has a TSDoc comment (its sibling methods already do)", () => {
    const requestMethodPattern = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*request<T>\(/;
    expect(hasPrecedingComment(contents, requestMethodPattern)).toBe(true);
  });
});
