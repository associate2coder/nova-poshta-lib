---
id: T8
title: "Update README usage example"
layer: "docs"
deps: ["T4"]
acs: []
files_hint: ["README.md"]
owner: "<TBD lead>"
estimate: "XS"
status: "todo"
---

# T8 — Update README usage example

## Why

README's Usage section already walks through `address`/`counterparty`/`internet-document` end to
end — `tracking-document` is the next module a reader expects to see demonstrated there.

## What

Extend README's Usage code block:

- Import `createTrackingDocumentModule` alongside the existing module imports.
- Show a type-checked `getDocumentStatus(waybillNumber)` (or `getStatusDocuments`) call.
- Note that a "not found"/"removed" waybill resolves as a normal typed record, not a thrown error
  (AC-06) — so callers should check `StatusCode`, not wrap the call in a try/catch for that case.

## Definition of Done

- [ ] README's Usage section includes the new call, type-checked against the shipped module.
- [ ] The AC-06 behavior note is present next to the example.

## Notes

Mirrors the existing style of inline callouts already used for `save()`'s `undefined` return and
`printDocument`'s credential-bearing link.
