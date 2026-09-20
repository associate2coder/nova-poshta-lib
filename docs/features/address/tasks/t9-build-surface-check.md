---
id: T9
title: "Extend published-build type-surface check"
layer: "tests"
deps: ["T7"]
acs: ["AC-13"]
files_hint: ["test/unit/build-surface.test.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T9 — Extend published-build type-surface check

## Why

`test/unit/build-surface.test.ts` already asserts `common`'s 15 methods are discoverable in both
built declaration formats (`dist/index.d.ts` / `dist/index.d.cts`) — AC-13 requires the same for
`address`'s 12 identifiers (`createAddressModule` + 11 methods + `findCityByName` = 12). Derives
from [contracts/public-api.md §7](../contracts/public-api.md) and [spec.md AC-13](../spec.md).

## What

In `test/unit/build-surface.test.ts`, add an `ADDRESS_METHOD_NAMES` list (the 11 raw methods +
`findCityByName`) and a second `it.each` block (or extend the existing one) asserting
`createAddressModule` and every name in that list appear as its own word-boundary-matched
identifier in both `dist/index.d.ts` and `dist/index.d.cts`.

## Definition of Done

- [ ] Running `npm run build && npm test` fails if any address method is missing from either
      declaration file (verify by temporarily renaming one export locally, confirming the test
      catches it, then reverting).
- [ ] Passes once `npm run build` includes the wired-up `address` module (post-T7).
- [ ] lint clean.

## Notes

Same word-boundary-regex technique as the existing `common` block — reuse it rather than a plain
`.toContain`, since e.g. `getWarehouses` is not a substring risk here but `save`/`update`/`delete`
are common enough identifiers that a loose match could false-positive against unrelated text.
