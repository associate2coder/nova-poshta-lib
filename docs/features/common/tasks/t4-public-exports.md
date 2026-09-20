---
id: T4
title: "Re-export createCommonModule and its types from src/index.ts"
layer: "wiring"
deps: ["T3"]
acs: []
files_hint: ["src/index.ts"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T4 — Wire common's public exports

## Why

[public-api.md §1](../contracts/public-api.md#1-module-shape): `createCommonModule` must be
re-exported from `src/index.ts` alongside `createClient` so both published builds (ESM `.d.ts` +
CJS `.d.cts` via `tsup`) expose it — the prerequisite for T6's build-surface check (AC-07).

## What

Add to `src/index.ts`: `export { createCommonModule } from "./modules/common/index.js";` and
`export type { CommonModule, ... }` for `CommonModule` plus the 15 record types + 2 filter types
from `src/types/common.ts`.

## Definition of Done

- [ ] `src/index.ts` exports `createCommonModule`, `CommonModule`, and every type from
      `src/types/common.ts`.
- [ ] `npm run build` succeeds (dual ESM+CJS, per ADR-0002).
- [ ] lint + vet clean.
