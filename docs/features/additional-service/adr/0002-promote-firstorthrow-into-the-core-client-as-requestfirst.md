---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-23"
feature_size: "M"
ticket: ""
---

# 0002 — Promote `firstOrThrow` into the core client as `requestFirst<T>()`

- **Status:** Accepted
- **Date:** 2026-09-23
- **Deciders:** Architect + user (Socratic design walk)

## Context

12 of this module's 19 methods (every `create*`, `calculate*`, `update*`, the 3 `check*Possible`
single-record reads, `deleteAdditionalServiceOrder`, and `createReturnIfPossible`) return exactly one
logical record even though `client.request<T>()` always resolves an array — the same "unwrap the one
element, throw if the array came back empty" need `internet-document`'s private, module-local
`firstOrThrow()` helper already meets for 2 of its own methods (`getDocumentPrice`,
`getDocumentDeliveryDate`). Reusing that helper as written would mean `additional-service` importing
from `internet-document`'s module file — this repo's domain modules are meant to depend only on the
shared core client, never on each other (`architecture-map.md` "Inter-module communication"). This
must be decided now: writing a second, independent copy of the same throw-on-empty logic inside
`additional-service`'s own file — alongside the one that already exists in `internet-document`, so the
same logic would be maintained in 2 places, at 2 and 12 call sites respectively — is the
DRY-violating alternative, and the shared-vs-duplicated choice shapes every one of this module's
single-record methods from the first line of code.

## Decision drivers

- User's explicit reuse rule for this feature: code is reused across modules only when it lives in
  something genuinely independent (the shared core client), never by one domain module reaching into
  a sibling's internals.
- `architecture-map.md`: domain modules communicate only through the shared core client — no
  inter-module calls.
- DRY / clean-code: the same 8-line unwrap-or-throw logic would otherwise exist in 2 places
  (`internet-document`, duplicated again in `additional-service`) with no single source of truth,
  and a 3rd future module needing it would make a 3rd copy.

## Considered options

1. **Promote `firstOrThrow` into `src/client.ts`** as `NovaPoshtaClient.requestFirst<T>()`, refactor
   `internet-document`'s 2 existing call sites to use it, and have `additional-service`'s 12
   single-record methods call it too.
2. **Duplicate a private copy inside `additional-service`'s own module file** — a second,
   independently-maintained implementation of the same logic, module-local like `scan-sheet`'s
   Kyiv-date helper.

## Decision outcome

**Chosen:** Option 1. This is exactly the kind of change `src/client.ts` exists to absorb —
`architecture-map.md`'s own convention already states "a change to auth or request framing →
`src/client.ts` only; every domain module inherits it automatically." `requestFirst<T>()` becomes a
peer to `request<T>()`/`requestEnvelope<T>()` on the same interface, and `internet-document`'s
refactor is a pure behavior-preserving extraction (same throw message shape, same call sites) — not a
public-API change for that module's own consumers.

## Consequences

**Positive**
- One canonical single-record-unwrap implementation, inherited by every module that needs it —
  `internet-document`'s 2 call sites and `additional-service`'s 12, with zero duplicated logic.
- Both domain modules stay independent of each other; both depend only on the shared core, matching
  the existing `request()`/`requestEnvelope()` pattern exactly.
- Any future module with the same "exactly one record" shape (there will be one — this pattern is
  common across Nova Poshta's write/check endpoints) gets it for free.

**Negative**
- Touches an already-shipped, already-tested file (`src/client.ts`) and an already-shipped module
  (`internet-document`) as part of landing a new feature — slightly larger diff and blast radius than
  a module-local addition would have had.
- `internet-document`'s existing unit tests for `getDocumentPrice`/`getDocumentDeliveryDate` must keep
  passing unchanged after the refactor — regression risk is low (pure extraction) but real.

**Neutral**
- The error message `requestFirst<T>()` throws is now shared verbatim across every caller
  ("...reported success but returned no record") rather than each module wording it slightly
  differently — a minor, deliberate consistency gain.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4, §5
- Related ADR: [[0001-expose-the-envelopes-info-field-via-requestenvelope]] (both extend
  `src/client.ts`'s shared surface in the same design pass)
