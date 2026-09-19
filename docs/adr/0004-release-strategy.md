---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-20"
feature_size: ""
ticket: ""
---

# 0004 — Changesets-driven semantic versioning and npm publish

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** User (project owner) + Architect (survey session)

## Context

The library needs to be installable from other projects (npm and/or the public GitHub repo directly),
with `main` protected from direct/unauthorized commits. Releases therefore happen through reviewed
PRs merging to `main`, and each merge needs a repeatable, auditable way to decide the next version
and publish it.

## Decision drivers

- `main` is protected (ADR-driven by the governance requirement) — release automation must run from CI on merge, not from a maintainer's local `npm publish`.
- Consumers depend on semantic versioning to safely upgrade — version bumps must reflect actual change scope (patch/minor/major), not be manually guessed.
- A public package needs a visible changelog so consumers can see what changed between versions.

## Considered options

1. **Changesets** — contributors add a small markdown "changeset" file per PR describing the change and its semver bump; a GitHub Actions workflow aggregates them into a version bump + `CHANGELOG.md` + npm publish on merge to `main`.
2. **`semantic-release`** — infers the version bump from Conventional Commit messages automatically, no per-PR changeset file needed.
3. **Manual versioning** — a maintainer bumps `package.json` version and runs `npm publish` by hand.

## Decision outcome

**Chosen:** Option 1 (Changesets). It keeps the version-bump decision explicit and human-reviewed per
PR (a changeset file is part of the diff, so reviewers see the intended bump before merge) rather than
inferred from commit message text, while still fully automating the actual publish step so no one
needs local npm publish rights.

## Consequences

**Positive**
- The changelog is written by contributors as part of their PR, not reconstructed after the fact.
- Publishing happens only through CI, consistent with the branch-protection requirement — no local `npm publish` credentials needed on any contributor's machine.

**Negative**
- Contributors must remember to add a changeset file to each PR that should trigger a release (a CI check can enforce this, but it's an extra step vs. fully automatic commit-message inference).

**Neutral**
- Switching to `semantic-release` later is possible but would mean adopting Conventional Commits as a hard convention across all PRs.

## Links

- Spec: N/A — greenfield foundation, predates any feature spec.
- SAD: N/A — captured directly in [[../architecture-map.md]].
- Related ADR: [[0001-typescript-node-stack]]
