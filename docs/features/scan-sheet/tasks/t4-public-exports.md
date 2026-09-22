---
id: T4
title: "Wire scan-sheet module into the public package surface"
layer: "wiring"
deps: ["T2", "T3"]
acs: []
files_hint: ["src/index.ts"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T4 — Wire scan-sheet module into the public package surface

## Why

Every prior module ([sad.md §5](../sad.md)) is re-exported from `src/index.ts`; `tsup`'s existing
dual ESM+CJS build already emits matching `.d.ts`/`.d.cts` declarations for whatever it re-exports.

## What

Add to `src/index.ts`:
- `createScanSheetModule`
- `ScanSheetModule` (the factory's return type)
- every type from `src/types/scan-sheet.ts`

## Definition of Done

- [ ] `npm run build` succeeds.
- [ ] `dist/index.d.ts` and `dist/index.d.cts` both include `createScanSheetModule` and every
      exported `scan-sheet` type.
- [ ] lint + vet clean.

## Notes

No new build step — same re-export pattern the five existing modules already use.
