---
id: T2
title: "Implement save and update methods"
layer: "app"
deps: ["T1"]
acs: ["AC-01", "AC-02", "AC-05", "AC-06"]
files_hint: ["src/modules/internet-document/index.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T2 — Implement save and update methods

## Why

Derives from [contracts/public-api.md §3.1–3.2](../contracts/public-api.md), [sad.md §6 Flow
1](../sad.md), and [ADR-0001](../adr/0001-compose-service-type-and-cargo-type-as-two-intersected-type-sets.md)
(superseded by [ADR-0004](../adr/0004-cargotype-is-a-plain-discriminant-field-not-a-structural-variant-axis.md)).
The write path every later `scan-sheet`/`additional-service` waybill Ref traces back to (`spec.md`
US-11).

## What

In `src/modules/internet-document/index.ts`:
- `save(payload)` — delegates to `client.request("InternetDocument", "save", payload)`, resolves the
  typed `SavedInternetDocument` on a non-empty array, `undefined` on an empty array (AC-05, reusing
  `address` ADR-0001 unchanged — no new empty-check logic).
- `update(payload)` — identical delegation shape with `calledMethod: "update"`; an omitted
  `BackwardDeliveryData` in the payload clears it server-side (AC-06) — this task adds no
  client-side merge/preserve logic of its own.
- Both call `client.request()` directly, exactly like `common`/`address`/`counterparty` — no new
  validation, no retry, no caching (`sad.md` §4 decision 2/3).

## Definition of Done

- [ ] `save` has a mocked-`fetch` unit test asserting the happy path (resolves the saved waybill incl.
      `Ref`/`IntDocNumber`) and an empty-on-success test (resolves `undefined`, does not throw).
- [ ] `update` has the same two tests.
- [ ] A compile-time test (e.g. a `// @ts-expect-error` fixture) proves a payload mixing `ServiceType`
      location fields from a different leg fails to compile (AC-02; ADR-0004: `CargoType` is not part
      of this guard).
- [ ] lint + `tsc --noEmit` clean.

## Notes

Shares `src/modules/internet-document/index.ts` with T3/T4/T5 — `implement` serializes this lane via
the overlapping `files_hint`. No AC-14/15/16 error-path test here; the shared `NovaPoshtaApiError`
behavior is exercised once, across all 8 methods, in T7.
