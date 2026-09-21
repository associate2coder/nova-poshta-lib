---
id: T9
title: "Update README usage example"
layer: "docs"
deps: ["T6"]
acs: []
files_hint: ["README.md"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T9 — Update README usage example

## Why

`sad.md` §10 QG-3 commits to documenting the print-link's credential-bearing nature (AC-13) "not left
for a developer to discover" — the README's Usage section is where a new consumer of the library
first meets this module.

## What

In `README.md`'s Usage section:
- A real, type-checked `internet-document.save(...)` call alongside the existing `common`/`address`/
  `counterparty` examples.
- A short note next to the `printDocument`/`printMarkings` example stating the returned link carries
  the caller's own API-key-level access and must be handled with the same care as the key itself
  (AC-13) — not a redaction mechanism, just the documented warning `sad.md` §10 QG-3 requires.

## Definition of Done

- [ ] README's Usage section includes a real, type-checked `internet-document` call.
- [ ] The print-link credential-bearing warning is present next to the print example.
- [ ] No placeholder comment (e.g. `// TODO: internet-document example`) remains.

## Notes

Doc-only task — no test to write, no `acs` claimed (mirrors `counterparty`'s T10 precedent).
