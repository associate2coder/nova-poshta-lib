---
id: T4
title: "Implement counterparty write methods"
layer: "app"
deps: ["T1"]
acs: ["AC-03", "AC-04", "AC-05", "AC-06", "AC-07"]
files_hint: ["src/modules/counterparty/index.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T4 — Implement counterparty write methods

## Why

`save`/`update`/`delete` on a developer's own counterparties, derived from
[contracts/public-api.md §3.8–§3.10](../contracts/public-api.md), [sad.md §6 Flow 2](../sad.md), and
[ADR-0001](../adr/0001-three-hand-written-per-variant-update-types.md). This is the module's core
write-safety guarantee: the discriminated `Save`/`Update` union (built in T1) must actually round-trip
through the runtime call without being widened or collapsed.

## What

In `src/modules/counterparty/index.ts`:
- `save(payload)` — `modelName: "Counterparty"`, `calledMethod: "save"`; resolves
  `Counterparty | undefined` (`undefined` when Nova Poshta reports success with empty `data`, per
  `address` ADR-0001 reused unchanged).
- `update(payload)` — `modelName: "Counterparty"`, `calledMethod: "update"`; same return shape.
- `delete(payload)` — `modelName: "Counterparty"`, `calledMethod: "delete"`; resolves
  `DeletedCounterparty | undefined`.

## Definition of Done

- [ ] `save` has a happy-path unit test for each of the three counterparty types (`PrivatePerson`,
      `Organization`, `ThirdParty`), asserting the returned record carries the `Ref` Nova Poshta
      assigned (AC-04).
- [ ] `update` has an equivalent happy-path test per type (AC-05) and `delete` has one happy-path test
      (AC-06).
- [ ] `save`/`update`/`delete` each have an empty-on-success test: a successful response with
      `data: []` resolves `undefined`, does not throw (AC-07).
- [ ] A compile-time fixture test proves an `UpdateCounterpartyPayload` missing a required field, or
      mixing fields from more than one counterparty type, fails to compile (AC-05).
- [ ] `tsc --noEmit` and lint pass.

## Notes

Shares `src/modules/counterparty/index.ts` with T2, T3, T5, T6 — serialized into the same lane by
`implement`. AC-05's scoping note applies: the compile-time guard only checks payload-internal
consistency, not that the payload matches whichever type was actually saved under an existing `Ref` —
don't attempt to test that at this layer, it's a runtime decline (AC-14/AC-15) covered in T8.
