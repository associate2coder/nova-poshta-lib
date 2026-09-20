---
id: T5
title: "Unit tests: happy path, filters, full error contract, and overhead benchmark"
layer: "tests"
deps: ["T1", "T3"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-08"]
files_hint: ["test/unit/modules/common.test.ts"]
owner: "<TBD lead>"
estimate: "L"
status: "todo"
---

# T5 — Behavior + error-contract tests for common

## Why

Per CLAUDE.md's test convention, `test/unit/modules/common.test.ts` mocks `fetch` and is the
authoritative suite for this module. Derives from `spec.md` §5 (AC-01/02/03/04/05/08), §6 NFR
rows 2 (error-contract coverage) and 3 (overhead), and
[public-api.md §4](../contracts/public-api.md#4-error-contract).

## What

One test file, `test/unit/modules/common.test.ts`, using `createCommonModule` over a client whose
`fetch` is mocked:

- **Happy path (AC-01):** `getPaymentForms()` returns typed data from a mocked `success: true`
  array response.
- **Filtered happy path (AC-02):** `getCargoDescriptionList({ FindByString: "..." })` and
  `getTimeIntervals({ RecipientCityRef: "..." })` pass the filter object through unmodified as
  `methodProperties` — assert on the mocked `fetch` call body.
- **Error branches (AC-03/04/05/08):** four scenarios — non-array `data`, key-rejected decline,
  other decline, network/transport failure (mock `fetch` rejecting or returning non-JSON) — each
  asserted to throw `NovaPoshtaApiError`.
- **Tolerated per-field noise (AC-03 note):** a record missing a documented field, a `null` field,
  an off-type field, and an extra undocumented field — asserted to NOT throw, response returned
  as-is.
- **Overhead benchmark (§6 NFR row 3):** median library-added overhead ≤5ms across ≥30 repeated
  calls with `fetch` stubbed to near-zero latency.

## Definition of Done

- [ ] All bullets above have a passing assertion in `test/unit/modules/common.test.ts`.
- [ ] 100% of the four error branches throw `NovaPoshtaApiError`; 0% of the per-field-noise cases
      throw.
- [ ] Overhead benchmark asserts median ≤5ms.
- [ ] lint + vet clean; suite runs in CI (no network).

## Notes

Reuses T1's array-shape check (already unit-tested at the client level in
`test/unit/client.test.ts`) — this file re-asserts it through the module's public surface, not
the check's internals.
