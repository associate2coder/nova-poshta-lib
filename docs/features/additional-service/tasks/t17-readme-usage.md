---
id: T17
title: "Update README usage example"
layer: "docs"
deps: ["T14"]
acs: []
files_hint: ["README.md"]
owner: "TBD lead"
estimate: "S"
status: "todo"
---

# T17 — Update README usage example

## Why

Matches every sibling module's shipped precedent (README documents one real, type-checked usage
example per module).

## What

Add a `createReturn` or `createReturnIfPossible` example to README's Usage section.

## Definition of Done

- [ ] The example is real and type-checks against the shipped public API.
- [ ] The open `ReturnAddressRef`-mapping risk is documented next to the `createReturnIfPossible`
      example (`contracts/public-api.md` header, `sad.md` §11 row 1) — so a reader understands why a
      wrong-but-safe outcome is possible.

## Notes

No other README section changes.
