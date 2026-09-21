---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-21"
feature_size: "M"
ticket: ""
---

# 0004 — CargoType is a plain discriminant field, not a structural variant axis

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** User (project owner), raised by an `/sdd:review internet-document` finding

## Context

ADR-0001 committed to composing `save`/`update`'s payload type from **two** intersected axes:
`ServiceType` (4 delivery-method legs) and `CargoType` (~4–5 cargo classifications, "each requiring
only its own cargo-detail fields"). The implementation shipped only the `ServiceType` axis as
distinct variants; `CargoType` shipped as one plain field on every variant, identical regardless of
its value. The independent review (`docs/features/internet-document/_review/review-2026-09-21.md`,
finding 1) confirmed this by a type probe: `CargoType: "Pallet"`, `"Documents"`, and `"Parcel"`
compile with byte-identical field sets — no payload can ever fail to compile because of its cargo
type.

Re-examining the evidence: `contracts/public-api.md` §10 finding 1 (`api-sync-report.md`) already
flagged, before this review, that "the CargoType-specific field split is NOT separately confirmed by
any cross-checked source — CargoType there is a plain enum field on one shared struct, not a
struct-varying discriminant" across all three community SDKs cross-checked while drafting the spec.
`spec.md` §8 OQ-1/OQ-3 already carry this exact uncertainty as an open question pending Nova Poshta's
official documentation (still unreachable as of this decision).

## Decision drivers

- Two ways to close the gap between ADR-0001's stated design and the code: (a) invent ~4–5 sets of
  cargo-detail fields per `CargoType` value to match ADR-0001's original text, or (b) accept that no
  cross-checked source supports those fields existing, and narrow the contract to what's actually
  known.
- This project's established convention (spec.md, `contracts/public-api.md`, `api-sync-report.md`)
  is to document an unconfirmed assumption explicitly rather than encode invented behavior as if
  confirmed — fabricating field-level API contract with zero evidentiary basis directly contradicts
  that convention and risks shipping wrong required/optional fields to every consumer.
- `spec.md` AC-02 only requires the compile-time guard to check "payload-internal consistency" — it
  does not itself mandate that CargoType must be the source of a structural split, only that the
  chosen delivery-method/cargo-type combination's *actual* required fields are enforced.

## Considered options

1. **Invent per-CargoType field variants.** Write ~4–5 hand-written interfaces guessing at
   cargo-specific fields (e.g. a `Pallet`-only "pallet count" field, a `Documents`-only field) with no
   source confirming they exist or are named correctly, then intersect with the `ServiceType` leg as
   ADR-0001 originally specified.
2. **Narrow CargoType to a plain discriminant field; scope AC-02's structural guarantee to the
   `ServiceType` leg only.** Keep `CargoType` as one shared, non-structural field (as already shipped),
   correct ADR-0001/AC-02/the §6 NFR row's wording to say so explicitly, and record re-verifying the
   cargo-detail field split (if any exists) as a §8 open question pending official docs.

## Decision outcome

**Chosen:** Option 2. Fabricating field names/shapes for a wire format no cross-checked source
confirms exists would encode a guess as a compile-time contract — worse than the gap it closes,
because it looks authoritative to a consuming developer while being unverified. `spec.md` §8 OQ-1/
OQ-3 already track re-verifying the true `CargoType` field shape against Nova Poshta's official docs;
this decision keeps that the single place the uncertainty lives, rather than duplicating it into
invented type structure.

## Consequences

**Positive**
- The compile-time contract only asserts what's actually known: the `ServiceType` leg's location
  fields (still fully enforced, both sender and recipient sides, per the same review's finding 2 fix).
- No risk of shipping a consumer-facing field name/shape that turns out wrong once the official docs
  are reachable — the existing OQ-1/OQ-3 remain the single source of that uncertainty.

**Negative**
- AC-02's "domain invariant" is narrower than ADR-0001 originally promised — a payload with the wrong
  `CargoType` value paired with otherwise-valid `ServiceType` fields still compiles; only Nova
  Poshta's own runtime decline (AC-14) would catch a genuinely invalid cargo/field combination, if one
  exists.
- If Nova Poshta's official docs later confirm CargoType does vary required fields, this ADR's
  Option 2 will itself need superseding once again, with the real field shapes in hand.

## Links

- Spec: [[../spec.md]] AC-02, §6 NFR "Save/update discriminant guard", §8 OQ-1/OQ-3
- Review finding: [[../_review/review-2026-09-21.md]] finding 1
- Superseded: [[0001-compose-service-type-and-cargo-type-as-two-intersected-type-sets]] (CargoType axis only — its ServiceType-axis decision stands)
