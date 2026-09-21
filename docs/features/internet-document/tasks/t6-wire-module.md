---
id: T6
title: "Wire internet-document module into the public package surface"
layer: "wiring"
deps: ["T2", "T3", "T4", "T5"]
acs: ["AC-17", "AC-18"]
files_hint: ["src/index.ts"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T6 — Wire internet-document module into the public package surface

## Why

Derives from [sad.md §5](../sad.md) (public re-exports) and `spec.md` AC-17/AC-18 — makes
`createInternetDocumentModule` and its full type surface importable from `nova-poshta-lib`'s entry
point, alongside `common`/`address`/`counterparty`.

## What

In `src/index.ts`:
- Export `createInternetDocumentModule` and every public type from `src/types/internet-document.ts`.
- No new cross-module call is added — a sender/recipient/contact-person Ref or a location Ref is
  taken as a plain `string`, never imported as a type from `address`/`counterparty` and never checked
  at runtime against either module (AC-18).
- No caching, memoization, or module-level state introduced by wiring.

## Definition of Done

- [ ] `import { createInternetDocumentModule } from "nova-poshta-lib"` type-checks in a scratch
      import test.
- [ ] Every type this module exports (`SaveInternetDocumentPayload`, `UpdateInternetDocumentPayload`,
      `DeletedInternetDocumentOutcome`, etc.) is importable from the package root.
- [ ] A review check confirms no import from `./modules/address` or `./modules/counterparty` was
      added to `internet-document`'s own module file (AC-18).
- [ ] lint + `tsc --noEmit` clean.

## Notes

This is the join point T2–T5 all feed into — `implement` schedules it only once all four land. AC-17
(authoritative Ref source) is verified here only in the sense of "no caching added"; the fuller
behavioral guarantee is exercised by T7's tests.
