---
id: T1
title: "Define tracking-document domain types"
layer: "domain"
deps: []
acs: ["AC-07"]
files_hint: ["src/types/tracking-document.ts"]
owner: "<TBD lead>"
estimate: "M"
status: "todo"
---

# T1 — Define tracking-document domain types

## Why

The request/response shapes derive from [contracts/public-api.md §2](../contracts/public-api.md)
(sourced from two independently re-fetched SDKs, field-origins table in
[contracts/api-sync-report.md](../contracts/api-sync-report.md)) and [ADR-0001](../adr/0001-name-the-response-type-trackingstatus-distinct-from-commons-documentstatus.md)
(the `TrackingStatus` name). `AC-07` (forward-compatible typing) rests on `StatusCode` staying a
plain `number` and every field being preserved, never coerced.

## What

Create `src/types/tracking-document.ts`, mirroring the `src/types/<domain>.ts`-per-model convention:

- `TrackingDocumentFilter` — `{ DocumentNumber: string; Phone: string }`.
- `GetStatusDocumentsPayload` — `{ Documents: TrackingDocumentFilter[] }`.
- `TrackingStatus` — the full 118-field union from `public-api.md` §2 (not the 103-field
  intersection): every field typed exhaustively, `StatusCode: number`, and the 5 disputed fields
  (`AviaDelivery`, `CargoReturnRefusal`, `PostomatV3CellReservationNumber`, `Redelivery`,
  `SecurePayment`) as `boolean | string`, matching the two source SDKs' disagreement.
- `TRACKING_STATUS_CODES` — the 21-value documentation-only const map (`public-api.md` §2), never
  used to narrow or validate `StatusCode` at runtime.

## Definition of Done

- [ ] `src/types/tracking-document.ts` exports all four symbols above, matching `public-api.md` §2
      field-for-field.
- [ ] `TrackingStatus` has 118 fields; zero `any` anywhere in the file.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

The 118-field count (not the spec's earlier, corrected "91 fields" estimate) is the source of this
feature's flagged sizing risk (`sad.md` §11) — type every field, don't trim back to the ~12-field
PII subset the spec quotes for readability.
