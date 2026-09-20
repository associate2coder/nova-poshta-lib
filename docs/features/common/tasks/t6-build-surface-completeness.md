---
id: T6
title: "Verify all 15 methods are discoverable in both published ESM and CJS builds"
layer: "tests"
deps: ["T4"]
acs: ["AC-07"]
files_hint: ["test/unit/build-surface.test.ts"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T6 — Build-surface completeness check

## Why

`spec.md` AC-07 requires every in-scope reference list to appear as its own distinctly named,
typed method in **both published builds** — the type declaration files shipped in ESM and CJS
(per ADR-0002), not just source. `sad.md` §5 notes `tsup` already emits matching
`.d.ts`/`.d.cts` for whatever `src/index.ts` re-exports; this task verifies that holds.

## What

`test/unit/build-surface.test.ts`: after `npm run build` has produced `dist/`, read
`dist/index.d.ts` and `dist/index.d.cts` and assert both contain `createCommonModule` and every
one of the 15 method names from `public-api.md §1` (e.g. via a string/regex check on the
declaration file contents — no need to type-check the `.d.ts` itself).

## Definition of Done

- [ ] Test fails if `npm run build` hasn't been run (missing `dist/`) or if any of the 15 method
      names is absent from either declaration file.
- [ ] Test passes against the real build output once T4 lands.
- [ ] lint + vet clean.

## Notes

This is a build-artifact check, not a `fetch`-mocked behavior test — keep it in its own file so
`test/unit/modules/common.test.ts` stays purely behavioral.
