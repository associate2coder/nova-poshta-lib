---
id: T4
title: "Wire tracking-document module into the public package surface"
layer: "wiring"
deps: ["T2", "T3"]
acs: []
files_hint: ["src/index.ts"]
owner: "<TBD lead>"
estimate: "XS"
status: "todo"
---

# T4 — Wire tracking-document module into the public package surface

## Why

`tsup`'s existing dual ESM+CJS build already emits matching `.d.ts`/`.d.cts` declarations for
whatever `src/index.ts` re-exports ([sad §5](../sad.md)) — no new build step needed, matching every
sibling module's precedent.

## What

In `src/index.ts`, re-export:

- `createTrackingDocumentModule` and `TrackingDocumentModule` from
  `./modules/tracking-document/index.js`.
- Every type from `./types/tracking-document.js` (`TrackingDocumentFilter`,
  `GetStatusDocumentsPayload`, `TrackingStatus`, `TRACKING_STATUS_CODES`).

## Definition of Done

- [ ] `npm run build` succeeds.
- [ ] `dist/index.d.ts` and `dist/index.d.cts` both declare `createTrackingDocumentModule`.
- [ ] lint + vet clean.

## Notes

None — a pure re-export, no new logic.
