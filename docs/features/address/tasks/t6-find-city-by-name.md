---
id: T6
title: "Implement findCityByName convenience method"
layer: "app"
deps: ["T2"]
acs: ["AC-11"]
files_hint: ["src/modules/address/index.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T6 — Implement `findCityByName` convenience method

## Why

The v1 convenience-method set (`spec.md` §8 OQ-3, resolved during this `tasks` pass) is one method:
`findCityByName`, wrapping `getCities`'s `FindByString` filter. Derives from
[contracts/public-api.md §6](../contracts/public-api.md) and [spec.md AC-11](../spec.md).

## What

In `src/modules/address/index.ts`:

```ts
findCityByName(name: string): Promise<City[]>
```

Calls `getCities({ FindByString: name })` — exactly one call into `client.request()` (AC-11) — and
returns the result array exactly as `getCities` would for the equivalent input, per
`contracts/public-api.md` §6 ("returns the same typed shape the underlying raw method returns... no
new response type invented"). Revised during `sdd:review` (2026-09-20): the original `City |
undefined` shape silently discarded every match past the first, which is itself a post-call
reshaping AC-11 forbids — `FindByString` is a substring match and can legitimately return more than
one city.

## Definition of Done

- [ ] Unit test asserts `getCities`'s underlying call is made exactly once per `findCityByName`
      invocation, with `FindByString` set to the given name.
- [ ] Unit test asserts an empty result resolves an empty array, not an error or a thrown exception.
- [ ] lint + `tsc --noEmit` clean.

## Notes

Depends on T2 (needs `getCities` implemented) rather than just T1, since it calls the raw method
directly instead of `client.request()` itself. Shares `src/modules/address/index.ts` with
T2–T5 — serialized by `implement` via `files_hint` overlap.
