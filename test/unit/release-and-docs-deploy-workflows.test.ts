import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function repoPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

describe("release.yml (AC-05, ADR-0002)", () => {
  const contents = readFileSync(repoPath(".github/workflows/release.yml"), "utf8");

  it("runs on pushes to main and stages a publish via the release npm script", () => {
    expect(contents).toMatch(/branches:\s*\[main\]/);
    expect(contents).toMatch(/publish:\s*npm run release/);
  });

  it("grants id-token: write for npm's OIDC trusted-publisher flow, and never sets NPM_TOKEN", () => {
    expect(contents).toMatch(/id-token:\s*write/);
    expect(contents).not.toMatch(/NPM_TOKEN/);
  });

  it("upgrades npm before publishing, since staged publishing needs npm >= 11.15.0", () => {
    expect(contents).toMatch(/npm install -g npm@\^?11\.15\.0/);
  });

  it("has no docs-deploy job of its own (moved to its own workflow, ADR-0002)", () => {
    expect(contents).not.toMatch(/docs-deploy:/);
  });
});

describe("docs-deploy.yml (AC-05, ADR-0002)", () => {
  const contents = readFileSync(repoPath(".github/workflows/docs-deploy.yml"), "utf8");

  it("is manually triggered, not gated on the release job (ADR-0002 supersedes ADR-0001)", () => {
    expect(contents).toMatch(/workflow_dispatch/);
    expect(contents).not.toMatch(/needs:\s*release/);
    expect(contents).not.toMatch(/if:\s*needs\.release\.outputs\.published/);
  });

  it("never receives NPM_TOKEN — only the short-lived Pages OIDC token (spec §6.1)", () => {
    expect(contents).not.toMatch(/NPM_TOKEN/);
    expect(contents).toMatch(/id-token:\s*write/);
  });

  it("uses actions/deploy-pages and actions/upload-pages-artifact, pinned to an explicit major version", () => {
    expect(contents).toMatch(/actions\/upload-pages-artifact@v\d+/);
    expect(contents).toMatch(/actions\/deploy-pages@v\d+/);
  });

  it("builds the docs site before deploying it", () => {
    expect(contents).toMatch(/npm run docs:build/);
  });

  it("declares contents: read for actions/checkout, since permissions: zeroes every unlisted scope", () => {
    expect(contents).toMatch(/contents:\s*read/);
  });

  it("uses configure-pages without enablement:true — GITHUB_TOKEN can never create a Pages site (needs administration:write); Pages must already be enabled manually (repo Settings → Pages → Source: GitHub Actions)", () => {
    const configurePagesIndex = contents.indexOf("actions/configure-pages@");
    expect(configurePagesIndex).toBeGreaterThan(-1);
    const configurePagesStep = contents.slice(configurePagesIndex, configurePagesIndex + 100);
    expect(configurePagesStep).not.toMatch(/enablement:\s*true/);
  });
});
