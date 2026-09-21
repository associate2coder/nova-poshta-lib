---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-09-21"
feature_size: "M"
ticket: ""
---

# 0003 — Construct the print link, then verify it with one live check

- **Status:** Accepted
- **Date:** 2026-09-21
- **Deciders:** User (project owner) + Architect (design session)

## Context

`printDocument` and `printMarkings` are unlike every other method in this library: Nova Poshta returns
a plain hosted link (a URL string), not JSON data, and that link itself carries the caller's own API
key embedded in it — whoever holds the link can act with the caller's full account privileges, not
merely view a document (`spec.md` §1 decision override, §6.1, AC-13). Routing this through
`NovaPoshtaClient.request()`'s envelope unwrap would either fail outright (the response isn't JSON) or,
worse, silently succeed on a blank or error page during a save-then-print race (`spec.md` §1). AC-11/
AC-12 still require that a genuine failure — an invalid Ref, a document Nova Poshta hasn't finished
materializing — raises the standard error, exactly like every other method (AC-14). `spec.md` §8 OQ-1
flags that the exact wire shape of this sub-flow (request format, response format, how a failure is
signaled) is unconfirmed against Nova Poshta's official docs, since the docs portal has blocked every
automated fetch attempted while drafting both the spec and this design.

## Decision drivers

- `spec.md` AC-11/AC-12 — a failure to obtain the link must raise `NovaPoshtaApiError`, not return a
  link that resolves to a blank or error page.
- `spec.md` §1 decision override — the print methods must never be routed through the shared
  envelope-unwrap path.
- `spec.md` §3 non-goal — the shared core client (`src/client.ts`) must not be changed to give print a
  non-JSON transport path of its own; the distinct path lives entirely inside this module.
- `spec.md` §6.1 / AC-13 — the returned link's credential-bearing nature must be documented, not
  silently discovered.

## Considered options

1. **Construct the link per Nova Poshta's documented URL pattern, then issue one live HTTP check
   against that exact URL before returning it.** The method builds the print URL (embedding the
   caller's `apiKey` and the submitted Refs, per the pattern the community SDKs cross-checked in
   `spec.md` §1 use), performs one request against it, and only returns the URL string if that request
   succeeds; otherwise it raises `NovaPoshtaApiError`.
2. **Construct the link only, with no verification.** The method builds and returns the URL string by
   interpolating the caller's `apiKey` and the submitted Refs, making no network call of its own.

## Decision outcome

**Chosen:** Option 1. It is the only option that keeps AC-11/AC-12's promise that a genuine failure
(an invalid Ref, an unmaterialized document) raises the standard error at call time — Option 2 cannot
detect any failure until a developer or a browser later opens the link, which would silently violate
AC-11/AC-12's stated contract. The extra network round-trip is a deliberate, documented cost of that
guarantee, not an oversight.

## Consequences

**Positive**
- Preserves this library's uniform error contract (AC-14/AC-16) even for the one code path that
  structurally can't use the shared envelope unwrap — a consuming developer never has to special-case
  print-method error handling.
- The returned value stays a plain URL string, matching AC-11/AC-12's contract and this module's own
  non-goal against changing the shared core client.

**Negative**
- One extra network round-trip per print call, beyond what strict URL construction alone would cost —
  a deliberate trade against the ≤5ms library-added-overhead NFR's spirit, though that NFR is measured
  with `fetch` stubbed to near-zero latency in tests, not against a real network call.
- The exact verification mechanism (what a "successful" check response looks like from Nova Poshta) is
  still unconfirmed against the live/official docs (`spec.md` §8 OQ-1) — implementation must re-verify
  before this ships, tracked in §11.

**Neutral**
- If `spec.md` §8 OQ-1 resolves to reveal a different actual wire shape (e.g. the JSON API itself
  returns the link inside a still-parseable envelope), this ADR's *intent* (verify before returning)
  survives even if the specific construct-a-URL mechanic needs revision — the decision that matters is
  "check before promising success," not the literal string-interpolation detail.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0001-compose-service-type-and-cargo-type-as-two-intersected-type-sets]], [[0002-per-ref-outcome-array-for-batch-delete]]
