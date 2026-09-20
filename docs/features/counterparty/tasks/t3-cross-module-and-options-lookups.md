---
id: T3
title: "Implement cross-module address lookup and options lookup"
layer: "app"
deps: ["T1"]
acs: ["AC-01", "AC-02"]
files_hint: ["src/modules/counterparty/index.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T3 — Implement cross-module address lookup and options lookup

## Why

The two remaining lookups, split from T2 because each carries its own risk that deserves isolated
review: [contracts/public-api.md §3.4–§3.5](../contracts/public-api.md). `getCounterpartyAddresses` is
this library's first cross-module type import (`sad.md` §4 decision 8) — a wiring mistake here would
silently redefine `address`'s `SavedAddress` instead of reusing it. `getCounterpartyOptions` returns an
undocumented shape (`CounterpartyOptions = Record<string, unknown>`), the one lookup with no fixed
field list to assert against.

## What

In `src/modules/counterparty/index.ts`:
- `getCounterpartyAddresses(filters)` — `modelName: "Counterparty"`,
  `calledMethod: "getCounterpartyAddresses"`; resolves `SavedAddress[]` (imported from
  `src/types/address.ts` via T1, never redefined).
- `getCounterpartyOptions(filters)` — `modelName: "Counterparty"`,
  `calledMethod: "getCounterpartyOptions"`; resolves `CounterpartyOptions[]`.

## Definition of Done

- [ ] `getCounterpartyAddresses` and `getCounterpartyOptions` each have a mocked-`fetch` unit test
      asserting the request shape matches `contracts/public-api.md` §5.
- [ ] A test (or a type-level assertion) confirms `getCounterpartyAddresses`'s resolved type is
      exactly `address`'s own `SavedAddress[]` — not a locally redefined shape that happens to look
      the same.
- [ ] `tsc --noEmit` and lint pass.

## Notes

Shares `src/modules/counterparty/index.ts` with T2, T4, T5, T6 — serialized into the same lane by
`implement`.
