---
id: T2
title: "Add requestFirst<T>() and info exposure to the core client"
layer: "infra"
deps: []
acs: []
files_hint: ["src/client.ts", "test/unit/client.test.ts"]
owner: "TBD lead"
estimate: "S"
status: "todo"
---

# T2 — Add `requestFirst<T>()` and `info` exposure to the core client

## Why

[ADR-0001](../adr/0001-expose-the-envelopes-info-field-via-requestenvelope.md) and
[ADR-0002](../adr/0002-promote-firstorthrow-into-the-core-client-as-requestfirst.md) — both are
additive changes to `src/client.ts`, inherited by every module (`sad.md` §4 decisions 2–3, §5).

## What

- `NovaPoshtaClient.requestFirst<T>(modelName, calledMethod, methodProperties?)` — resolves
  `request()`'s array, returns its first element, throws `NovaPoshtaApiError` if the array is empty
  (same message convention `internet-document`'s current private `firstOrThrow` uses).
- `NovaPoshtaSuccessEnvelope<T>` gains an optional `info?: unknown` field, populated from the wire
  envelope's own `info` (already typed on `NovaPoshtaEnvelope<T>` in `src/types/envelope.ts`, just not
  surfaced past `requestEnvelope()` until now).

## Definition of Done

- [ ] `requestFirst<T>()` has a unit test for the non-empty-array case (resolves the first record) and
      the empty-array case (throws `NovaPoshtaApiError`).
- [ ] `requestEnvelope()` has a unit test asserting `info` passes through unmodified when the wire
      envelope includes one, and is `undefined` when it doesn't.
- [ ] `request()`'s and `requestEnvelope()`'s existing behavior and existing tests are unchanged.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Purely additive — no existing caller's code changes as a result of this task alone. T3 is the task that
migrates `internet-document` onto `requestFirst<T>()`.
