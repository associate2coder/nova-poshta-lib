---
id: T5
title: "Implement contact-person write methods"
layer: "app"
deps: ["T1"]
acs: ["AC-07", "AC-08", "AC-09", "AC-10"]
files_hint: ["src/modules/counterparty/index.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T5 — Implement contact-person write methods

## Why

`saveContactPerson`/`updateContactPerson`/`deleteContactPerson`, derived from
[contracts/public-api.md §3.11](../contracts/public-api.md) and [sad.md §6 Flow 2](../sad.md). Named
with the `ContactPerson` suffix per `contracts/public-api.md` §1's naming decision — Nova Poshta's own
wire `calledMethod` values (`save`/`update`/`delete`) collide with the counterparty family on one flat
`modelName: "ContactPerson"` object.

## What

In `src/modules/counterparty/index.ts`:
- `saveContactPerson(payload)` — `modelName: "ContactPerson"`, `calledMethod: "save"`; resolves
  `ContactPerson | undefined`.
- `updateContactPerson(payload)` — `modelName: "ContactPerson"`, `calledMethod: "update"`; same return
  shape. Every field `ContactPerson` documents (required and optional alike, incl. `MiddleName`) is
  mandatory on the payload — no partial update (AC-09).
- `deleteContactPerson(payload)` — `modelName: "ContactPerson"`, `calledMethod: "delete"`; resolves
  `DeletedContactPerson | undefined`.

## Definition of Done

- [ ] `saveContactPerson` has a happy-path unit test asserting the returned record carries the
      assigned `Ref` (AC-08).
- [ ] `updateContactPerson` and `deleteContactPerson` each have an equivalent happy-path test (AC-10).
- [ ] All three have an empty-on-success test: a successful response with `data: []` resolves
      `undefined`, does not throw (AC-07).
- [ ] A compile-time fixture test proves an `UpdateContactPersonPayload` missing any field (required
      or optional, incl. `MiddleName`) fails to compile (AC-09).
- [ ] `tsc --noEmit` and lint pass.

## Notes

Shares `src/modules/counterparty/index.ts` with T2, T3, T4, T6 — serialized into the same lane by
`implement`.
