---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-21"
feature_size: "M"
ticket: ""
---

# 0001 — Compose ServiceType and CargoType as two intersected type-sets

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** User (project owner) + Architect (design session)

## Context

`internet-document`'s `save`/`update` payload must stay a discriminated union across **two**
independent axes: `ServiceType` (4 delivery-method combinations — warehouse-to-warehouse,
warehouse-to-door, door-to-warehouse, door-to-door) and `CargoType` (4–5 cargo classifications —
parcel, cargo, documents, pallet, and similar). Together these produce up to 16 valid field
combinations (`spec.md` §1, §8 OQ-3). `counterparty`'s existing precedent (ADR-0001: three
hand-written per-variant types, one axis, 3 variants) does not transfer directly — collapsing two
independent axes into one flat union either means 16 hand-written interfaces or a different
composition mechanism entirely. `spec.md` §8 OQ-3 explicitly flags this as a decision `design` must
solve, scoped to this module's own type definitions only (no change to the shared core client or any
other module).

This mechanism rests on `spec.md` §1's traceability note: `internet-document` defines its own fixed,
compile-time literal types for `ServiceType`/`CargoType`, distinct from `common`'s runtime
`getServiceTypes`/`getCargoTypes` lookup (which returns `{Ref?, Description?}` records, not literal
unions) — confirmed by reading `src/types/common.ts` directly. If Nova Poshta adds a new delivery
method or cargo type, these literal types must be updated by hand; they do not automatically track
`common`'s live list.

## Decision drivers

- `spec.md` AC-02 — the type system must require exactly the fields a chosen delivery-method/
  cargo-type combination needs, and reject a payload mixing fields from a different combination, at
  compile time.
- `spec.md` §6 NFR (Save/update discriminant guard) — 100% of `save`/`update` calls must fail to
  compile under a payload-internal-consistency violation.
- Maintainability: a naive full enumeration (16 hand-written interfaces) does not scale gracefully if
  Nova Poshta adds a 5th delivery method or cargo type later (`spec.md` §1 traceability note already
  anticipates manual updates being necessary — the mechanism should minimize how much manual work that
  is).
- Consistency with `counterparty` ADR-0001's established preference for hand-written, explicit
  variant types over a single generic distributive-conditional formula, wherever it can be reused
  without exploding the number of hand-written pieces.

## Considered options

1. **Two intersected type-sets.** Write 4 `ServiceType` variants (each requiring only the location
   fields its delivery leg needs) and ~4–5 `CargoType` variants (each requiring only its own
   cargo-detail fields) as two separate hand-written unions, then combine them via a TypeScript
   intersection (`ServiceTypeVariant & CargoTypeVariant`) so the compiler distributes the two unions
   into every valid combination automatically — ~9 hand-written pieces total, not 16.
2. **16 fully hand-written interfaces.** Write every delivery-method × cargo-type combination as its
   own separate, fully-spelled-out interface — maximum explicitness, no composition mechanism to
   reason about.
3. **One generic distributive-conditional type.** A single generic formula driven off both discriminant
   fields that generates all 16 combinations from one definition — the least code, but the exact style
   `counterparty` ADR-0001 already rejected (at a much smaller scale — 3 variants on one axis) for
   hurting readability and producing confusing compiler error messages.

## Decision outcome

**Chosen:** Option 1 (two intersected type-sets). It keeps each axis's variants small, explicit, and
hand-written — matching this project's established preference for readability over cleverness — while
avoiding Option 2's 16-way duplication (which would need 4–5 new hand-written blocks for every future
delivery method, instead of 1) and Option 3's already-rejected generic-formula style. TypeScript's
structural intersection of two unions is a well-understood, statically checkable mechanism, not a
custom distributive-conditional trick — it stays closer to Option 2's spirit (explicit variants) while
scaling like a real composition.

## Consequences

**Positive**
- Only ~9 hand-written type pieces to maintain instead of 16, and adding a delivery method or cargo
  type later means writing 1 new piece on its axis, not 4–5 new combinations.
- Each axis's variants stay independently readable — a reader can look at just the `ServiceType`
  variants to understand the location-field requirements without wading through cargo-detail noise.
- Fully static, compiler-checked — satisfies AC-02 and the §6 NFR discriminant guard with no runtime
  cost.

**Negative**
- Slightly less immediately obvious than Option 2 to a reader unfamiliar with the pattern — seeing
  "door-to-door, documents" spelled out as one interface is more literal than seeing it as an
  intersection of two smaller pieces.
- If a future delivery method or cargo type needs a field that depends on *both* axes simultaneously
  (not expressible as "this axis's fields" + "that axis's fields"), the intersection model would need
  a hand-carved exception — not anticipated today, but a real limit of the composition approach.

**Neutral**
- Switching to Option 2 (full enumeration) later is possible without a breaking change to consumers
  (the resulting exported union type has the same shape either way) — an internal implementation
  change, not a public API change, if this composition ever proves too limiting.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0002-per-ref-outcome-array-for-batch-delete]], [[0003-construct-then-verify-print-links]]
