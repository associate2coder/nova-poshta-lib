---
id: T9
title: "Implement createRedirect and calculateRedirect"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-09", "AC-10", "AC-11"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "M"
status: "todo"
---

# T9 — Implement `createRedirect` and `calculateRedirect`

## Why

[contracts/public-api.md §3.2](../contracts/public-api.md), [sad.md §6 Flow 7/Flow 8](../sad.md).

## What

`createRedirect(payload)` sets `OrderType: "orderRedirecting"` internally, calls
`client.requestFirst<SavedRedirectOrder>(...)`. `calculateRedirect` reuses the same payload shape plus
`OnlyGetPricing: "1"`.

## Definition of Done

- [ ] `createRedirect` has a happy-path unit test (returns `{ Number, Ref }`) and a test asserting the
      `Recipient` counterparty `Ref` is passed through unmodified with no existence/ownership check of
      its own (AC-10).
- [ ] `calculateRedirect` has a unit test asserting the outgoing request carries
      `OnlyGetPricing: "1"` and no order is created (AC-11).
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

No cross-module runtime call to `counterparty` — `Recipient` stays a plain `string` (`sad.md` §5 Hard
rule). Shares `src/modules/additional-service/index.ts` — see T4's Notes.
