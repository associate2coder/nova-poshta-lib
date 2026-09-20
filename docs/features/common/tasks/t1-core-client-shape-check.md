---
id: T1
title: "Rename envelope types out of common.ts; add the array-shape check to the core client"
layer: "infra"
deps: []
acs: ["AC-03"]
files_hint: ["src/types/common.ts", "src/types/envelope.ts", "src/client.ts", "src/index.ts", "test/unit/client.test.ts"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T1 — Rename envelope types out of common.ts; add the array-shape check to the core client

## Why

`sad.md` §2 ("Naming fix") requires renaming today's `src/types/common.ts` (shared envelope types)
to `src/types/envelope.ts` before this feature's own reference-list types can claim that filename.
[ADR-0001](../adr/0001-array-shape-only-validation.md) requires the core client to fail loudly when
`data` isn't array-shaped ([spec AC-03](../spec.md)), implemented once so every future module
inherits the guard.

## What

- Move `src/types/common.ts` → `src/types/envelope.ts` (no content change).
- Update the two importers (`src/client.ts`, `src/index.ts`) to import from `./types/envelope.js`.
- In `src/client.ts`, after unwrapping `envelope.data`, add a structural check that `data` is an
  array; on failure throw `NovaPoshtaApiError` with a library-written message (no per-field checks —
  ADR-0001).

## Definition of Done

- [ ] `test/unit/client.test.ts` (new) mocks `fetch` and asserts: a `success: true` response whose
      `data` is not an array throws `NovaPoshtaApiError`; a `success: true` response whose `data` is
      an array (even with sparse/off-shape records) does not throw.
- [ ] `src/client.ts` / `src/index.ts` compile against `src/types/envelope.ts`; no remaining
      reference to `src/types/common.ts` as the envelope source.
- [ ] lint + vet clean.

## Notes

Shares `src/client.ts`/`src/index.ts` with T4's later edits, but T4 only adds new exports — no
overlap in the lines touched. `src/types/common.ts` is freed here for T2 to repopulate with the
15 reference-list interfaces.
