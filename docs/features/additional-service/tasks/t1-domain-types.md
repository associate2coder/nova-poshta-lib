---
id: T1
title: "Define additional-service domain types"
layer: "domain"
deps: []
acs: ["AC-04", "AC-16"]
files_hint: ["src/types/additional-service.ts"]
owner: "TBD lead"
estimate: "L"
status: "todo"
---

# T1 — Define additional-service domain types

## Why

All 19 methods' request/response shapes derive from [contracts/public-api.md](../contracts/public-api.md)
§2/§3 — itself derived from [spec.md §1](../spec.md)'s method table and
[sad.md §4 decision 4](../sad.md) (AC-04's discriminant safety guard).

## What

Create `src/types/additional-service.ts` with every type `contracts/public-api.md` §2/§3 defines:
`PaymentMethod`, `ReturnDestination`, the `CreateReturnPayload` discriminated union (3 variants),
`ReturnAddressOption`, `CheckReturnEditPossiblePayload`/`ReturnEditOption`/`ReturnEditInfo`/
`CheckReturnEditPossibleResult`, `SavedReturnOrder`, `OrderPricingEstimate`, `UpdateReturnPayload`,
`OrderListFilters`, `ReturnOrderListItem`, `ReturnReason`, `ReturnReasonSubtype`,
`CheckRedirectPossiblePayload`/`RedirectPossibility`, `CheckRedirectEditPossiblePayload`,
`CreateRedirectPayload`/`SavedRedirectOrder`, `UpdateRedirectPayload`, `RedirectOrderListItem`,
`WaybillEditPossibility`, `CheckWaybillEditPossiblePayload`, `CreateWaybillEditPayload`/
`SavedWaybillEditOrder`, `ChangeEWOrderListItem`, `DeleteAdditionalServiceOrderPayload`/
`DeletedAdditionalServiceOrder`, `CreateReturnIfPossiblePayload`.

## Definition of Done

- [ ] `src/types/additional-service.ts` compiles with zero `any`.
- [ ] `CreateReturnPayload` is the 3-variant `Destination`-discriminated union (`SenderAddress`/
      `NewAddress`/`NewWarehouse`) per AC-04 — never one flat optional-everything shape.
- [ ] The 6 items `contracts/public-api.md` §10 lists as open (the `ReturnAddressRef` mapping,
      `CheckReturnEditPossiblePayload.Address`'s shape, `CheckRedirectEditPossiblePayload`'s field
      list, both `Update*Payload`'s `Ref` name + response shape, `CreateRedirectPayload.ServiceType`'s
      enum values) are typed defensively (`unknown` / `Record<string, unknown>` / plain `string`) —
      never falsely precise.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Independent of `internet-document`'s types — no cross-module import (`sad.md` §5: `additional-service`
does not call `internet-document` at runtime; `PaymentMethod` is redefined locally, matching the
project's one-folder-per-model boundary).
