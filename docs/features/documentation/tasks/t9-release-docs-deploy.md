---
id: T9
title: "Add docs-deploy job to release.yml"
layer: "wiring"
deps: ["T1"]
acs: ["AC-01", "AC-05"]
files_hint: [".github/workflows/release.yml"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T9 — Add docs-deploy job to release.yml

## Why

Implements [ADR-0001](../adr/0001-gate-docs-deploy-job-on-changesets-publish-output.md): a
same-workflow job gated on `changesets/action`'s `published` output, satisfying
[AC-05](../spec.md) (rebuild only on a stable publish, never blocking the npm publish itself) and
[AC-01](../spec.md) (a browsable reference site must actually exist at a stable URL).

## What

Add a `docs-deploy` job to `.github/workflows/release.yml`:
- `needs: release`, `if: needs.release.outputs.published == 'true'`.
- `permissions: { id-token: write, pages: write }` — no `NPM_TOKEN`, no stored PAT (spec §6.1).
- Steps: checkout, setup-node, `npm ci`, `npm run docs:build` (from T1),
  `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4` — both pinned to explicit major
  versions per [sad §2](../sad.md) / [spec §6.1](../spec.md).
- Enable GitHub Pages (Actions-based deployment source) in repo settings — the one-time,
  out-of-codebase step this requires; note it in the PR description.

## Definition of Done

- [x] The job is gated on `needs.release.outputs.published == 'true'` and skips cleanly when
      nothing was published.
- [x] The job never runs with `NPM_TOKEN` — only the Pages OIDC token.
- [ ] A test release confirms the site rebuilds and reflects the published version within ≤ 5
      minutes (spec §6 NFR), and a forced docs-deploy failure does not affect the already-completed
      `release` job's own status. **Not verifiable in this implementation session** — requires an
      actual npm publish and a live GitHub Pages deployment (and, per spec §3 non-goal, GitHub
      Pages must first be enabled in repo settings — an out-of-codebase step). Structural
      correctness (gating, permissions, pinned actions, YAML validity) is verified by
      `test/unit/release-docs-deploy-job.test.ts`; confirm this item against the first 3 real
      releases after launch (spec §7 KPI).

## Notes

This is the one task that needs a real GitHub Pages environment enabled in repo settings before
it can be exercised end-to-end — flag that dependency in the PR.
