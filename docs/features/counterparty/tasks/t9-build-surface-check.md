---
id: T9
title: "Extend published-build type-surface check"
layer: "tests"
deps: ["T7"]
acs: ["AC-17"]
files_hint: ["test/unit/build-surface.test.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T9 — Extend published-build type-surface check

## Why

AC-17 requires every in-scope method to appear as its own distinctly named, typed method in both the
ESM and CJS published builds, verified in CI by importing the *built* package output (not the source).
`address`/`common` already established this check in `test/unit/build-surface.test.ts` — this task
extends the same file rather than creating a parallel one (`sad.md` §5).

## What

In `test/unit/build-surface.test.ts`, add `counterparty`'s 12 identifiers (the 11 raw methods +
`findCounterparty`) to the list asserted against `dist/index.d.ts` and `dist/index.d.cts`.

## Definition of Done

- [ ] The test fails if any of counterparty's 12 identifiers is missing from either built declaration
      file.
- [ ] `npm run build && npm test` passes with the extended list.
- [ ] lint clean.

## Notes

Depends on T7 (the module must actually be re-exported from `src/index.ts` before its identifiers can
appear in the built output).
