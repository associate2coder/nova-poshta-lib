---
id: T5
title: "Unit test suite for tracking-document"
layer: "tests"
deps: ["T4"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09", "AC-10", "AC-11"]
files_hint: ["test/unit/modules/tracking-document.test.ts"]
owner: "<TBD lead>"
estimate: "L"
status: "todo"
---

# T5 — Unit test suite for tracking-document

## Why

The full AC coverage table lives in [spec.md's Test plan](../spec.md) — 11 ACs, all unit-level with
mocked `fetch`, matching `docs/adr/0003-testing-strategy.md`. `spec.md` §6 NFR "Error-contract
coverage" and "Match-by-identity guard" are both verified here.

## What

Create `test/unit/modules/tracking-document.test.ts` mocking `fetch`, covering:

- AC-01/AC-02/AC-03: happy path, phone passthrough, multi-waybill single-call passthrough.
- AC-04: `getDocumentStatus`'s 0/1/>1-match branches (from T3).
- AC-05: a short/reordered/longer-than-requested response resolves by `Number`, not position.
- AC-06: `StatusCode` 2/3 resolves normally, no exception.
- AC-07: an unrecognized `StatusCode`/description round-trips unchanged.
- AC-08/AC-09/AC-10: a declined call, a non-array response, and a network/transport failure each
  throw `NovaPoshtaApiError`.
- AC-11: request body and behavior are identical regardless of any `internet-document` state
  (asserted by the absence of any cross-module call, not a runtime check).
- The §6 NFR overhead benchmark: median library-added overhead ≤5ms across ≥30 stubbed
  single-waybill calls (`fetch` stubbed to near-zero latency).

## Definition of Done

- [ ] `npm test` passes with every AC-01..AC-11 covered by a named/tagged test.
- [ ] The ≤5ms median overhead benchmark runs and asserts in CI (always-on, per `spec.md`'s Test
      plan, not gated on a live key).
- [ ] lint + vet clean.

## Notes

Fixtures for AC-05/AC-07 (reordered/short response, unrecognized status code) should be built
inline per `spec.md`'s Test data section — no seed strategy, no local entities.
