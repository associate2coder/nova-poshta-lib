---
id: T15
title: "Unit test suite for additional-service's shared error contract"
layer: "tests"
deps: ["T14"]
acs: ["AC-01","AC-02","AC-03","AC-04","AC-05","AC-06","AC-07","AC-08","AC-09","AC-10","AC-11","AC-12","AC-13","AC-14","AC-15","AC-16","AC-17","AC-18","AC-19","AC-20","AC-21","AC-22","AC-23"]
files_hint: ["test/unit/modules/additional-service.test.ts"]
owner: "TBD lead"
estimate: "L"
status: "todo"
---

# T15 — Unit test suite for `additional-service`'s shared error contract

## Why

[spec.md §6 NFR "Error-contract coverage"](../spec.md), [contracts/public-api.md §6](../contracts/public-api.md)
(the error contract every one of the 19 methods shares).

## What

A shared error-contract fixture (network failure, envelope-level decline, malformed `data`) exercised
across all 19 methods, reusing the fixture pattern every sibling module's suite already establishes
(`sad.md` §10). Plus the `OnlyGetPricing: "1"` isolation check and the ≤5ms overhead benchmark.

## Definition of Done

- [ ] `npm test` passes with every AC-01..AC-23 covered by a named/tagged test.
- [ ] The shared error-contract fixture (AC-21/AC-22/AC-23) runs against all 19 methods with `fetch`
      mocked.
- [ ] `calculateReturn`/`calculateRedirect` both have the `OnlyGetPricing: "1"` isolation check (spec.md
      §6 NFR "Calculate/create isolation").
- [ ] The ≤5ms-median-overhead benchmark runs across the 18 raw methods (≥30 repeated calls each,
      `fetch` stubbed to near-zero latency) — `createReturnIfPossible` excluded by design.
- [ ] A static check (public-API surface review) confirms 0 public method signatures accept
      `OrderType`/`OnlyGetPricing` as a caller-settable field.

## Notes

This is the comprehensive suite — individual T4–T13 tasks already cover their own happy/decline paths;
this task's job is the *shared* cross-cutting checks (error contract, isolation, overhead, discriminant
safety) that only make sense once every method exists.
