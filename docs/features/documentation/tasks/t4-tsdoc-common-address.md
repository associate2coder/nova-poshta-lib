---
id: T4
title: "TSDoc common + address modules"
layer: "docs"
deps: ["T2"]
acs: ["AC-04"]
files_hint: ["src/modules/common", "src/modules/address", "src/types/common.ts", "src/types/address.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T4 — TSDoc common + address modules

## Why

Contributes to [AC-04](../spec.md): zero missing comments across the whole public surface, for
the `common` and `address` domain modules (`CLAUDE.md` Layout).

## What

Add one TSDoc comment (type/function/parameter/return level only) to every non-`@internal`
exported function/type in `src/modules/common/`, `src/modules/address/`, `src/types/common.ts`,
and `src/types/address.ts`.

## Definition of Done

- [ ] Every non-internal export across both modules and their type files has a TSDoc comment.
- [ ] `npm run docs:build` renders each with a description, parameters, and return type.
- [ ] lint + typecheck clean.

## Notes

Depends on T2's internal audit (e.g. `AddressReferenceRecordBase`, `SearchWrapper` are already
`@internal` and need no full comment, only the tag T2 already added).
