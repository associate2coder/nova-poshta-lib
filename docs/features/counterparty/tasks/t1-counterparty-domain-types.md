---
id: T1
title: "Define counterparty domain types"
layer: "domain"
deps: []
acs: ["AC-03", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09", "AC-10"]
files_hint: ["src/types/counterparty.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T1 — Define counterparty domain types

## Why

The full request/response type surface for all 11 methods, derived from
[contracts/public-api.md §2–§3](../contracts/public-api.md), [sad.md §4 decisions 6–8](../sad.md),
and [ADR-0001](../adr/0001-three-hand-written-per-variant-update-types.md). This is the first module
in the library whose write payload must stay a true discriminated union — landing it before any
method implementation means T2–T6 only wire calls into an already-typed shape, no type design happens
inside an app task.

## What

In `src/types/counterparty.ts`:
- `CounterpartyProperty` (the filter/read-side axis, kept as an `OpenEnum` reused from `common.ts`)
  and `CounterpartyRecordBase`.
- The three discriminated counterparty record types (`PrivatePersonCounterparty`/
  `OrganizationCounterparty`/`ThirdPartyCounterparty`) unioned into `Counterparty`, each tagged by a
  literal `CounterpartyType` (AC-03).
- The 5 lookup filter types (`GetCounterpartiesFilters`, `GetCounterpartiesCatalogFilters`,
  `GetCounterpartyContactPersonsFilters`, `GetCounterpartyAddressesFilters`,
  `GetCounterpartyOptionsFilters`) and `CounterpartyOptions` (an open `Record<string, unknown>` —
  undocumented shape, per `contracts/public-api.md` §3.5).
- The three hand-written `Save*Payload` interfaces (`SavePrivatePersonPayload`/
  `SaveOrganizationPayload`/`SaveThirdPartyPayload`) unioned into `SaveCounterpartyPayload`, and the
  matching three `Update*Payload` interfaces (each `Required<SaveXPayload> & { Ref: string }`) unioned
  into `UpdateCounterpartyPayload` — per ADR-0001, never collapsed to the three types' shared fields.
- `DeleteCounterpartyPayload`/`DeletedCounterparty`.
- `ContactPerson` (single flat shape, no discriminant — `sad.md` §4 decision 7),
  `SaveContactPersonPayload`, `UpdateContactPersonPayload` (`Required<Omit<SaveContactPersonPayload,
  "CounterpartyRef">> & { Ref: string }`), `DeleteContactPersonPayload`/`DeletedContactPerson`.
- Import `SavedAddress` from `./address.js` for `getCounterpartyAddresses`'s response type — never
  redefine it (`sad.md` §4 decision 8, this library's first cross-module type import).

No runtime code in this task — types only.

## Definition of Done

- [ ] `src/types/counterparty.ts` compiles with zero `any`.
- [ ] `SaveCounterpartyPayload`/`UpdateCounterpartyPayload` are three hand-written per-variant
      interfaces unioned (not a single flat shape, not a distributive conditional type) — verified by
      inspection in review, per ADR-0001.
- [ ] `UpdateContactPersonPayload` is derived from `SaveContactPersonPayload` via a utility-type
      expression, not a hand-written duplicate.
- [ ] `getCounterpartyAddresses`'s response type imports `address`'s `SavedAddress`, not a local
      redefinition.
- [ ] `tsc --noEmit` passes.
- [ ] lint clean.

## Notes

This is the one task every app task (T2–T6) depends on — keep it strictly type-only so it can land
first without waiting on any method's implementation. A discriminated-union mistake here (e.g.
collapsing the three `Save`/`Update` variants to shared fields) silently reopens AC-03/AC-05, so give
the three-variant shape extra review attention.
