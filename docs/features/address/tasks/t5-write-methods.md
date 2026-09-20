---
id: T5
title: "Implement write methods"
layer: "app"
deps: ["T1"]
acs: ["AC-04", "AC-05", "AC-06", "AC-07"]
files_hint: ["src/modules/address/index.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T5 — Implement write methods

## Why

`save`/`update`/`delete` are the module's first write operations and the first to need the
empty-on-success unwrap (AC-07, `sad.md` §6 Flow 2 / ADR-0001-this-feature). Derives from
[contracts/public-api.md §3.9–§3.11](../contracts/public-api.md) and
[spec.md AC-04..AC-07](../spec.md).

## What

In `src/modules/address/index.ts`:
- `save(payload: SaveAddressPayload): Promise<SavedAddress | undefined>`
- `update(payload: UpdateAddressPayload): Promise<SavedAddress | undefined>`
- `delete(payload: DeleteAddressPayload): Promise<DeletedAddress | undefined>`

Each calls `client.request<T>("Address", "<calledMethod>", payload)`, then returns `data[0]` if
present, `undefined` if `data` is empty (AC-07 — a valid success, not an error). Add a doc comment
on `update()` explaining the full-replace semantics (closes `spec.md` §8 OQ-4, `sad.md` §8
crosscutting-concepts row "API documentation").

## Definition of Done

- [ ] Unit test per method: happy path returns the single record with its own `Ref` (AC-04/AC-06).
- [ ] Unit test per method: empty `data` array resolves `undefined`, does not throw (AC-07).
- [ ] Unit test: passing an `UpdateAddressPayload` missing a field fails to compile (a `// @ts-expect-error`
      fixture test, or the project's existing type-level test convention) — AC-05.
- [ ] `update()` has a doc comment describing full-replace semantics.
- [ ] lint + `tsc --noEmit` clean.

## Notes

Shares `src/modules/address/index.ts` with T2/T3/T4/T6 — serialized by `implement` via
`files_hint` overlap.
