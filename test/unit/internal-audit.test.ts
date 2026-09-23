import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

function declaredWithInternalTag(fileContents: string, declarationName: string): boolean {
  // The comment body must not itself contain "*/" — a JSDoc block always ends at its first one —
  // so this only ever matches the single comment immediately preceding the declaration, never an
  // earlier, unrelated block's comment further up the file.
  const declarationPattern = new RegExp(
    `/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*export\\s+(?:interface|type)\\s+${declarationName}\\b`,
  );
  const match = fileContents.match(declarationPattern);
  return match !== null && /@internal\b/.test(match[1] ?? "");
}

describe("internal-export audit (T2, AC-03)", () => {
  it("marks AddressReferenceRecordBase @internal — used only as a base for public address types", () => {
    const contents = readFileSync(repoPath("src/types/address.ts"), "utf8");
    expect(declaredWithInternalTag(contents, "AddressReferenceRecordBase")).toBe(true);
  });

  it("marks CounterpartyRecordBase @internal — used only as a base for public counterparty types", () => {
    const contents = readFileSync(repoPath("src/types/counterparty.ts"), "utf8");
    expect(declaredWithInternalTag(contents, "CounterpartyRecordBase")).toBe(true);
  });

  it("marks OpenEnum @internal — a generic pattern type, never a standalone public signature", () => {
    const contents = readFileSync(repoPath("src/types/common.ts"), "utf8");
    expect(declaredWithInternalTag(contents, "OpenEnum")).toBe(true);
  });

  it("keeps SearchWrapper public — it is the literal return type of searchSettlements/searchSettlementStreets", () => {
    const contents = readFileSync(repoPath("src/types/address.ts"), "utf8");
    expect(declaredWithInternalTag(contents, "SearchWrapper")).toBe(false);
  });

  it("keeps TRACKING_STATUS_CODES public — its own comment says it exists for consuming developers", () => {
    const contents = readFileSync(repoPath("src/types/tracking-document.ts"), "utf8");
    const declarationPattern = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export\s+const\s+TRACKING_STATUS_CODES\b/;
    const match = contents.match(declarationPattern);
    expect(match).not.toBeNull();
    expect(/@internal\b/.test(match?.[1] ?? "")).toBe(false);
  });
});
