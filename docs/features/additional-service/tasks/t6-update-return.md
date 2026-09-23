---
id: T6
title: "Implement updateReturn"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-06", "AC-07"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "S"
status: "todo"
---

# T6 — Implement `updateReturn`

## Why

[contracts/public-api.md §3.1](../contracts/public-api.md), [sad.md §6 Flow 5](../sad.md).

## What

`updateReturn(payload)` → `client.requestFirst<Record<string, unknown>>("AdditionalServiceGeneral",
"update", payload)`.

## Definition of Done

- [ ] Happy-path unit test: applies a corrected field, resolves the response as typed.
- [ ] Status-decline test: a return whose status is no longer "Accepted" throws `NovaPoshtaApiError`
      (AC-07) — no client-side status check is added.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Response is typed defensively (`Record<string, unknown>`) per `contracts/public-api.md` §3.1 —
spec.md's own field list is ambiguous ("updated order fields, or Pricing+ScheduledDeliveryDate when
recalculating"). Shares `src/modules/additional-service/index.ts` — see T4's Notes.
