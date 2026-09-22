---
id: T8
title: "Update README usage example"
layer: "docs"
deps: ["T4"]
acs: []
files_hint: ["README.md"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T8 — Update README usage example

## Why

Every prior module's README Usage section carries a type-checked example; `scan-sheet` adds one
more, alongside the existing note that lists all shipped modules.

## What

Add a type-checked `scan-sheet` call to README's Usage section (`insertDocuments` or
`addToTodaysScanSheet`), and document:
- ADR-0001's empty-batch-result rule: an empty-but-successful array is returned as-is, not thrown.
- A per-item `Error`/`Errors` value inside an otherwise-successful batch never throws either.

## Definition of Done

- [ ] Example type-checks against the shipped public surface.
- [ ] The `common`/`address`/`counterparty`/`internet-document`/`tracking-document` module list at
      the bottom of Usage now also names `scan-sheet`.

## Notes

Mirrors `tracking-document`'s T8 — same section, one more module's note added.
