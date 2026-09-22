---
id: T2
title: "Implement getStatusDocuments (raw batch method)"
layer: "app"
deps: ["T1"]
acs: ["AC-01", "AC-02", "AC-03", "AC-05", "AC-06", "AC-11"]
files_hint: ["src/modules/tracking-document/index.ts"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T2 — Implement getStatusDocuments (raw batch method)

## Why

The model's one real Nova Poshta method ([spec §1](../spec.md), [sad §6 Flow 1](../sad.md)) — a
straight pass-through with no client-side splitting, capping, or reordering. The match-by-identity
guard (AC-05) is the direct mitigation for the risk that produced ADR-0005 in `internet-document`.

## What

In `src/modules/tracking-document/index.ts`, add `createTrackingDocumentModule(client)`'s
`getStatusDocuments(payload)`:

- Delegates straight to `client.request<TrackingStatus>("TrackingDocument", "getStatusDocuments", payload)` —
  no new client capability (`sad.md` §4 decision 2).
- Passes `Documents` through exactly as given: no split, cap, or reorder (AC-03); `Phone` on each
  filter defaults to `""` when the caller omits it (AC-02).
- Returns the response array with every record's own `Number` field left intact — never
  reindexed/reordered/truncated (AC-05); a not-found/removed status code (2/3) is returned as a
  normal record, never special-cased (AC-06).
- Imports nothing from `src/modules/internet-document` or `src/modules/common` (AC-11, `sad.md`
  §4 decision 5).

## Definition of Done

- [ ] Mocked-fetch unit test: a multi-waybill request's `Documents` array reaches the request body
      unmodified (order + length preserved).
- [ ] Mocked-fetch unit test: a response shorter/longer/reordered vs. the request round-trips with
      every record's `Number` field intact.
- [ ] Mocked-fetch unit test: a record with `StatusCode` 2 or 3 resolves normally, no exception.
- [ ] No import from `internet-document` or `common` anywhere in the file.
- [ ] lint + vet clean.

## Notes

Shares `src/modules/tracking-document/index.ts` with [T3](./t3-get-document-status.md) — same
file, so `implement` serializes the pair into one lane regardless of the `deps` graph (both depend
only on T1).
