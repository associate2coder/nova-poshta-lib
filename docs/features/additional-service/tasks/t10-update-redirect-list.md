---
id: T10
title: "Implement updateRedirect and getRedirectionOrdersList"
layer: "app"
deps: ["T1", "T2"]
acs: ["AC-12", "AC-13", "AC-14"]
files_hint: ["src/modules/additional-service/index.ts"]
owner: "TBD lead"
estimate: "M"
status: "todo"
---

# T10 — Implement `updateRedirect` and `getRedirectionOrdersList`

## Why

[contracts/public-api.md §3.2](../contracts/public-api.md), [sad.md §6 Flow 9](../sad.md) (sender-vs-
recipient role inferred by key, AC-13).

## What

`updateRedirect(payload)` → `client.requestFirst<Record<string, unknown>>(...)`, no role parameter.
`getRedirectionOrdersList(filters?)` → `client.request<RedirectOrderListItem>(...)`.

## Definition of Done

- [ ] `updateRedirect` has a happy-path unit test and a field-permission-decline test — a field Nova
      Poshta rejects for this caller's inferred role surfaces as `NovaPoshtaApiError` (AC-13); the
      payload carries no role field and no client-side role check is added.
- [ ] `getRedirectionOrdersList` has a happy-path test and a filter-pass-through test (AC-14).
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Response typed defensively (`Record<string, unknown>`), same reasoning as T6's `updateReturn`. Shares
`src/modules/additional-service/index.ts` — see T4's Notes.
