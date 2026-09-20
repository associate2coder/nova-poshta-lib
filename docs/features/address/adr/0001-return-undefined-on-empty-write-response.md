---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-20"
feature_size: "S"
ticket: ""
---

# 0001 — Return `T | undefined` from a write method when Nova Poshta's success response carries no record

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** User (project owner) + Architect (design session)

## Context

`address` is the first module in the library with write operations (`save`, `update`, `delete`).
`spec.md` AC-07 requires that when Nova Poshta reports a write as successful but returns an empty
`data` list instead of the record, the library represents this as a valid success with "no record
to return" — not an error, and distinct from a malformed/non-list response (which already throws
per AC-10, via the array-shape check inherited unchanged from `common`'s ADR-0001). The public
TypeScript return type of `save`/`update`/`delete` has to express both possibilities. Because this
is a published npm package, the shape chosen here becomes a public contract — changing it later is
a breaking change — and the same "empty-on-success" pattern is expected to recur in every future
write-capable module (counterparty, shipment creation, etc.), so this decision sets the library's
standard, not just this one module's.

## Decision drivers

- `spec.md` AC-07 — a successful write with empty data must be representable as success, not an error.
- `spec.md` AC-04 / AC-06 — "the system … returns the saved/deleted address's own `Ref`", worded as a
  single record, not a list.
- Published-build type-surface completeness (`spec.md` §6, row 6) — the shape must be correct in both
  the ESM and CJS built output, not just the source.
- Library-wide consistency for future write modules, so each doesn't invent its own answer.

## Considered options

1. **Return `T | undefined`** — unwrap the envelope's array to a single optional value; `undefined`
   when the array is empty.
2. **Return `T[]` (0 or 1 items)** — pass the envelope's own array shape straight through, unwrapped
   by nothing.

## Decision outcome

**Chosen:** Option 1, `T | undefined`. It matches how TypeScript developers already model "maybe
present" values elsewhere (optional chaining, `if (result)`), and it keeps the same tolerant
philosophy `common`'s ADR-0001 already established for this library — don't fail loudly on data
Nova Poshta sends as merely thin, only on data that's structurally broken. It also reads correctly
against AC-04/AC-06's "the saved address's own `Ref`" wording, which implies a single record, not a
list a caller has to destructure.

## Consequences

**Positive**
- Idiomatic TypeScript for an optional single value; no destructuring required to read the happy path.
- Consistent with the existing array-shape-check tolerance (`common` ADR-0001) — no new validation
  philosophy introduced.
- Sets one library-wide answer for "successful write, no record" that future write modules reuse
  without re-litigating it.

**Negative**
- Every consuming developer must null-check the result; a loose `tsconfig` (no `strictNullChecks`)
  won't catch a missed check at compile time, only at runtime.

**Neutral**
- Switching to the array-passthrough shape later is possible but is a breaking change for every
  consumer calling a write method — a major-version bump, not a patch.

## Links

- Spec: [[../spec.md]] AC-04, AC-06, AC-07
- SAD: [[../sad.md]] §4, §6
- Related ADR: inherits `common`'s [[../../common/adr/0001-array-shape-only-validation.md]] unchanged
