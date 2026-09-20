---
id: T10
title: "Update README usage example"
layer: "docs"
deps: ["T7"]
acs: []
files_hint: ["README.md"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T10 — Update README usage example

## Why

Discoverability (US-10) matters beyond editor autocomplete too — the README's own Usage section
should show a real `counterparty` call, matching `address`'s precedent of replacing its placeholder
comment with a type-checked example. Unlike AC-17 (which specifically gates the *published*
`.d.ts`/`.d.cts` declaration files, verified in CI), no acceptance criterion covers the README itself —
this task isn't part of that gate.

## What

Add a `counterparty` example to README's Usage section — e.g. `getCounterparties` or `save` against a
`PrivatePerson` payload — real enough to type-check against the published package shape.

## Definition of Done

- [ ] README's Usage section shows a real, type-checked `counterparty` call.
- [ ] No leftover placeholder comment for `counterparty` remains in README.

## Notes

Depends on T7 (the module must be wired into the public entry point before an example can import it).
