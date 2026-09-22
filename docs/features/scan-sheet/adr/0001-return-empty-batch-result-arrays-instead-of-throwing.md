---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-22"
feature_size: "S"
ticket: ""
---

# 0001 — Return empty batch-result arrays as-is instead of throwing

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Architect + user (Socratic design walk)

## Context

`insertDocuments`, `removeDocuments`, and `deleteScanSheet` each submit one or more items
(`DocumentRefs` or `ScanSheetRefs`) in a single call and normally get back one result item per
submitted item (`spec.md` §1, quoted `InsertDocumentsItem`/`RemoveDocumentsItem`/`DeleteScanSheetItem`
structs). The edge case this decision settles: Nova Poshta reports the call succeeded
(`success: true`), but the returned `data` array comes back completely empty even though one or more
items were submitted. This must be decided now because it fixes the public behavior of three exported
methods on a library that ships to npm — changing it after other code depends on it is a breaking
change.

## Decision drivers

- `spec.md` §6.1 / CLAUDE.md error contract: `NovaPoshtaApiError` is thrown only when the envelope's
  `success` is `false` or the HTTP call fails — no other implicit throw condition exists library-wide.
- `spec.md` AC-04: `getScanSheet` returning an empty array for a non-matching `Ref` is explicitly "not
  an error" — the library's existing precedent that empty and failed are different outcomes.
- Breaking-change cost: this module's 3 batch-write methods are public library exports; consuming
  developers write code against whichever behavior ships first.

## Considered options

1. **Return the array as-is (`[]`)** — treat an empty-but-successful batch result the same as any
   other empty read result; the caller sees `[]` and can check its length if that matters to them.
2. **Throw `NovaPoshtaApiError`** — treat zero results for one-or-more submitted items as anomalous,
   matching the `firstOrThrow` pattern `internet-document`'s `getDocumentPrice`/`getDocumentDeliveryDate`
   already use for a call that logically expects exactly one answer.

## Decision outcome

**Chosen:** Option 1 — return the array as-is. This keeps one library-wide rule instead of a
per-method exception: "empty" and "failed" are always distinct outcomes, and only a top-level
`success: false`, a non-array `data`, or a network/transport failure throws. `insertDocuments`,
`removeDocuments`, and `deleteScanSheet` are structurally batch reads-with-side-effects, the same
shape as `getScanSheet`/`getScanSheetList` (always an array, `client.request<T>()`'s existing
contract) — not a single-value read like `getDocumentPrice`, where `firstOrThrow`'s expectation of
exactly one answer actually holds.

## Consequences

**Positive**
- One error-contract rule for the whole library, not a per-method carve-out — easier to document,
  easier for a consuming developer to reason about (`spec.md` §6.1's own emphasis on contract
  consistency).
- Matches `common`/`address`/`tracking-document`'s existing "empty read ≠ error" precedent exactly,
  so no new mental model is introduced.

**Negative**
- If Nova Poshta's API silently drops items due to a bug on their end, the caller gets `[]` back with
  no automatic signal that something is wrong — they must check the array length themselves if that
  distinction matters to their use case.

**Neutral**
- Switching to Option 2 later is possible (a minor-version behavior change, not a type change) but is
  itself a breaking change for any caller who started relying on `[]` — the same one-way-door cost
  this ADR exists to name explicitly.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4, §8
- Related ADR: none
