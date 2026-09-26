# Changelog — documentation

## documentation — generated, CI-enforced API reference

**What:** Every non-internal exported symbol in the library (the core client plus all 7 domain
modules — `common`, `address`, `counterparty`, `internet-document`, `tracking-document`,
`scan-sheet`, `additional-service`) now carries a TSDoc comment, is rendered on a generated
TypeDoc reference site published to GitHub Pages, and is protected against regression: CI fails
any pull request that adds an exported symbol without a comment, naming exactly which symbol is
missing it.

**Why:** This was the last unmet requirement named in the project's own foundation intent
(`docs/architecture-map.md` lists "documented" alongside "tested" and "branch-protected") and the
final step of the roadmap (step 8 of 8) — deliberately sequenced after all 7 domain modules
shipped so the reference documents a finished surface rather than a moving target. See
[spec](spec.md) §1/§2. Key decisions: [ADR-0001](adr/0001-gate-docs-deploy-job-on-changesets-publish-output.md)
gates the Pages deploy job on the release workflow's own `published` output rather than a separate
workflow, so a docs-rebuild failure can never retroactively affect the already-completed npm
publish (spec §1 ¶4 decision override, AC-05).

**How to use:** Run `npm run docs:build` to generate the static reference locally (output:
`docs-site/`), or `npm run docs:check` to run the same TypeDoc coverage validation CI runs without
emitting output. In CI, `.github/workflows/ci.yml` runs `docs:check` on every PR (hard-fails on any
undocumented non-internal export); `.github/workflows/release.yml`'s `docs-deploy` job rebuilds and
publishes the live site to GitHub Pages only when `changesets/action` reports a real npm publish
(never on an ordinary merge to main). Three symbols are marked `@internal` and intentionally
excluded from both the site and the coverage check: `AddressReferenceRecordBase`,
`CounterpartyRecordBase`, `OpenEnum`.

**Operational notes:**
- Migration: none — no schema change ([data-model.md](data-model.md)).
- Feature flag / config: none. One manual, one-time repo-admin follow-up remains outside this
  codebase — registering the `docs:check` CI job as a required branch-protection status check in
  GitHub's repository settings (spec §8, open, owner: repo admin).
- Rollback: revert the merge commit; no migration or irreversible external state to unwind. The
  GitHub Pages site is only overwritten on the next successful `docs-deploy` run, so a revert simply
  stops future rebuilds rather than needing its own cleanup.

**Acceptance criteria delivered:** AC-01 (browsable reference with description/params/return
type), AC-02 (CI fails and names the exact undocumented symbol), AC-03 (`@internal` symbols
excluded from both site and check), AC-04 (100% coverage of the current non-internal surface,
0 missing), AC-05 (site rebuilds only on a real stable npm publish, never blocking that publish),
AC-06 (validation spike confirmed 0 false positives before the hard-fail rule was enabled).
