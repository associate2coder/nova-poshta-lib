---
id: T11
title: "Implement checkWaybillEditPossible, createWaybillEdit, getChangeEWOrdersList"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-15", "AC-16", "AC-17"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "M"
status: "todo"
---

# T11 — Implement the waybill-edit group

## Why

[contracts/public-api.md §3.3](../contracts/public-api.md), [sad.md §6 Flow 10](../sad.md) (flags are
informational only, AC-16).

## What

`checkWaybillEditPossible(payload)` → `client.requestFirst<WaybillEditPossibility>(...)`.
`createWaybillEdit(payload)` sets `OrderType: "orderChangeEW"` internally, calls
`client.requestFirst<SavedWaybillEditOrder>(...)`. `getChangeEWOrdersList(filters?)` → `client.request
<ChangeEWOrderListItem>(...)`.

## Definition of Done

- [ ] `checkWaybillEditPossible` has a happy-path unit test asserting all 11 `Can...` flags are
      returned untouched.
- [ ] `createWaybillEdit` has a happy-path test (returns `{ Number, Ref }`) and a test asserting a
      change to a flagged-not-changeable field is still sent as-is, with no client-side gating (AC-16).
- [ ] `getChangeEWOrdersList` has a happy-path test including before/after field values (AC-17).
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

`createWaybillEdit`'s payload only carries the 3 flag-gated fields Nova Poshta's create call actually
accepts (spec.md §3 non-goal) — the other 8 flags have no corresponding field regardless of scope.
Shares `src/modules/additional-service/index.ts` — see T4's Notes.
