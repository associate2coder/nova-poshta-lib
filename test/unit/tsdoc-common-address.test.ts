import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

function exportedDeclarationNames(fileContents: string): string[] {
  const names: string[] = [];
  const pattern = /^export\s+(?:interface|type|function)\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
  for (const match of fileContents.matchAll(pattern)) {
    const name = match[1];
    if (name) names.push(name);
  }
  return names;
}

function isDocumented(fileContents: string, declarationName: string): boolean {
  const pattern = new RegExp(
    `/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*export\\s+(?:interface|type|function)\\s+${declarationName}\\b`,
  );
  return pattern.test(fileContents);
}

describe.each([
  ["src/types/common.ts", "common.ts"],
  ["src/modules/common/index.ts", "common module"],
  ["src/types/address.ts", "address.ts"],
  ["src/modules/address/index.ts", "address module"],
])("%s every exported declaration is documented (T4, AC-04)", (relativePath) => {
  const contents = readFileSync(repoPath(relativePath), "utf8");
  const names = exportedDeclarationNames(contents);

  it("found at least one exported declaration to check", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  it.each(names)("%s has a TSDoc comment", (name) => {
    expect(isDocumented(contents, name)).toBe(true);
  });
});

describe("CommonModule / AddressModule methods are documented", () => {
  it("every method inside CommonModule has a preceding TSDoc comment", () => {
    const contents = readFileSync(repoPath("src/modules/common/index.ts"), "utf8");
    const interfaceMatch = contents.match(/interface CommonModule \{([\s\S]*?)\n\}/);
    expect(interfaceMatch).not.toBeNull();
    const body = interfaceMatch![1] ?? "";
    const methodNames = [...body.matchAll(/^\s*(\w+)\(/gm)].map((m) => m[1]);
    expect(methodNames.length).toBeGreaterThan(0);
    for (const method of methodNames) {
      const methodPattern = new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*${method}\\(`);
      expect(methodPattern.test(body), `expected ${method} to have a preceding comment`).toBe(true);
    }
  });

  it("every method inside AddressModule has a preceding TSDoc comment", () => {
    const contents = readFileSync(repoPath("src/modules/address/index.ts"), "utf8");
    const interfaceMatch = contents.match(/interface AddressModule \{([\s\S]*?)\n\}/);
    expect(interfaceMatch).not.toBeNull();
    const body = interfaceMatch![1] ?? "";
    const methodNames = [...body.matchAll(/^\s*(\w+)\(/gm)].map((m) => m[1]);
    expect(methodNames.length).toBeGreaterThan(0);
    for (const method of methodNames) {
      const methodPattern = new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*${method}\\(`);
      expect(methodPattern.test(body), `expected ${method} to have a preceding comment`).toBe(true);
    }
  });
});
