---
id: T3
title: "Implement getDocumentStatus (convenience, match-by-identity)"
layer: "app"
deps: ["T1"]
acs: ["AC-04"]
files_hint: ["src/modules/tracking-document/index.ts"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T3 — Implement getDocumentStatus (convenience, match-by-identity)

## Why

The single-waybill convenience wrapper ([spec §1](../spec.md) US-04, AC-04) — the one flow in this
module with a shape no sibling module's convenience method has: a three-way branch on how many
returned records match the requested identity, not just "take the first" ([sad §4 decision 3](../sad.md),
[sad §6 Flow 2](../sad.md)).

## What

In `src/modules/tracking-document/index.ts`, add `getDocumentStatus(documentNumber, phone?)`:

- Makes exactly one call: `client.request("TrackingDocument", "getStatusDocuments", { Documents: [{ DocumentNumber: documentNumber, Phone: phone ?? "" }] })`.
- Filters the response by exact string comparison of `record.Number === documentNumber` — no
  trimming, case-folding, or reformatting on either side.
- Zero matches → resolves `undefined` (distinct from AC-06's "not found" status record, which is
  normal data returned by `getStatusDocuments` itself).
- Exactly one match → resolves that record.
- More than one match → throws `NovaPoshtaApiError` — the library cannot safely guess which record
  was meant.

## Definition of Done

- [ ] Mocked-fetch unit test: exactly one call is made carrying a single-item `Documents` array.
- [ ] Mocked-fetch unit test: zero matching records resolves `undefined`, no exception.
- [ ] Mocked-fetch unit test: exactly one matching record resolves that record.
- [ ] Mocked-fetch unit test: more than one matching `Number` throws `NovaPoshtaApiError`.
- [ ] lint + vet clean.

## Notes

Shares `src/modules/tracking-document/index.ts` with [T2](./t2-get-status-documents.md) — same
file, so `implement` serializes the pair into one lane regardless of the `deps` graph (both depend
only on T1).
