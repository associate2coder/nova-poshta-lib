---
status: Accepted
owner: "associate2coder"
reviewers: []
updated_at: "2026-09-26"
feature_size: "S"
ticket: "docs/features/documentation/spec.md"
---

# 0002 — Manual docs-deploy trigger under npm staged publishing

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** associate2coder (post-ship: the release pipeline had never actually succeeded —
  see the fix's PR history — and the fix itself required moving to npm's OIDC trusted-publishing
  flow, which changed the assumptions ADR-0001 was built on)

## Context

ADR-0001 gated `docs-deploy` on `changesets/action`'s `published` output, reasoning that once that
job reports success the version is live on npm. In practice the release pipeline had never
succeeded at all up to this point — `@changesets/write`'s `human-id` dependency shipped ESM-only
and crashed `changeset version` under Node's CJS loader on every merge to `main`. Fixing that
surfaced two further blockers in sequence: the repo's classic `NPM_TOKEN` couldn't publish without
2FA-bypass permission, and — once the maintainer opted into npm's OIDC **trusted publishing**
(npm's own recommended way to publish from CI, avoiding a long-lived registry credential entirely)
— the maintainer specifically chose to restrict the trusted publisher to `npm stage publish` only,
adding a mandatory human-approval-with-2FA step before any version actually goes live
([docs.npmjs.com/staged-publishing](https://docs.npmjs.com/staged-publishing/)).

That choice breaks ADR-0001's premise directly: `changesets/action`'s `publish` step now runs a
custom script (`scripts/stage-publish.mjs`) that calls `npm stage publish`, not `npm publish` — the
version is *submitted for review*, not live. The moment it actually becomes installable is whenever
the maintainer later runs `npm stage approve <stage-id>` (CLI or npmjs.com, always with 2FA) — an
event GitHub Actions has no built-in way to observe. `@changesets/cli` also has no native staged-
publishing support yet (tracked upstream:
[changesets/changesets#2025](https://github.com/changesets/changesets/issues/2025)), so there is no
tool-provided signal to key off either.

## Decision drivers

- AC-05 (spec §5): the reference site must reflect "exactly that version — never an older or
  not-yet-released state." A staged-but-unapproved version is not yet released; rebuilding docs for
  it would violate this AC, not satisfy it.
- No available automatic signal: no npm webhook fires into GitHub Actions on stage-approval, and
  changesets/action's own output no longer means "live."
- The maintainer already performs a deliberate, 2FA-gated manual action (approval) at exactly the
  moment docs-deploy should fire — the natural place to also trigger it.

## Considered options

1. **Manual `workflow_dispatch` run right after approval.** Extract `docs-deploy` into its own
   workflow file with no automatic trigger; the maintainer runs it (`gh workflow run
   docs-deploy.yml` or the Actions UI) immediately after `npm stage approve`.
2. **Scheduled poll.** A new workflow on a cron schedule (e.g. hourly) compares the live npm
   version to whatever the deployed docs site currently reflects, and rebuilds on a mismatch.

## Decision outcome

**Chosen:** Option 1 — manual trigger. It adds no new scheduled workflow, no polling logic, and no
lag beyond how promptly the maintainer runs it — approval and doc-freshness become one deliberate
action instead of two independent ones drifting apart. Option 2 satisfies AC-05's "never an older
state" half automatically, but only after however-long the poll interval is, trading a bounded
worst-case (up to the interval length) for less day-to-day cognitive load; on a repo whose merges
and releases are already infrequent and manually reviewed, that trade wasn't judged worth the extra
recurring workflow. Revisiting Option 2 remains open if the manual step is ever missed in practice
(see Consequences).

## Consequences

**Positive**
- No new recurring workflow to maintain or reason about; the release pipeline's automatic part
  (`release.yml`) still runs unattended for versioning and staging.
- Docs-deploy fires at the moment the maintainer already knows, for certain, that the version is
  live — no "is it actually published yet" ambiguity.

**Negative**
- Relies on the maintainer remembering the extra step; a missed trigger leaves the reference site
  stale with no automatic correction (unlike Option 2, which self-heals within one poll interval).
- `docs-deploy.yml`'s own history no longer shows *why* each run happened (no linked commit/release
  the way a `push`-triggered run would show) — only that it was dispatched manually.

**Neutral**
- Nothing prevents adding Option 2 as a backstop later without touching this decision's Option-1
  path — the two are not mutually exclusive, just independently triggerable.

## Links

- Spec: [[../spec.md]] §5 AC-05
- Superseded ADR: [[0001-gate-docs-deploy-job-on-changesets-publish-output.md]]
- Upstream gap: [changesets/changesets#2025](https://github.com/changesets/changesets/issues/2025)
