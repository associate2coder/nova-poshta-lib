---
id: T7
title: "Wire address module into the public package surface"
layer: "wiring"
deps: ["T2", "T3", "T4", "T5", "T6"]
acs: ["AC-12"]
files_hint: ["src/index.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T7 — Wire `address` module into the public package surface

## Why

`createAddressModule` and its types need to be re-exported from `src/index.ts` alongside
`createCommonModule`, exactly like `common` already is — this is what makes the module importable
by consuming developers and is the prerequisite for T8/T9's published-output checks. Derives from
[sad.md §5 Internal decomposition](../sad.md) (the `src/index.ts` "public re-exports" row).

## What

In `src/index.ts`:
- Re-export `createAddressModule` and the `AddressModule` interface.
- Re-export every type from `src/types/address.ts` that a consumer needs to name (filters,
  payloads, response records, `SearchWrapper`).

No new logic — pure re-export wiring, no caching or memoization introduced here (AC-12: every `Ref`
returned stays fresh from the response, never cached by the library).

## Definition of Done

- [ ] `import { createAddressModule } from "nova-poshta-lib"` resolves and type-checks from a
      throwaway consumer script or existing smoke test.
- [ ] No new stateful wrapper (cache, memo) added around the module (AC-12) — verified by
      inspection in review.
- [ ] lint + `tsc --noEmit` clean.

## Notes

Depends on all five method-implementation tasks (T2–T6) since the module's factory return type
must be complete before it's re-exported.
