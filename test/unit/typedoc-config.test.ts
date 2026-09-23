import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

describe("typedoc config (T1)", () => {
  it("typedoc.json declares src/index.ts as its sole entry point and excludes @internal", () => {
    const raw = readFileSync(repoPath("typedoc.json"), "utf8");
    const config = JSON.parse(raw) as { entryPoints?: string[]; excludeInternal?: boolean };

    expect(config.entryPoints).toEqual(["src/index.ts"]);
    expect(config.excludeInternal).toBe(true);
  });

  it("package.json declares a docs:build script that runs typedoc", () => {
    const raw = readFileSync(repoPath("package.json"), "utf8");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string>; devDependencies?: Record<string, string> };

    expect(pkg.scripts?.["docs:build"]).toBe("typedoc");
    expect(pkg.devDependencies?.typedoc).toBeDefined();
  });
});
