---
status: Accepted
owner: "Architect"
reviewers: ["Tech Lead"]
updated_at: "2026-09-22"
feature_size: "M"
ticket: ""
---

# 0005 — `delete` is single-Ref per call; batch is this module's own client-side loop

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** User (project owner) + Architect (post-ship API-contract re-audit)

## Context

[[0002-per-ref-outcome-array-for-batch-delete]] shipped `delete` as accepting an array of Refs in
one call, reconciled per-Ref (`DeleteInternetDocumentPayload.Documents: string[]`). That premise —
a single Nova Poshta `delete` call genuinely accepting more than one Ref — was carried through
eight review passes as an open question (`spec.md` §8 OQ-5) rather than a confirmed fact, and
shipped anyway.

A post-ship re-audit, triggered by a new repo-wide policy (CLAUDE.md "API-contract sourcing
policy": every field must trace to Nova Poshta's own docs or ≥2 agreeing independent
implementations, quoting the exact upstream struct), re-fetched every cross-checked SDK's actual
source for this one field:

- `platx/go-nova-poshta`'s `DeleteReq.DocumentRefs` is typed `types.UUID` — a single UUID, not a
  slice.
- `maddsua/NovaPoshtaREST`'s `deleteExpressDoc` types `DocumentRefs: string` — also singular.
- `serj1chen/nova-poshta-sdk-php`'s instance `delete()` method wraps `$this->Ref` into a
  one-element `array($this->Ref)` client-side — it never exposes a way to submit more than one Ref
  in a single call.
- `shopanaio/carrier-api` (TypeScript, actively maintained), the one dissenting source, types
  `DeleteWaybillRequest.DocumentRefs: readonly DocumentRef[]` and ships a public `deleteBatch()`.

3 of 4 independent sources — including the two most directly reverse-engineered from the raw wire
protocol — type the field as accepting exactly one value. No source demonstrates a confirmed
multi-Ref call actually succeeding against a live Nova Poshta response.

## Decision drivers

- The new CLAUDE.md policy: a discrepancy between sources blocks shipping the disputed shape as
  confirmed; a majority of directly-sourced implementations disagreeing with the shipped design is
  exactly such a discrepancy.
- `spec.md` §8 OQ-5's own stated default: "build AC-08's per-Ref representation defensively;
  downgrade to a simpler contract if the live API never actually returns a mixed result" — this is
  that downgrade.
- A consuming developer must still be able to delete more than one waybill without hand-rolling a
  loop themselves.

## Considered options

1. **Narrow `delete` to one Ref per call; add a `deleteBatch` convenience that loops client-side.**
   `delete(payload: {Ref: string})` resolves one `DeletedInternetDocumentOutcome`, not an array.
   `deleteBatch(payload: {Documents: string[]})` calls `delete` once per Ref, sequentially, and
   collects the per-Ref outcomes — the same shape callers already had, just built client-side
   instead of claimed as a single server call.
2. **Keep the shipped batch-call shape as-is**, accepting the majority-of-sources risk that a live
   multi-Ref call might silently only remove the first Ref, or be rejected outright, with no test
   coverage able to catch it (no live API key available in this environment).
3. **Drop batch delete entirely**, forcing every caller to loop themselves with no library support.

## Decision outcome

**Chosen:** Option 1. It resolves the discrepancy the new policy exists to catch, without removing
the batch convenience callers already had. The per-Ref outcome shape and reasoning logic from
ADR-0002 carry over unchanged — a single-Ref response can still report success at the envelope
level while not actually confirming that Ref removed, so the `{Ref, Removed, Reason?}` reconciliation
is still needed; it is simply no longer performed across multiple Refs from one response, since each
`deleteBatch` iteration now gets its own single-Ref response to reconcile. This also **simplifies**
the implementation: the regex-based per-Ref message-attribution logic ADR-0002 needed (to figure out
which warning/error text belonged to which Ref when several were in one response) is no longer
necessary — a single-Ref response's warnings/errors can only ever concern that one Ref.

Option 2 was rejected as exactly the kind of unresolved API-contract question the new policy blocks.
Option 3 was rejected as an unnecessary regression in ergonomics — nothing about the sourcing
problem requires removing the convenience, only relocating where the multiplicity is handled.

## Consequences

**Positive**
- No claim is made that isn't backed by at least a majority of directly-sourced implementations.
- Implementation is simpler than ADR-0002's: no cross-Ref message attribution needed.
- Callers who want batch behavior keep it via `deleteBatch`, with the same per-Ref outcome shape.

**Negative**
- Breaking change to `delete`'s public signature (`Documents: string[]` → `Ref: string`, return
  type array → single object) on an already-published version. No workaround exists other than the
  version bump and changelog note.
- `deleteBatch` issues N sequential HTTP calls instead of one — slower for a large batch, and no
  longer atomic in any sense (a caller could theoretically observe some Refs deleted and a later
  call in the same `deleteBatch` fail entirely) — documented in the method's own JSDoc.

**Neutral**
- If a future live API check confirms Nova Poshta's `delete` genuinely accepts multiple Refs after
  all (matching `shopanaio/carrier-api`'s claim), `deleteBatch` could be reimplemented as a single
  call without changing its public signature — this ADR's narrowing is a safe default, not a
  one-way door.

## Links

- Spec: [[../spec.md]] §5 AC-07/AC-08, §8 OQ-5
- SAD: [[../sad.md]] §4
- Superseded ADR: [[0002-per-ref-outcome-array-for-batch-delete]]
- Related ADR: [[0003-construct-then-verify-print-links]] (also re-audited in this same pass, see
  its amendment log for the print-link mechanism's own — still-open — discrepancy)
