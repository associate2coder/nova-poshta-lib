---
id: T4
title: "Implement search-wrapper lookups"
layer: "app"
deps: ["T1"]
acs: ["AC-01", "AC-02", "AC-03"]
files_hint: ["src/modules/address/index.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T4 — Implement search-wrapper lookups

## Why

`searchSettlements` and `searchSettlementStreets` are the two methods whose Nova Poshta response is
structurally different (AC-03): a `TotalCount`/`Addresses` wrapper record, not a plain list. Derives
from [contracts/public-api.md §3.3, §3.6](../contracts/public-api.md) and
[sad.md §4 decision 6](../sad.md).

## What

In `src/modules/address/index.ts`:
- `searchSettlements(params: SearchSettlementsParams): Promise<SearchWrapper<SettlementAddress> | undefined>`
- `searchSettlementStreets(params: SearchSettlementStreetsParams): Promise<SearchWrapper<StreetAddress> | undefined>`

Both call `client.request<SearchWrapper<T>>(...)`, which returns the one-item envelope array
(`data: [wrapper]`); unwrap that single item the same way a write's result unwraps (mirrors T5's
pattern) — `undefined` when the array is empty. The wrapper's own `Addresses` array is returned
exactly as received — never flattened to just the inner array.

## Definition of Done

- [ ] Unit test asserts the returned value is the wrapper object itself (`{ TotalCount, Addresses }`),
      not `Addresses` alone.
- [ ] Unit test asserts `undefined` is returned when the mocked envelope's `data` array is empty.
- [ ] lint + `tsc --noEmit` clean.

## Notes

Shares `src/modules/address/index.ts` with T2/T3/T5/T6 — serialized by `implement` via
`files_hint` overlap. The unwrap-single-envelope-item logic is identical to T5's write unwrap —
consider extracting a small shared helper within this file if it reduces duplication, but don't
over-engineer for two call sites.
