---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-21"
feature_size: "M"
ticket: ""
---

# 0002 — Represent batch delete as a defensively reconciled per-Ref outcome array

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** User (project owner) + Architect (design session)

## Context

Every existing write method in this library — `address`'s and `counterparty`'s `save`/`update`/
`delete` — resolves `T | undefined` (`address` ADR-0001), on the assumption a single call either fully
succeeds or fully fails. `internet-document`'s `delete` breaks that assumption by spec requirement: a
consuming developer can submit multiple waybill Refs in one call, and Nova Poshta's own envelope can
report the overall call `success: true` while individual Refs within it were rejected (`spec.md` §1
decision override, AC-08). `spec.md` §8 OQ-5 explicitly flags that whether Nova Poshta's live response
genuinely distinguishes a rejected Ref from a removed one, within one call, is unconfirmed — and
states the default: "build AC-08's per-Ref representation defensively; downgrade to a simpler contract
if the live API never actually returns a mixed result."

## Decision drivers

- `spec.md` AC-07 — every `delete` call, single-Ref or batch, must return one outcome entry per
  submitted Ref, never nothing, including a one-element array for a single-Ref call.
- `spec.md` AC-08 — a mixed batch result must be represented per Ref (which were removed, which
  weren't, and why), never collapsed into one overall success/failure boolean, and never thrown as an
  error for a partial rejection.
- `spec.md` §8 OQ-5's own stated default: build defensively now, since the live response shape is
  unconfirmed.
- Consistency with this library's error-contract convention (`NovaPoshtaApiError` only for a genuine
  failure — a full network or malformed-response failure, per AC-14/AC-16 — never for a partial
  rejection that Nova Poshta itself reported as part of a successful call).

## Considered options

1. **Hand-built per-Ref outcome array, cross-checked against the submitted Refs.** The module tracks
   which Refs were submitted, inspects Nova Poshta's response for which were confirmed removed, and
   builds a `{Ref, Removed, Reason?}` array with exactly one entry per submitted Ref — a Ref missing
   from Nova Poshta's confirmed-removed set is represented as `Removed: false`, with whatever reason
   Nova Poshta's response attributes to it (or a generic one if none is attributable).
2. **Trust Nova Poshta's response list as-is, one-to-one.** Return whatever outcome records Nova
   Poshta's own response already contains, with no reconciliation against the originally submitted
   Refs. This is the same pass-through pattern every other write method in this library (`address`,
   `counterparty`) already uses today — a real, precedent-following choice, not an invented strawman —
   which is exactly why it has to be explicitly rejected here rather than silently assumed to carry
   over.

## Decision outcome

**Chosen:** Option 1. It is the only option that holds up under `spec.md` §8 OQ-5's own stated
uncertainty: if Nova Poshta's real response ever omits a rejected Ref entirely (rather than listing it
as rejected), Option 2 would silently under-report — returning a shorter array than submitted — which
is exactly the silent half-success risk `spec.md` §1's decision override and AC-08 exist to prevent. A
consuming developer must never be able to mistake "this Ref wasn't in the response" for "this Ref was
removed."

## Consequences

**Positive**
- Satisfies AC-07/AC-08 even if Nova Poshta's real response turns out less detailed than the
  community-SDK cross-check suggests — the defensive reconciliation is a strict superset of what
  Option 2 would provide.
- A single-Ref `delete` call and a batch `delete` call share the exact same return shape and the exact
  same reconciliation code path — no special-casing.

**Negative**
- More bookkeeping code than a straight pass-through — the module must track the submitted Ref set and
  reconcile it, rather than just re-typing Nova Poshta's response.
- If `spec.md` §8 OQ-5 resolves to "the live API always returns a fully faithful per-Ref list," this
  reconciliation logic becomes unnecessary defensive weight that a future simplification could remove
  (the OQ explicitly anticipates this downgrade path).

**Neutral**
- This is a deliberate, spec-mandated divergence from the `T | undefined` shape every other write
  method in this library uses (§4 decision 8, §8) — documented explicitly here and in §8 Crosscutting
  concepts so it doesn't read as an inconsistency.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0001-compose-service-type-and-cargo-type-as-two-intersected-type-sets]], [[0003-construct-then-verify-print-links]]
