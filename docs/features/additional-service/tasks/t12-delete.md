---
id: T12
title: "Implement deleteAdditionalServiceOrder"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-18", "AC-19"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "S"
status: "todo"
---

# T12 — Implement `deleteAdditionalServiceOrder`

## Why

[contracts/public-api.md §3.4](../contracts/public-api.md), [sad.md §6 Flow 11](../sad.md).

## What

`deleteAdditionalServiceOrder(payload)` → `client.requestFirst<DeletedAdditionalServiceOrder>(
"AdditionalServiceGeneral", "delete", { Ref })` — one method works across return, redirect, and
waybill-edit `Ref`s alike.

## Definition of Done

- [ ] Happy-path unit test covering all three order kinds (return/redirect/waybill-edit `Ref`, same
      method call).
- [ ] Status-decline test for a non-Accepted waybill-edit order (AC-19) — no client-side status check
      is added.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Shares `src/modules/additional-service/index.ts` — see T4's Notes.
