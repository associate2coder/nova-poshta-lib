---
id: T14
title: "Wire additional-service module into the public package surface"
layer: "wiring"
deps: ["T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12", "T13"]
acs: []
files_hint: ["src/index.ts"]
owner: "TBD lead"
estimate: "S"
status: "todo"
---

# T14 — Wire `additional-service` into the public package surface

## Why

`sad.md` §5's internal decomposition — `src/index.ts` re-exports every module + its types, per the
convention every prior module (`common`, `address`, `counterparty`, `internet-document`,
`tracking-document`, `scan-sheet`) already established.

## What

Add `export { createAdditionalServiceModule } from "./modules/additional-service/index.js";` and
`export type { AdditionalServiceModule } from "./modules/additional-service/index.js";` plus every
type `src/types/additional-service.ts` (T1) exports, to `src/index.ts`.

## Definition of Done

- [ ] `createAdditionalServiceModule` and its 19 exported types import and type-check from
      `nova-poshta-lib`'s public entry point.
- [ ] No cross-module runtime call to `internet-document`/`address`/`counterparty` is added.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Depends on every `app`-layer task (T4–T13) since `createAdditionalServiceModule` must assemble all 19
methods before it's export-ready.
