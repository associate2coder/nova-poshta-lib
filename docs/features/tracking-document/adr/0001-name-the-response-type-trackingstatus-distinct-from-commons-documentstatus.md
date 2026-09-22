---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-22"
feature_size: "S"
ticket: ""
---

# 0001 — Name the response type TrackingStatus, distinct from common's DocumentStatus

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** Architect + user (Socratic walk, `sdd:design tracking-document`)

## Context

`tracking-document` needs a public TypeScript type for the per-shipment status record
`getStatusDocuments` returns (status code, description, recipient/sender/warehouse fields, and 82
further fields — `spec.md` §1). `common` already exports a type literally named `DocumentStatus`
(`src/types/common.ts:15`, `type DocumentStatus = ReferenceRecordBase`) for an unrelated concept: a
static reference-list lookup of possible status values for building a UI dropdown, fetched via
`Common.getDocumentStatuses()`. CONTEXT.md's glossary already carries an entry explicitly
distinguishing the two ("tracking status... NOT `common`'s `DocumentStatus` reference list"), added
while drafting `spec.md`. Both types would be re-exported from the same `src/index.ts` entry point, so
whatever name this module picks must not collide with — or read as a synonym of — `common`'s existing
export.

## Decision drivers

- CONTEXT.md's glossary already names the domain concept "tracking status" verbatim — the canonical
  source of role/domain-term names per `CLAUDE.md`'s API-contract sourcing policy and this skill's
  input-priority order.
- `spec.md` §1's Decision override: nothing confirms `common.DocumentStatus`'s Ref/Description values
  correspond one-to-one with `TrackingDocument`'s numeric `StatusCode` field — the two must stay
  visibly distinct in code, not just in prose, so a reader (or an IDE's autocomplete list) never
  conflates them.
- Every exported type name is part of this library's public API surface (a published npm package) —
  renaming one later is a breaking change for any consumer who imported it by name.

## Considered options

1. **`TrackingStatus`** — matches CONTEXT.md's glossary term exactly; short; reads unambiguously next
   to `common`'s `DocumentStatus` with no shared substring collision risk in an IDE's fuzzy-match list.
2. **`TrackingDocumentStatus`** — ties the name directly to the module folder
   (`tracking-document`) and the Nova Poshta method family (`TrackingDocument.getStatusDocuments`);
   more verbose, and doesn't match the glossary term exactly.
3. **`DocumentTrackingStatus`** — leads with "Document" so it sorts near `internet-document`'s types
   in an IDE's autocomplete list; otherwise carries the same tradeoffs as option 2, with a less
   natural reading order.

## Decision outcome

**Chosen:** Option 1, `TrackingStatus`. It matches the CONTEXT.md glossary term verbatim (the
canonical source for domain-term naming in this repo), stays short, and reads unambiguously next to
`common.DocumentStatus` in both source and the package's published type declarations.

## Consequences

**Positive**
- The exported type name matches the domain vocabulary CONTEXT.md already fixed — no translation
  gap between "what we call it" and "what the type is called."
- No collision or near-collision with `common.DocumentStatus` when both are re-exported from
  `src/index.ts` — a consuming developer's autocomplete list shows two clearly distinct names.

**Negative**
- The name alone doesn't signal which Nova Poshta model (`TrackingDocument`) it came from, unlike
  `internet-document`'s convention of prefixing some exports with the model name (e.g.
  `SavedInternetDocument`) — a developer reading `TrackingStatus` in isolation has to check the import
  path to know its origin.

**Neutral**
- Renaming to `TrackingDocumentStatus` later remains possible but would be a breaking change for any
  consumer importing the type by name, requiring a major version bump — not expected to be needed
  given the glossary alignment above.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: none
