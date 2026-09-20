---
id: T6
title: "Implement findCounterparty convenience method"
layer: "app"
deps: ["T2"]
acs: ["AC-11"]
files_hint: ["src/modules/counterparty/index.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T6 — Implement findCounterparty convenience method

## Why

`spec.md` §8 OQ-3 left the v1 convenience-method set open, owned by this skill run. Resolved here as
one method — `findCounterparty(searchString, property?)` — mirroring `address`'s own precedent
(`findCityByName`): a single friendlier wrapper over the highest-friction raw lookup rather than a
method per raw call. `getCounterparties` is that highest-friction lookup: a developer resolving "the
counterparty matching this name/phone string" today must know to pass `FindByString` (and, if they
want to narrow by role, `CounterpartyProperty`) on the raw method — `findCounterparty` collapses that
into one call with a plain string. `getCounterpartiesCatalog` was considered and rejected as the wrap
target: its two-parameter shape (phone + partial last name) is already about as simple as a
convenience method could make it, so wrapping it saves little.

`contracts/public-api.md` §7 fixes the shape requirement this method must satisfy.

## What

In `src/modules/counterparty/index.ts`:
- `findCounterparty(searchString: string, property?: CounterpartyProperty): Promise<Counterparty[]>`
  — calls `getCounterparties({ FindByString: searchString, CounterpartyProperty: property })`, exactly
  one call into `client.request()`, no post-call filtering/sorting/reshaping.

## Definition of Done

- [ ] A unit test asserts `findCounterparty` makes exactly one call (spied on the mocked `fetch`) with
      `FindByString` set to the given search string.
- [ ] A unit test asserts the optional `property` argument reaches `CounterpartyProperty` in the
      underlying request when supplied, and is absent when omitted.
- [ ] A unit test asserts the returned array matches exactly what the equivalent raw
      `getCounterparties` call would return — no re-filtering, sorting, or reshaping.
- [ ] `tsc --noEmit` and lint pass.

## Notes

Shares `src/modules/counterparty/index.ts` with T2–T5 — serialized into the same lane by `implement`.
Never combine a counterparty write with a contact-person write into one convenience call (`spec.md` §3
chaining non-goal) — not applicable to this specific method, but binding on any future convenience
addition too.
