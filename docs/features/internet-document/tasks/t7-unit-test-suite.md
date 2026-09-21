---
id: T7
title: "Unit test suite for internet-document"
layer: "tests"
deps: ["T6"]
acs: [
  "AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09", "AC-10",
  "AC-11", "AC-12", "AC-13", "AC-14", "AC-15", "AC-16", "AC-17", "AC-18"
]
files_hint: ["test/unit/modules/internet-document.test.ts"]
owner: "associate2coder"
estimate: "L"
status: "todo"
---

# T7 — Unit test suite for internet-document

## Why

Closes the coverage gap T2–T6's per-task tests leave open: the shared error contract
(AC-14/AC-15/AC-16) exercised uniformly across all 8 methods, and the library-wide NFR benchmark
(`spec.md` §6, "Library-added overhead per call"), per
[docs/adr/0003-testing-strategy.md](../../../adr/0003-testing-strategy.md).

## What

In `test/unit/modules/internet-document.test.ts`, with `fetch` mocked (no network):
- A parameterized/shared block asserting all 8 methods throw `NovaPoshtaApiError` on: a network/
  transport failure (AC-16), a declined call (AC-14), and an invalid/expired API key (AC-15) — the
  print methods' equivalent failure is the construct-then-verify check failing (already covered by
  T5's own tests; referenced here, not duplicated).
- A benchmark asserting median overhead ≤5ms across all 8 methods (`fetch` stubbed to near-zero
  latency), ≥30 repeated calls per method, using a representative single-waybill payload.
- A test confirming no InternetDocument method ever imports or calls into `address`/`counterparty`
  (AC-18) and that every `Ref`/`IntDocNumber` returned is read fresh from the mocked response, never
  cached across calls (AC-17).
- Cross-references (not re-implements) the per-method happy/empty/reconciliation tests already
  written in T2–T5.

## Definition of Done

- [ ] `npm test` passes with every AC-01..AC-18 covered by a named/tagged test.
- [ ] The shared error-contract block runs against all 8 methods, not a subset.
- [ ] The ≤5ms benchmark passes and covers all 8 methods.
- [ ] lint clean.

## Notes

AC-19 (published-build type-surface) is intentionally **not** in this task's `acs` — it is T8's own
scope (built-output check, not a mocked-`fetch` unit test).
