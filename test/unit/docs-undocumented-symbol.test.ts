import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

describe("AC-02: CI fails by naming the exact undocumented symbol", () => {
  it("typedoc exits non-zero and names the undocumented export in its output", () => {
    const result = spawnSync(
      repoPath("node_modules/.bin/typedoc"),
      ["--emit", "none", "--entryPoints", repoPath("test/unit/fixtures/undocumented-export.fixture.ts")],
      { cwd: repoPath("."), encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("fixtureUndocumentedExport");
  });
});
