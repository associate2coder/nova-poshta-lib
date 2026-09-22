---
id: T1
title: "Define scan-sheet domain types"
layer: "domain"
deps: []
acs: []
files_hint: ["src/types/scan-sheet.ts"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T1 — Define scan-sheet domain types

## Why

The request/response shapes derive from [spec.md §1](../spec.md)'s quoted `InsertDocumentsItem` /
`RemoveDocumentsItem` / `DeleteScanSheetItem` / `GetScanSheetItem` / `GetScanSheetListItem` structs,
and [sad.md §5](../sad.md) fixes the exact type names and the inlined-`string` convention for every
`Ref`/`DocumentRefs`/`ScanSheetRefs`/`CounterpartyRef` field (no shared alias imported from
`internet-document`).

## What

Create `src/types/scan-sheet.ts`, mirroring the `src/types/<domain>.ts`-per-model convention:

- `InsertDocumentsPayload` (`{ DocumentRefs: string[]; Ref?: string; Date: string }`) and
  `InsertDocumentsItem` (`{ Ref: string; Number: string; Date: string; Errors: string[] }`).
- `GetScanSheetPayload` (`{ Ref?: string; CounterpartyRef?: string }`) and `ScanSheetDetail` — sender
  identity/address + waybill count (sad.md §4 decision 4).
- `ScanSheetListItem` — `Ref`/`Number`/creation `DateTime`/`Printed`, no sender fields (sad.md §4
  decision 4 — never merged into `ScanSheetDetail`).
- `DeleteScanSheetPayload` (`{ ScanSheetRefs: string[] }`) and `DeleteScanSheetItem` (`{ Ref: string;
  Number: string; Error: string }`).
- `RemoveDocumentsPayload` (`{ DocumentRefs: string[]; Ref: string }`) and `RemoveDocumentsItem`
  (`{ Ref: string; Number: string; Error: string }`).

`Count`/`DateTime`/`Date`/`Printed` stay raw, unparsed `string`s (sad.md §4 decision 6) — no
client-side coercion to `number`/`Date`/`boolean`.

## Definition of Done

- [ ] `src/types/scan-sheet.ts` exports all symbols above, matching `spec.md` §1 field-for-field.
- [ ] Zero `any` anywhere in the file; no `Ref` alias imported from `internet-document`.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

The two response types (`ScanSheetDetail` vs `ScanSheetListItem`) must stay distinct, not merged
with optional fields — the two calls return genuinely different field sets (sad.md §4 decision 4).
