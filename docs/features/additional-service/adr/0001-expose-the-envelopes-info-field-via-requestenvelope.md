---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-23"
feature_size: "M"
ticket: ""
---

# 0001 — Expose the envelope's `info` field via `requestEnvelope()`

- **Status:** Accepted
- **Date:** 2026-09-23
- **Deciders:** Architect + user (Socratic design walk)

## Context

`checkReturnEditPossible` (`CheckPossibilityCreateReturn`, edit variant) documents a response shaped
as a `Type`-discriminated address-option array *plus* a sibling `info: {PayerTypeDefault, Number}`
block (`spec.md` §1 method table, row 2). The raw envelope type (`src/types/envelope.ts`) already
reserves `info?: unknown` for exactly this kind of Nova Poshta response, but `src/client.ts`'s
`sendRequest()` parses the full envelope and then discards `info` when it builds the object either
`request()` or `requestEnvelope()` hands back — only `data`/`errors`/`warnings` survive. Without a
client-level change, this module cannot deliver the response shape the spec's own table documents.
This must be decided now because it is a shared-infra change (`src/client.ts`), not a module-local one
— every future module inherits whatever shape `requestEnvelope()` settles on here.

## Decision drivers

- `spec.md` §1 method table row 2: the documented response shape includes `info`, not just the
  address-option array — shipping without it contradicts the spec.
- `docs/architecture-map.md` "Where things live": "a change to auth or request framing →
  `src/client.ts` only; every domain module inherits it automatically since none frame requests
  themselves" — for a standard JSON-enveloped call. (`internet-document`'s `printMarkings`/`printDocument`
  build a URL by hand instead of a JSON request — a documented, narrow exception for a fundamentally
  different, non-JSON interaction, not a precedent for this method.)
- DRY: a parallel `fetch` call for this one method would duplicate `sendRequest()`'s existing JSON
  parsing, envelope validation, and error handling — logic already written once and exercised by
  every other method in the library.
- Backward compatibility: `requestEnvelope()` already has 1 caller (`internet-document`'s `delete`)
  whose behavior must not change.

## Considered options

1. **Extend `requestEnvelope()`'s return shape to also carry `info`** — add an optional `info?: unknown`
   field to `NovaPoshtaSuccessEnvelope<T>`, populated from the already-parsed raw envelope.
2. **Give `additional-service` its own parallel `fetch` call** for this one method, bypassing the
   shared client entirely to read `info` off a locally-parsed response — duplicating the JSON-parsing
   and envelope-validation logic `sendRequest()` already owns, for one field on one method.
3. **Drop `info` from the typed response** and ship `checkReturnEditPossible` with only the
   address-option array — contradicts what `spec.md`'s own method table documents.

## Decision outcome

**Chosen:** Option 1. Adding `info?: unknown` to `NovaPoshtaSuccessEnvelope<T>` is a strictly additive,
backward-compatible change — `internet-document`'s existing `requestEnvelope()` call is unaffected
since it never reads the new field. It keeps every module, including this one, on the one path to
Nova Poshta the architecture already commits to (`architecture-map.md` "Module wiring"), and it
delivers the response shape the spec actually documents rather than silently shipping less than what
was specified.

## Consequences

**Positive**
- One canonical envelope-parsing path continues to serve every module — no second `fetch` code path
  to keep in sync with the first (error handling, JSON-parse failures, non-2xx handling all still
  flow through `sendRequest()` once).
- Future modules that also need an `info`-shaped response (Nova Poshta uses this pattern elsewhere)
  inherit the capability for free.

**Negative**
- `NovaPoshtaSuccessEnvelope<T>`'s public shape grows by one optional field — a small, permanent
  addition to a shared, already-shipped type.

**Neutral**
- `info` is typed `unknown` at the client layer (matching the raw envelope's own typing) — this
  module is responsible for narrowing it into `{PayerTypeDefault, Number}` itself; the client makes
  no assumption about `info`'s shape for any given method.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4, §5
- Related ADR: none
