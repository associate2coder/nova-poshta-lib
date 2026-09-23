---
id: T1
title: "Add typedoc.json + typedoc devDependency + docs:build script"
layer: "infra"
deps: []
acs: []
files_hint: ["typedoc.json", "package.json"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T1 — Add typedoc.json + typedoc devDependency + docs:build script

## Why

Establishes the generator every later task depends on — [sad §5](../sad.md) names `typedoc.json`
as the new entry-point/config file; [sad §4 pillar 1](../sad.md) fixes TypeDoc as the generator.

## What

- Add `typedoc` as a devDependency (no version pinned per [sad §2](../sad.md) — nothing existing
  conflicts).
- Add `typedoc.json`: entry point `src/index.ts` (the single public-surface file per
  `CLAUDE.md`'s Layout), output to a build-only directory (git-ignored), `excludeInternal: true`
  wired but `requiredToBeDocumented` / `validation.notDocumented` left **off** for now (T8 turns
  that on after the spike).
- Add a `docs:build` npm script running `typedoc`.
- Add the typedoc output directory to `.gitignore`.

## Definition of Done

- [ ] `npm run docs:build` succeeds locally and produces static HTML output.
- [ ] `typedoc.json`'s entry point resolves to exactly `src/index.ts`.
- [ ] lint + typecheck clean.

## Notes

Do not enable `treatWarningsAsErrors` here — that is T8's job, after the report-only validation
spike (AC-06) confirms zero false positives.
