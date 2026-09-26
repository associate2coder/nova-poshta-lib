import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

describe("release.yml docs-deploy job (T9, AC-01, AC-05, ADR-0001)", () => {
  const contents = readFileSync(repoPath(".github/workflows/release.yml"), "utf8");

  it("the release job exposes changesets/action's published output", () => {
    expect(contents).toMatch(/outputs:\s*\n\s*published:\s*\$\{\{\s*steps\.\w+\.outputs\.published\s*\}\}/);
  });

  it("declares a docs-deploy job gated on needs.release.outputs.published == 'true' (ADR-0001)", () => {
    expect(contents).toMatch(/docs-deploy:/);
    expect(contents).toMatch(/needs:\s*release/);
    expect(contents).toMatch(/if:\s*needs\.release\.outputs\.published\s*==\s*'true'/);
  });

  it("docs-deploy never receives NPM_TOKEN — only the short-lived Pages OIDC token (spec §6.1)", () => {
    const docsDeployIndex = contents.indexOf("docs-deploy:");
    expect(docsDeployIndex).toBeGreaterThan(-1);
    const docsDeploySection = contents.slice(docsDeployIndex);
    expect(docsDeploySection).not.toMatch(/NPM_TOKEN/);
    expect(docsDeploySection).toMatch(/id-token:\s*write/);
  });

  it("uses actions/deploy-pages and actions/upload-pages-artifact, pinned to an explicit major version", () => {
    expect(contents).toMatch(/actions\/upload-pages-artifact@v\d+/);
    expect(contents).toMatch(/actions\/deploy-pages@v\d+/);
  });

  it("builds the docs site before deploying it", () => {
    const docsDeployIndex = contents.indexOf("docs-deploy:");
    const docsDeploySection = contents.slice(docsDeployIndex);
    expect(docsDeploySection).toMatch(/npm run docs:build/);
  });

  it("declares contents: read for actions/checkout, since permissions: zeroes every unlisted scope (T13)", () => {
    const docsDeployIndex = contents.indexOf("docs-deploy:");
    const docsDeploySection = contents.slice(docsDeployIndex);
    expect(docsDeploySection).toMatch(/contents:\s*read/);
  });

  it("enables GitHub Pages via configure-pages's enablement flag, since Pages isn't yet on for this repo (T14)", () => {
    const docsDeployIndex = contents.indexOf("docs-deploy:");
    const docsDeploySection = contents.slice(docsDeployIndex);
    const configurePagesIndex = docsDeploySection.indexOf("actions/configure-pages@");
    expect(configurePagesIndex).toBeGreaterThan(-1);
    const configurePagesStep = docsDeploySection.slice(configurePagesIndex, configurePagesIndex + 100);
    expect(configurePagesStep).toMatch(/enablement:\s*true/);
  });
});
