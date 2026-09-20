---
id: T1
title: "Define address domain types"
layer: "domain"
deps: []
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07"]
files_hint: ["src/types/address.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T1 — Define address domain types

## Why

The full request/response type surface for all 11 methods, derived from
[contracts/public-api.md §2–§3](../contracts/public-api.md), [sad.md §4 decisions 5–7](../sad.md),
and [spec.md AC-03/AC-05](../spec.md). Landing every type before any method implementation means
T2–T6 only wire calls into an already-typed shape — no type design happens inside an app task.

## What

In `src/types/address.ts`:
- `AddressReferenceRecordBase` (shared `Ref`/`Description` base, matching `common`'s
  `ReferenceRecordBase` precedent).
- `SearchWrapper<T>` (`TotalCount`/`Addresses`) — the AC-03 wrapper, never unwrapped further.
- The 8 lookup filter + record types (`GetCitiesFilters`/`City`, `GetSettlementsFilters`/
  `Settlement`, `SearchSettlementsParams`/`SettlementAddress`, `Area`, `GetStreetParams`/`Street`,
  `SearchSettlementStreetsParams`/`StreetAddress`, `GetWarehousesFilters`/`Warehouse`,
  `WarehouseType`).
- The write types: `SaveAddressPayload`, `SavedAddress`, `DeleteAddressPayload`, `DeletedAddress`,
  and `UpdateAddressPayload` — derived from `SaveAddressPayload` via a TypeScript utility type
  (`Required<Omit<...>>` per `contracts/public-api.md` §3.10), not hand-duplicated (`sad.md` §4
  decision 7).

No runtime code in this task — types only.

## Definition of Done

- [ ] `src/types/address.ts` compiles with zero `any`.
- [ ] `UpdateAddressPayload` is derived from `SaveAddressPayload` (a utility-type expression), not a
      hand-written duplicate interface — verified by inspection in review.
- [ ] `tsc --noEmit` (or the project's existing type-check script) passes.
- [ ] lint clean.

## Notes

This is the one task every app task (T2–T6) depends on — keep it strictly type-only so it can land
first without waiting on any method's implementation.
