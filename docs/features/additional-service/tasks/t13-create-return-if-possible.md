---
id: T13
title: "Implement createReturnIfPossible"
layer: "app"
deps: ["T4", "T5"]
acs: ["AC-20"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "M"
status: "todo"
---

# T13 — Implement `createReturnIfPossible`

## Why

[contracts/public-api.md §3.5](../contracts/public-api.md), [sad.md §4 decision 5 and §6 Flow
1](../sad.md), AC-20. Carries the session's resolved-as-open-risk decision on the `ReturnAddressRef`
mapping (`contracts/public-api.md` header, `sad.md` §11 row 1) — ship as designed, fail safely.

## What

Calls its own `checkReturnPossible({ Number: IntDocNumber })` internally. An empty options array throws
this module's own `NovaPoshtaApiError` ("no return address available for this waybill") — no create
call attempted. A non-empty array takes the first option's `Ref`, builds the plain-return
`CreateReturnPayload` (`Destination: "SenderAddress"`, `ReturnAddressRef: <that Ref>`), and calls its
own `createReturn(...)`.

## Definition of Done

- [ ] Happy-path unit test: checks then creates in one call, returns the same shape `createReturn`
      would.
- [ ] Empty-option-list unit test: throws the module's own `NovaPoshtaApiError`, zero create calls
      attempted.
- [ ] Check-declined unit test: propagates Nova Poshta's own decline, zero create calls attempted.
- [ ] Create-declined-after-successful-check unit test: propagates `NovaPoshtaApiError` — this is the
      branch that would catch a wrong `ReturnAddressRef` assumption; the test doesn't need to prove the
      assumption right, only that a wrong one fails safely.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

No automatic reconciliation/retry across the two calls (spec.md §3 non-goal) — this library holds no
state to reconcile against. Shares `src/modules/additional-service/index.ts` — see T4's Notes.
