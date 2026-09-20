---
id: T2
title: "Implement plain lookup methods"
layer: "app"
deps: ["T1"]
acs: ["AC-01", "AC-02"]
files_hint: ["src/modules/address/index.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T2 — Implement plain lookup methods

## Why

`getCities`, `getSettlements`, `getAreas`, `getWarehouseTypes` are the simplest of the 8 lookups —
plain `client.request()` calls with pass-through filters, no irregular response shape. Derives from
[contracts/public-api.md §3.1, §3.2, §3.4, §3.8](../contracts/public-api.md) and
[sad.md §6 Flow 1](../sad.md).

## What

In `src/modules/address/index.ts`, following the `common`/`createCommonModule` factory pattern:
- `getCities(filters?: GetCitiesFilters): Promise<City[]>`
- `getSettlements(filters?: GetSettlementsFilters): Promise<Settlement[]>`
- `getAreas(): Promise<Area[]>`
- `getWarehouseTypes(): Promise<WarehouseType[]>`

Each calls `client.request<T>("Address", "<calledMethod>", filters)` and returns the array as-is —
no default injected for `Page`/`Limit` when the caller omits them (AC-01).

## Definition of Done

- [ ] Unit test (mocked `fetch`) for each of the 4 methods asserts the request body's
      `modelName`/`calledMethod`/`methodProperties` and that the typed array is returned unmodified.
- [ ] A test confirms no pagination parameter is injected when the caller supplies none (AC-01).
- [ ] lint + `tsc --noEmit` clean.

## Notes

Shares `src/modules/address/index.ts` with T3/T4/T5/T6 — `implement` serializes these into one
lane; expected per the epic's Risks note.
