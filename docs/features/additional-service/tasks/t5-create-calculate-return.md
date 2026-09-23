---
id: T5
title: "Implement createReturn and calculateReturn with the discriminant payload builder"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-02", "AC-03", "AC-04", "AC-05"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "L"
status: "todo"
---

# T5 — Implement `createReturn` and `calculateReturn`

## Why

[contracts/public-api.md §3.1](../contracts/public-api.md), [sad.md §4 decision 4 and §6 Flow 3/Flow
4](../sad.md), AC-04.

## What

A shared internal payload builder takes `CreateReturnPayload` (the 3-variant `Destination`-discriminated
union), strips `Destination`, and sets `OrderType: "orderCargoReturn"` before the `save` call.
`createReturn` calls `client.requestFirst<SavedReturnOrder>(...)`. `calculateReturn` reuses the same
builder plus `OnlyGetPricing: "1"`, also via `requestFirst()`.

## Definition of Done

- [ ] `createReturn` has a happy-path unit test per variant (sender-address, new-address, new-warehouse
      — returns `{ Number, Ref }`) and an authorization-decline test (AC-02).
- [ ] `calculateReturn` has a unit test asserting the outgoing request carries `OnlyGetPricing: "1"` and
      no order is created (AC-05).
- [ ] A compile-time test (`tsd` or equivalent) proves mixing two variants' fields under one
      `Destination` tag fails to compile, including when the payload is assembled field-by-field in a
      variable, not only as a fresh object literal (AC-04).
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

`OrderType`/`OnlyGetPricing` are never public parameters — spec.md §6 NFR "Discriminant safety" (0
public signatures accept either). Shares `src/modules/additional-service/index.ts` — see T4's Notes.
