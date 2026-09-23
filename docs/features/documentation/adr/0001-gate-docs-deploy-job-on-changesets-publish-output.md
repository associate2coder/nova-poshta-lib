---
status: Accepted
owner: "associate2coder"
reviewers: []
updated_at: "2026-09-23"
feature_size: "S"
ticket: "docs/features/documentation/spec.md"
---

# 0001 — Gate the docs-deploy job on the changesets publish output

- **Status:** Accepted
- **Date:** 2026-09-23
- **Deciders:** associate2coder (during the `design` Socratic walk)

## Context

`spec.md` §1 ¶4 already fixes WHERE the generated reference site is hosted (GitHub Pages) and WHEN
it should rebuild (only when a new **stable** version actually reaches npm, never on every merge to
`main`). What it explicitly leaves open — "recorded here as a fixed decision for `design` to wire
up" applies to hosting only; the rebuild trigger's *mechanism* is design's to choose. AC-05 requires
that a docs-rebuild failure "never blocks, delays, or undoes the already-completed npm publish" —
that safety property is the actual decision driver here, not the hosting target. The repo's existing
`release.yml` workflow already publishes to npm via `changesets/action`, which exposes a boolean
`published` output once its job completes.

## Decision drivers

- AC-05 (spec §5): a docs-rebuild failure must never block, delay, or undo the already-completed npm
  publish — the rebuild is "a separate mechanism from the npm publish step itself."
- NFR (spec §6): docs-site freshness lag ≤ 5 minutes from npm publish to site update.
- Security constraint (spec §6.1): the publishing mechanism must not introduce a new long-lived
  credential — it must use a short-lived, narrowly-scoped credential, consistent with how the
  existing release workflow is already permissioned.
- Existing capability already in the stack: `changesets/action` already computes and exposes whether
  a publish actually happened (its `published` output) — no new signal needs inventing.

## Considered options

1. **Same-workflow job, gated on the `changesets/action` `published` output.** A second job added to
   the existing `release.yml`, declared with `needs: release` and `if: needs.release.outputs.published
   == 'true'`.
2. **Separate workflow, triggered by `workflow_run` on `release.yml`'s completion.** A new
   `docs-deploy.yml` file listening for `release.yml` to finish, re-deriving "did a publish actually
   happen" (e.g. by checking whether a fresh version tag landed) since `workflow_run` does not receive
   the upstream workflow's job outputs directly.

## Decision outcome

**Chosen:** Option 1 — a same-workflow job gated on the `published` output. GitHub Actions already
treats jobs within one workflow run as independent nodes in a DAG: a downstream job's failure does
not retroactively change the status of a job that already completed successfully, so AC-05's
non-blocking guarantee holds without any extra plumbing. Option 2 buys no additional isolation over
what job-level independence already provides, while adding a tag-sniffing workaround to recover the
`published` signal that `changesets/action` already exposes directly.

**On spec §6.1's "separate from the existing release-to-npm workflow" wording.** Read literally,
that clause describes two workflow *files*; this ADR chooses one file with two jobs instead. The
underlying threat it defends against — "a compromise or bug in [the docs mechanism] cannot reach the
npm publish step" — is satisfied at the **job** level, not only the file level: each GitHub Actions
job runs on its own freshly-provisioned runner, and the docs-deploy job is never granted the
`NPM_TOKEN` used by the publish job (it receives only the short-lived Pages OIDC token via
`id-token: write`, scoped to that job alone). A compromised or buggy docs-deploy job therefore has no
path to the npm-publish credential regardless of file layout — the isolation spec asked for is
achieved by credential scoping, not by file separation. This is a deliberate reading of the spec's
intent, recorded here rather than left implicit.

## Consequences

**Positive**
- Uses a signal (`published`) that already exists on the `changesets/action` step — no new
  detection logic to write or maintain.
- AC-05's non-blocking guarantee is structural (job-level isolation), not something that has to be
  separately verified or drift out of sync.
- One workflow file to read to understand the whole release-to-docs path.

**Negative**
- The docs-deploy job lives in the same file as the npm-publish job — a future edit to one is more
  likely to be read (and risk being touched) alongside the other than if they were separate files.

**Neutral**
- Switching to a separate `workflow_run`-triggered workflow later is possible (it's a YAML
  extraction), but not planned — no signal today suggests the coupling causes friction.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §5, §7
- Related ADR: none
