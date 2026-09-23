---
id: T7
title: "Implement getReturnOrdersList, getReturnReasons, getReturnReasonsSubtypes"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-08"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "S"
status: "todo"
---

# T7 — Implement return list/reason reads

## Why

[contracts/public-api.md §3.1](../contracts/public-api.md), [sad.md §6 Flow 6](../sad.md) (the generic
list-read shape, 3 of its 5 covered methods).

## What

`getReturnOrdersList(filters?)`, `getReturnReasons()`, `getReturnReasonsSubtypes(filters?)` — each
delegates straight to `client.request<T>(...)`.

## Definition of Done

- [ ] Each of the three methods has a unit test for the unfiltered happy path.
- [ ] `getReturnOrdersList` and `getReturnReasonsSubtypes` each have a second test asserting a
      documented filter (`Number`/`Ref`/`BeginDate`/`EndDate`/`Page`/`Limit`, `ReasonRef`) is passed
      through unmodified — no client-side re-filtering, sorting, or pagination (AC-08).
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Shares `src/modules/additional-service/index.ts` — see T4's Notes.
