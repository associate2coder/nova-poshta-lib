# Contributing

## Branch protection

`main` is protected: all changes land via pull request with passing CI (build + test + lint) —
no direct pushes to `main`.

## Workflow

1. Branch from `main`.
2. Make your change, with tests under `test/unit/` (mocked `fetch`, no network).
3. Add a changeset: `npx changeset` — every PR that changes published behavior needs one, so the
   release workflow can version and publish it. Docs-only / internal-only changes may skip it.
4. Open a PR against `main`. CI must pass (`npm run build`, `npm test`, `npm run lint`) before merge.

## Release

Merges to `main` trigger the release workflow (`.github/workflows/release.yml`), which uses
[changesets](https://github.com/changesets/changesets) to open a version-bump PR, and publishes
to npm on merge of that PR.
