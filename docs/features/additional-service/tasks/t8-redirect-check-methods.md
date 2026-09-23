---
id: T8
title: "Implement checkRedirectPossible and checkRedirectEditPossible"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-09", "AC-12"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "M"
status: "todo"
---

# T8 — Implement `checkRedirectPossible` and `checkRedirectEditPossible`

## Why

[contracts/public-api.md §3.2](../contracts/public-api.md), [sad.md §5's asymmetry note and §6 Flow
7/Flow 9](../sad.md) — unlike `checkReturnPossible`, these are single-record reads.

## What

Both delegate to `client.requestFirst<T>("AdditionalServiceGeneral", "checkPossibilityForRedirecting",
...)`, distinguished only by which properties are sent (`Number` vs. `OrderRef`+fields).

## Definition of Done

- [ ] `checkRedirectPossible` has a happy-path unit test asserting it resolves one typed record (not an
      array) and a decline test.
- [ ] `checkRedirectEditPossible` has a happy-path test (resolves the `Partial<RedirectPossibility>`
      subset) and a decline test.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Shares `src/modules/additional-service/index.ts` — see T4's Notes.
