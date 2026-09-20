---
id: T7
title: "Wire counterparty module into the public package surface"
layer: "wiring"
deps: ["T2", "T3", "T4", "T5", "T6"]
acs: ["AC-17"]
files_hint: ["src/index.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T7 — Wire counterparty module into the public package surface

## Why

`src/index.ts` re-exports `createCounterpartyModule` and its types alongside `createCommonModule`/
`createAddressModule` (`sad.md` §5), so the module is importable from the package's public entry
point — the mechanism AC-17/US-10 depends on for editor autocomplete discoverability. This is also
one place a caching shortcut could slip in — AC-12 (tested separately in
`test/unit/modules/counterparty.test.ts`, not this task) requires every `Ref` returned to be read
fresh from Nova Poshta, never memoized here.

## What

- Add `createCounterpartyModule` and the `CounterpartyModule` type (plus its request/response types)
  to `src/index.ts`'s re-exports.
- No wrapping logic added at this layer — a direct re-export, matching `common`/`address`.

## Definition of Done

- [ ] `createCounterpartyModule` and its types import and type-check from the package's public entry
      point (`import { createCounterpartyModule } from "nova-poshta-lib"` resolves and compiles).
- [ ] No caching, memoization, or extra wrapping added around the module's methods (AC-12).
- [ ] `tsc --noEmit` and lint pass.

## Notes

Depends on all five app tasks (T2–T6) since it re-exports the fully assembled `CounterpartyModule`
interface.
