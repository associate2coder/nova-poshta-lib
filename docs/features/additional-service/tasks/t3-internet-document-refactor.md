---
id: T3
title: "Refactor internet-document onto the shared requestFirst<T>()"
layer: "app"
deps: ["T2"]
acs: []
files_hint: ["src/modules/internet-document/index.ts"]
owner: "TBD lead"
estimate: "S"
status: "todo"
---

# T3 — Refactor `internet-document` onto the shared `requestFirst<T>()`

## Why

[ADR-0002](../adr/0002-promote-firstorthrow-into-the-core-client-as-requestfirst.md): reusing
`internet-document`'s private `firstOrThrow` as-is would couple two modules that must stay independent;
duplicating it inside `additional-service` would leave the same logic maintained twice. Promoting it to
the shared client (T2) and refactoring this one caller collapses both into one implementation.

## What

Remove `internet-document`'s private `firstOrThrow()` helper; `getDocumentPrice` and
`getDocumentDeliveryDate` call `client.requestFirst<T>()` instead.

## Definition of Done

- [ ] `internet-document`'s existing unit suite (`test/unit/modules/internet-document.test.ts`) passes
      unmodified in behavior — same call sites, same thrown-error message shape; only the import
      source changes (`sad.md` §11 last row).
- [ ] No other file in `internet-document` changes.
- [ ] `tsc --noEmit` and `npm run lint` pass.

## Notes

Behavior-preserving extraction, not a new feature — `internet-document`'s test suite is the regression
check and must stay green without modification.
