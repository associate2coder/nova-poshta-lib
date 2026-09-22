---
id: T6
title: "Extend published-build type-surface check"
layer: "tests"
deps: ["T4"]
acs: []
files_hint: ["test/unit/build-surface.test.ts"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T6 — Extend published-build type-surface check

## Why

`spec.md` §6 NFR "Method-surface completeness" — 100% of the 1 raw + 1 convenience method must have
a corresponding typed method, asserted exported/callable, matching `common`/`address`/
`counterparty`/`internet-document`'s existing `build-surface.test.ts` convention.

## What

Add `getStatusDocuments` and `getDocumentStatus` to `test/unit/build-surface.test.ts`'s method-name
list (alongside the existing `COMMON_METHOD_NAMES`/`ADDRESS_METHOD_NAMES`/…), asserting both are
present in `dist/index.d.ts` and `dist/index.d.cts` after `npm run build`.

## Definition of Done

- [ ] `test/unit/build-surface.test.ts` fails if either method is missing from either build output.
- [ ] Passes after `npm run build`.
- [ ] lint + vet clean.

## Notes

Purely additive to the existing file — no new test infrastructure.
