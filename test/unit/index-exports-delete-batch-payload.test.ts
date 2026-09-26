import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

describe("src/index.ts re-exports DeleteBatchInternetDocumentPayload (T12, AC-01)", () => {
  it("the internet-document type export block includes DeleteBatchInternetDocumentPayload", () => {
    const contents = readFileSync(repoPath("src/index.ts"), "utf8");
    const block = contents.match(/export type \{([\s\S]*?)\} from "\.\/types\/internet-document\.js";/);
    expect(block, "expected an internet-document type export block in src/index.ts").not.toBeNull();
    expect(block![1]).toMatch(/\bDeleteBatchInternetDocumentPayload\b/);
  });
});
