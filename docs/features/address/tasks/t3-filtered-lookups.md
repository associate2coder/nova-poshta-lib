---
id: T3
title: "Implement filtered directory lookups"
layer: "app"
deps: ["T1"]
acs: ["AC-01", "AC-02"]
files_hint: ["src/modules/address/index.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T3 — Implement filtered directory lookups

## Why

`getStreet` (city-scoped) and `getWarehouses` (city/type/number-filterable) are the two remaining
plain-array lookups whose documented parameters carry a required scoping field, distinguishing them
from T2's zero/optional-filter methods. Derives from
[contracts/public-api.md §3.5, §3.7](../contracts/public-api.md) and [spec.md AC-02](../spec.md).

## What

In `src/modules/address/index.ts`:
- `getStreet(params: GetStreetParams): Promise<Street[]>` — `CityRef` required.
- `getWarehouses(filters?: GetWarehousesFilters): Promise<Warehouse[]>`

Both pass every documented filter field through unmodified — no client-side re-filtering (AC-02).

## Definition of Done

- [ ] Unit test (mocked `fetch`) for each method asserts the filter object reaches
      `methodProperties` verbatim.
- [ ] A test confirms the library performs no re-filtering of the mocked response (AC-02).
- [ ] lint + `tsc --noEmit` clean.

## Notes

Shares `src/modules/address/index.ts` with T2/T4/T5/T6 — serialized by `implement` via
`files_hint` overlap.
