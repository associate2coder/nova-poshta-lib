---
id: T3
title: "Implement delete with per-Ref outcome reconciliation"
layer: "app"
deps: ["T1"]
acs: ["AC-07", "AC-08"]
files_hint: ["src/modules/internet-document/index.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T3 — Implement delete with per-Ref outcome reconciliation

## Why

Derives from [contracts/public-api.md §3.3](../contracts/public-api.md), [sad.md §6 Flow
2](../sad.md), and [ADR-0002](../adr/0002-per-ref-outcome-array-for-batch-delete.md) — the one write
method in this library that never resolves `T | undefined`, because Nova Poshta's own envelope can
report a batch call successful while individual Refs within it were rejected.

## What

In `src/modules/internet-document/index.ts`:
- `delete({ Documents })` — calls `client.request("InternetDocument", "delete", { Documents })`,
  receives the typed confirmed-removal records, then **reconciles defensively**: every Ref in the
  submitted `Documents` array gets exactly one `DeletedInternetDocumentOutcome` entry —
  `Removed: true` for each Ref found in Nova Poshta's confirmed-removed response, `Removed: false` (+
  `Reason` when Nova Poshta's decline names one) for each Ref **not** found there, even if Nova Poshta
  never explicitly rejected it (ADR-0002's defensive stance: a missing Ref is never silently treated
  as removed).
- A single-Ref call still returns a one-element array (AC-07) — no special-casing of the
  single-vs-batch shape.

## Definition of Done

- [ ] A mocked-`fetch` unit test: single-Ref call → one-element array, `Removed: true`.
- [ ] A mocked-`fetch` unit test: batch call, full success → one entry per Ref, all `Removed: true`.
- [ ] A mocked-`fetch` unit test: batch call, partial success (Nova Poshta's response confirms only
      some Refs) → the missing Ref(s) surface as `Removed: false`, never silently dropped from the
      returned array and never thrown as an error (AC-08).
- [ ] lint + `tsc --noEmit` clean.

## Notes

Shares `src/modules/internet-document/index.ts` with T2/T4/T5 — `implement` serializes this lane via
the overlapping `files_hint`. `contracts/public-api.md` §10 finding 2 flags that the wire
`DocumentRefs` field's true batch-capability is unconfirmed by 2 of the 3 cross-checked SDKs — this
task still builds ADR-0002's batch-capable shape as already Accepted; do not narrow it to single-Ref
without a design-level decision first.
