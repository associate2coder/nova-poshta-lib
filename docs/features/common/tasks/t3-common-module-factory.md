---
id: T3
title: "Implement createCommonModule with all 15 typed reference-list methods"
layer: "ports"
deps: ["T2"]
acs: ["AC-01", "AC-02", "AC-06"]
files_hint: ["src/modules/common/index.ts"]
owner: "<TBD lead>"
estimate: "M"
status: "todo"
---

# T3 — Implement createCommonModule

## Why

Derives from [public-api.md §1](../contracts/public-api.md#1-module-shape) and
[sad.md §5](../sad.md): the `common` module factory mirrors every other
`src/modules/<domain>/` folder (project ADR-0002) — takes the shared `NovaPoshtaClient`, returns
15 typed methods, no state of its own.

## What

`src/modules/common/index.ts`: `createCommonModule(client: NovaPoshtaClient): CommonModule`
implementing all 15 methods from `public-api.md §1`, each calling
`client.request<T>("Common", "<CalledMethod>", methodProperties)` and returning the result
verbatim — `getCargoDescriptionList` and `getTimeIntervals` pass their filter object straight
through as `methodProperties` with no client-side re-filtering (`spec.md` AC-02).

## Definition of Done

- [ ] `createCommonModule` returns an object with all 15 methods named exactly per
      `public-api.md §1`.
- [ ] Each method calls `client.request()` with the correct `calledMethod` string and passes any
      filter argument through unmodified.
- [ ] `getTimeIntervals` requires its `RecipientCityRef` filter argument (matches
      `TimeIntervalFilters`).
- [ ] lint + vet clean.

## Notes

No test file here — T5 covers this module's behavior end-to-end (mocked `fetch`).
