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

Every prior module extends this same guard ([`test/unit/build-surface.test.ts`](../../../../test/unit/build-surface.test.ts))
so the published `.d.ts`/`.d.cts` output is verified, not just the in-repo source.

## What

Extend `test/unit/build-surface.test.ts` to assert `dist/index.d.ts` and `dist/index.d.cts` both
contain: `insertDocuments`, `getScanSheet`, `getScanSheetList`, `removeDocuments`,
`deleteScanSheet`, `addToTodaysScanSheet` — after running `npm run build`.

## Definition of Done

- [ ] Test fails if any of the 6 method names is missing from either declaration file.
- [ ] `npm test` green after `npm run build`.

## Notes

Mirrors `tracking-document`'s T6 and `internet-document`'s T8 exactly — same guard, one more
module's method names added.
