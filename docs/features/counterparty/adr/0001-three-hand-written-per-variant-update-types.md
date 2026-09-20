---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-20"
feature_size: "S"
ticket: ""
---

# 0001 — Model the counterparty save/update payload as three hand-written per-variant discriminated types

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** User (project owner) + Architect (design session)

## Context

`counterparty` is the first module in the library whose write payload must stay a true discriminated
union — `PrivatePerson` / `Organization` / `ThirdParty` — from `save` through `update`. `address`'s
existing precedent (one flat `Save` interface, then `Required<Omit<Save, ...>>` to build `Update`)
does not transfer: collapsing three structurally different counterparty shapes into one flat type
would let a payload mix an `Organization`'s EDRPOU field with a `PrivatePerson`'s first/last name,
which is exactly the anti-pattern `spec.md` §1's decision override forbids and AC-05 requires the
compiler to reject. `spec.md` §8 OQ-4 explicitly flags this as a decision `design` must solve, scoped
entirely to this module's own type definitions (no change to the shared core client or any other
module). Because `save`/`update` stay two single methods each (`spec.md`'s fixed 11-method surface —
no `savePrivatePerson()`/`saveOrganization()` split), the question is not *how many methods* but *how
the `Update` type for each variant is generated from its `Save` counterpart*. This is public API
surface — changing the mechanism later is a breaking change for anyone importing the payload types
directly.

This whole mechanism rests on one unverified premise, carried in `spec.md` §1: that Nova Poshta's
lookup responses actually carry a real, runtime-checkable field identifying which counterparty type a
given record is. `spec.md` §8 OQ-2 schedules re-verifying this against the live API before
implementation; if it proves false, this decision needs rework, not just the method-name spelling
that OQ-2 also covers (`sad.md` §11).

## Decision drivers

- `spec.md` AC-03 — a counterparty's typed shape must discriminate to its real type, never a shared
  loose shape where every type-specific field is merely optional.
- `spec.md` AC-05 — `update` must reject a partial payload and a payload mixing fields from more than
  one counterparty type, at compile time.
- `spec.md` §1 decision override — the update guard must preserve each type's own required fields,
  not collapse to the fields every type shares.
- Consistency with `address`'s existing `Required<Omit<>>` idiom for full-replace update guards,
  wherever it can be reused without weakening the discriminant.

## Considered options

1. **Three hand-written per-variant types** — write `PrivatePersonSave` / `OrganizationSave` /
   `ThirdPartySave` as three separate interfaces (each tagged with a literal `CounterpartyType`
   discriminant), then write `PrivatePersonUpdate` / `OrganizationUpdate` / `ThirdPartyUpdate`
   explicitly, each via `Required<Omit<XSave, ...>> & { Ref: string }` — the same idiom `address`
   already uses, applied three times instead of once.
2. **One generic type computed across the union** — a single distributive conditional type (e.g.
   `type UpdateOf<T> = T extends any ? Required<Omit<T, "Ref">> & { Ref: string } : never`) applied
   once to the whole `Save` union; TypeScript's distributive-conditional-type feature generates all
   three `Update` variants automatically.

## Decision outcome

**Chosen:** Option 1, three hand-written per-variant types. It reads exactly like `address`'s existing
pattern — any TypeScript developer can trace one variant end to end without following generic
machinery — and a future fourth counterparty type is a fourth pair of interfaces, not a change to
shared logic. Option 2's distributive-conditional idiom is more advanced than anything currently in
the codebase (`common`/`address` use no distributive conditionals); a contributor would need to
understand how distribution works to know what the expanded type actually is, and a compiler error
inside the generic is harder to trace back to which variant broke. The more conservative, more
readable option won given this is the first time the library has needed a discriminated union at all.

## Consequences

**Positive**
- Directly extends the already-shipped `Required<Omit<>>` idiom — no new TypeScript feature
  introduced to the codebase.
- Each variant is independently readable; a contributor can understand `OrganizationUpdate` without
  understanding `PrivatePersonUpdate` or `ThirdPartyUpdate`.
- A future fourth counterparty type (should Nova Poshta ever add one) is additive — one more
  hand-written pair, no change to the other two.

**Negative**
- Three near-duplicate `Update` interfaces instead of one generated type. Adding a field to one
  `Save` variant requires a matching manual edit to its `Update` interface; a forgotten edit is a
  compile error at the call site (since the two would drift), not a silent runtime bug — but it is
  still a manual step, not automatic.

**Neutral**
- Switching to the distributive-conditional approach later is possible without changing the public
  `SaveCounterpartyPayload`/`UpdateCounterpartyPayload` union shape — it is an internal
  implementation detail of how the three variants are authored, not a breaking change for consumers.

## Links

- Spec: [[../spec.md]] AC-03, AC-05, §1 decision override, §8 OQ-4
- SAD: [[../sad.md]] §4, §5, §8
- Related ADR: extends the idiom from `address`'s [[../../address/adr/0001-return-undefined-on-empty-write-response.md]] (different problem — full-replace shape vs. discriminated-union modeling — but the same `Required<Omit<>>` building block)
