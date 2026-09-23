---
id: T16
title: "Extend published-build type-surface check"
layer: "tests"
deps: ["T14"]
acs: []
files_hint: ["test/unit/build-surface.test.ts"]
owner: "TBD lead"
estimate: "S"
status: "todo"
---

# T16 — Extend published-build type-surface check

## Why

[spec.md §6 NFR "Method-surface completeness"](../spec.md) / §7 KPI — matches the same check every
sibling module's `contracts/public-api.md` §7 already requires (e.g. `internet-document`'s AC-19).

## What

Extend `test/unit/build-surface.test.ts` to assert all 19 `additional-service` method identifiers are
present in the built `dist/index.d.ts` and `dist/index.d.cts`.

## Definition of Done

- [ ] The test fails if any of the 19 method identifiers is missing from either declaration file.
- [ ] The test passes after `npm run build`.

## Notes

Runs after `npm run build`, same as every sibling module's equivalent check.
