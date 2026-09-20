---
id: T8
title: "Unit test suite for address"
layer: "tests"
deps: ["T7"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09", "AC-10", "AC-11"]
files_hint: ["test/unit/modules/address.test.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T8 — Unit test suite for `address`

## Why

Consolidates and completes the per-task tests from T2–T6 into one suite covering every error branch
from [sad.md §6 Flow 1 and Flow 2](../sad.md) and every AC in
[contracts/public-api.md §5](../contracts/public-api.md), mocking `fetch` per
`docs/adr/0003-testing-strategy.md` and `CLAUDE.md`'s test conventions — no network calls.

## What

`test/unit/modules/address.test.ts`, mirroring `test/unit/modules/common.test.ts`'s structure:
- One happy-path test per lookup + write + `findCityByName` (AC-01, AC-02, AC-04, AC-06, AC-11).
- The AC-03 wrapper-shape test (already drafted in T4, consolidated here).
- The AC-07 empty-on-success test for `save`/`update`/`delete` (already drafted in T5).
- One shared error-contract block: network failure (AC-10), declined response (AC-08), declined for
  authorization/bad key (AC-09), non-array-shaped success response — all asserting
  `NovaPoshtaApiError` is thrown with the expected `errors`/`errorCodes`/`warnings`.
- The per-call overhead benchmark from `spec.md` §6 NFR row 4 (median ≤5ms beyond the network round
  trip, `fetch` stubbed to near-zero latency).

## Definition of Done

- [ ] `npm test` passes with 100% of in-scope methods covered by both a happy-path and (where
      applicable) an error-path test.
- [ ] Every AC-01..AC-11 has ≥1 corresponding test, named or comment-tagged with its AC id.
- [ ] The overhead benchmark runs in CI and asserts the ≤5ms median target.
- [ ] lint clean.

## Notes

This task consolidates tests already required as part of T2–T6's own DoDs — if those land with
their own local test files, this task's job is to fold them into the one canonical suite file and
add the cross-cutting error-contract + benchmark tests that don't belong to any single method.
