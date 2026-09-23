---
id: T6
title: "TSDoc tracking-document + scan-sheet + additional-service modules"
layer: "docs"
deps: ["T2"]
acs: ["AC-04"]
files_hint: ["src/modules/tracking-document", "src/modules/scan-sheet", "src/modules/additional-service", "src/types/tracking-document.ts", "src/types/scan-sheet.ts", "src/types/additional-service.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T6 — TSDoc tracking-document + scan-sheet + additional-service modules

## Why

Contributes to [AC-04](../spec.md): zero missing comments across the whole public surface, for
the remaining three domain modules (`CLAUDE.md` Layout).

## What

Add one TSDoc comment (type/function/parameter/return level only) to every non-`@internal`
exported function/type in `src/modules/tracking-document/`, `src/modules/scan-sheet/`,
`src/modules/additional-service/`, and their matching `src/types/*.ts` files.

## Definition of Done

- [ ] Every non-internal export across all three modules and their type files has a TSDoc comment.
- [ ] `npm run docs:build` renders each with a description, parameters, and return type.
- [ ] lint + typecheck clean.

## Notes

`TRACKING_STATUS_CODES` turned out public during T2's audit (its own source comment says it
exists for consuming developers) — it still needs a full comment here, not a tag-and-skip.
