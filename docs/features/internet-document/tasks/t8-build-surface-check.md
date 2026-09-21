---
id: T8
title: "Extend published-build type-surface check"
layer: "tests"
deps: ["T6"]
acs: ["AC-19"]
files_hint: ["test/unit/build-surface.test.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T8 — Extend published-build type-surface check

## Why

Derives from `spec.md` AC-19 and `sad.md` §5/§10 — every in-scope method must be discoverable via
autocomplete against the library's **published** ESM and CJS output, not just the source. `common`/
`address`/`counterparty` already extend this same check; this task adds `internet-document`'s 8
identifiers to it.

## What

In `test/unit/build-surface.test.ts` (existing file, extended, not replaced):
- After `npm run build`, import `dist/index.d.ts` (ESM) and `dist/index.d.cts` (CJS) and assert all 8
  `internet-document` method identifiers (`save`, `update`, `delete`, `getDocumentList`,
  `getDocumentPrice`, `getDocumentDeliveryDate`, `printDocument`, `printMarkings`) are present and
  typed in both.

## Definition of Done

- [ ] The test fails if any of the 8 identifiers is missing from either built declaration file.
- [ ] The test passes after `npm run build`.
- [ ] Runs in CI as part of the existing post-build step (no new CI job).

## Notes

Shares the file with `common`/`address`/`counterparty`'s existing assertions — extend, do not
duplicate the harness.
