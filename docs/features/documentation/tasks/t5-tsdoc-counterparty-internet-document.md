---
id: T5
title: "TSDoc counterparty + internet-document modules"
layer: "docs"
deps: ["T2"]
acs: ["AC-04"]
files_hint: ["src/modules/counterparty", "src/modules/internet-document", "src/types/counterparty.ts", "src/types/internet-document.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T5 — TSDoc counterparty + internet-document modules

## Why

Contributes to [AC-04](../spec.md): zero missing comments across the whole public surface, for
the `counterparty` and `internet-document` domain modules (`CLAUDE.md` Layout).

## What

Add one TSDoc comment (type/function/parameter/return level only) to every non-`@internal`
exported function/type in `src/modules/counterparty/`, `src/modules/internet-document/`,
`src/types/counterparty.ts`, and `src/types/internet-document.ts`.

## Definition of Done

- [ ] Every non-internal export across both modules and their type files has a TSDoc comment.
- [ ] `npm run docs:build` renders each with a description, parameters, and return type.
- [ ] lint + typecheck clean.

## Notes

Depends on T2's internal audit (e.g. `CounterpartyRecordBase` is already `@internal`).
