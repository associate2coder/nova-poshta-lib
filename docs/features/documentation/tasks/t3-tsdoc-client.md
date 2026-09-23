---
id: T3
title: "TSDoc the core client (src/client.ts)"
layer: "docs"
deps: ["T2"]
acs: ["AC-04"]
files_hint: ["src/client.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T3 — TSDoc the core client

## Why

Contributes to [AC-04](../spec.md): the whole current public surface must have zero missing
comments. `src/client.ts` is the core-client container named in `CLAUDE.md`'s Layout.

## What

Add one TSDoc comment (type/function/parameter/return level, never per-field per
[sad §1 ¶4 override](../sad.md)) to every non-`@internal` exported function/class/interface/type
in `src/client.ts` — `createClient`, `NovaPoshtaApiError`, `NovaPoshtaClient`,
`NovaPoshtaSuccessEnvelope`.

## Definition of Done

- [ ] Every non-internal export in `src/client.ts` has a TSDoc comment.
- [ ] `npm run docs:build` renders each with a description, parameters, and return type.
- [ ] lint + typecheck clean.

## Notes

Depends on T2's internal audit to know which `src/client.ts` exports (if any) were marked
internal and can be skipped.
