---
id: T4
title: "Implement checkReturnPossible and checkReturnEditPossible"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-01", "AC-02", "AC-06"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "M"
status: "todo"
---

# T4 — Implement `checkReturnPossible` and `checkReturnEditPossible`

## Why

[contracts/public-api.md §3.1](../contracts/public-api.md), [sad.md §6 Flow 2 and Flow 3](../sad.md)
(the `checkReturnEditPossible`/`info`-exposure flow, and the return check-then-create pair).

## What

`checkReturnPossible(payload)` → `client.request<ReturnAddressOption>("AdditionalServiceGeneral",
"CheckPossibilityCreateReturn", { Number })`.
`checkReturnEditPossible(payload)` → `client.requestEnvelope<ReturnEditOption>(...)`, composing
`{ options: data, info: info as ReturnEditInfo }` (ADR-0001) — narrowed in this module, not the client.

## Definition of Done

- [ ] `checkReturnPossible` has a happy-path unit test (returns typed `ReturnAddressOption[]` including
      `NonCash`) and an authorization-decline test — a recipient-key call throws `NovaPoshtaApiError`
      (AC-02).
- [ ] `checkReturnEditPossible` has a happy-path unit test asserting the result reads both
      `requestEnvelope()`'s `data` and `info` fields, and a decline test.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Shares `src/modules/additional-service/index.ts` with T5–T13 — same overlap-lane as `internet-document`'s
T2–T5 precedent; `implement` serializes tasks touching this file.
