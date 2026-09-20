---
id: T2
title: "Define the 15 reference-list request/response types in src/types/common.ts"
layer: "domain"
deps: ["T1"]
acs: []
files_hint: ["src/types/common.ts"]
owner: "<TBD lead>"
estimate: "M"
status: "todo"
---

# T2 — Define the 15 reference-list request/response types

## Why

Derives from [public-api.md §3](../contracts/public-api.md) and
[ADR-0002](../adr/0002-open-value-typing-with-fallback.md): every in-scope reference list
(`spec.md` §1) needs its record + filter interfaces, with every documented field optional
(ADR-0001) and value-bearing `Ref` fields using the `OpenEnum<Known>` pattern (ADR-0002).

## What

Populate the now-empty `src/types/common.ts` with the 15 record interfaces + the 2 filter
interfaces (`CargoDescriptionFilters`, `TimeIntervalFilters`) exactly as shaped in
[public-api.md §3](../contracts/public-api.md#3-types-and-methods), plus the shared
`OpenEnum<Known extends string> = Known | (string & {})` helper. `Known` stays `never` for now
(compiles as plain `string`) — populating it from live-captured values is explicitly deferred
(`spec.md` §8 open question, owner Tech Lead, due before `sdd:implement common`).

## Definition of Done

- [ ] `src/types/common.ts` exports all 15 record types + `OpenEnum` + the 2 filter interfaces,
      matching public-api.md §3 field-for-field.
- [ ] Every documented field on every record is optional; `TimeIntervalFilters.RecipientCityRef`
      is the sole required filter field.
- [ ] `tsc --noEmit` (or the project's static check) reports zero `any` in these new types.
- [ ] lint + vet clean.

## Notes

Pure type-only file — no runtime code, no test file of its own (covered indirectly by T5's
module-level tests exercising these types).
