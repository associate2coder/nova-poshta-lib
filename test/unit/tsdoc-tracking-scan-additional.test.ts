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

function interfaceMethodsDocumented(fileContents: string, interfaceName: string): void {
  const interfaceMatch = fileContents.match(new RegExp(`interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`));
  expect(interfaceMatch, `expected to find interface ${interfaceName}`).not.toBeNull();
  const body = interfaceMatch![1] ?? "";
  const methodNames = [...body.matchAll(/^\s*(\w+)\(/gm)].map((m) => m[1]);
  expect(methodNames.length).toBeGreaterThan(0);
  for (const method of methodNames) {
    const methodPattern = new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*${method}\\(`);
    expect(methodPattern.test(body), `expected ${interfaceName}.${method} to have a preceding comment`).toBe(true);
  }
}

describe.each([
  ["src/types/tracking-document.ts", "tracking-document.ts"],
  ["src/modules/tracking-document/index.ts", "tracking-document module"],
  ["src/types/scan-sheet.ts", "scan-sheet.ts"],
  ["src/modules/scan-sheet/index.ts", "scan-sheet module"],
  ["src/types/additional-service.ts", "additional-service.ts"],
  ["src/modules/additional-service/index.ts", "additional-service module"],
])("%s every exported declaration is documented (T6, AC-04)", (relativePath) => {
  const contents = readFileSync(repoPath(relativePath), "utf8");
  const names = exportedDeclarationNames(contents);

  it("found at least one exported declaration to check", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  it.each(names)("%s has a TSDoc comment", (name) => {
    expect(isDocumented(contents, name)).toBe(true);
  });
});

describe("TrackingDocumentModule / ScanSheetModule / AdditionalServiceModule methods are documented", () => {
  it("every method inside TrackingDocumentModule has a preceding TSDoc comment", () => {
    interfaceMethodsDocumented(
      readFileSync(repoPath("src/modules/tracking-document/index.ts"), "utf8"),
      "TrackingDocumentModule",
    );
  });

  it("every method inside ScanSheetModule has a preceding TSDoc comment", () => {
    interfaceMethodsDocumented(readFileSync(repoPath("src/modules/scan-sheet/index.ts"), "utf8"), "ScanSheetModule");
  });

  it("every method inside AdditionalServiceModule has a preceding TSDoc comment", () => {
    interfaceMethodsDocumented(
      readFileSync(repoPath("src/modules/additional-service/index.ts"), "utf8"),
      "AdditionalServiceModule",
    );
  });
});
