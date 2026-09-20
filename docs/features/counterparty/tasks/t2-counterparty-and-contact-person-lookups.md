---
id: T2
title: "Implement counterparty and contact-person lookup methods"
layer: "app"
deps: ["T1"]
acs: ["AC-01", "AC-02"]
files_hint: ["src/modules/counterparty/index.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T2 — Implement counterparty and contact-person lookup methods

## Why

Three of the five documented lookups, derived from
[contracts/public-api.md §3.1–§3.3](../contracts/public-api.md) and [sad.md §6 Flow 1](../sad.md).
These three share the same shape (a single filter object, one `client.request()` call, a typed array
back) — the two lookups with a genuinely different response shape (cross-module type import,
undocumented shape) are split into T3.

## What

In `src/modules/counterparty/index.ts`, using the `createAddressModule`/`createCommonModule` factory
convention:
- `getCounterparties(filters?)` — `modelName: "Counterparty"`, `calledMethod: "getCounterparties"`;
  `Page` passed through unmodified when supplied, never defaulted or auto-incremented (`spec.md` §1
  decision override).
- `getCounterpartiesCatalog(filters)` — `modelName: "Counterparty"`,
  `calledMethod: "getCounterpartiesCatalog"` (exact wire spelling per `spec.md` §8 OQ-2, confirmed
  against a live response before this task is called done); an empty match resolves an empty array,
  not an error.
- `getCounterpartyContactPersons(filters)` — `modelName: "Counterparty"`,
  `calledMethod: "getCounterpartyContactPersons"`.

## Definition of Done

- [ ] `getCounterparties`/`getCounterpartiesCatalog`/`getCounterpartyContactPersons` each have a
      mocked-`fetch` unit test asserting the request shape (`modelName`/`calledMethod`/
      `methodProperties`) matches `contracts/public-api.md` §5.
- [ ] A test asserts `Page` reaches `methodProperties` verbatim when supplied, and is absent from the
      request when the caller omits it (AC-01).
- [ ] A test asserts a filter/search parameter reaches Nova Poshta unmodified with no client-side
      re-filtering of the response (AC-02).
- [ ] `getCounterpartiesCatalog`'s empty-match case resolves an empty array, not an error.
- [ ] `tsc --noEmit` and lint pass.

## Notes

Shares `src/modules/counterparty/index.ts` with T3–T6 — `implement` serializes these into one lane via
the overlapping `files_hint`, same as `address`'s T2–T5.
