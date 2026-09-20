---
id: T8
title: "Unit test suite for counterparty"
layer: "tests"
deps: ["T7"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09", "AC-10", "AC-11", "AC-12", "AC-13", "AC-14", "AC-15", "AC-16", "AC-17"]
files_hint: ["test/unit/modules/counterparty.test.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T8 — Unit test suite for counterparty

## Why

Consolidates and completes the mocked-`fetch` coverage against `spec.md`'s full AC table
(§5 AC-01..AC-17) and the Test plan's AC-coverage table, matching `address`'s
`test/unit/modules/address.test.ts` convention (`docs/adr/0003-testing-strategy.md`). Several ACs
have no dedicated test yet after T2–T7 (the shared error-contract branches AC-14/AC-15/AC-16, the
no-cross-context-enforcement check AC-13, the authoritative-Ref check AC-12, and the NFR overhead
benchmark) — this task is where those land, alongside re-asserting everything T2–T6 already covered
in one place per `address`'s own precedent.

## What

In `test/unit/modules/counterparty.test.ts`:
- Every AC-01..AC-11 already exercised in T2–T6, re-asserted here as the canonical suite.
- AC-12: the same lookup called twice issues two independent requests — nothing cached or invented
  locally.
- AC-13: updating/deleting a counterparty issues no additional call to check or affect its contact
  persons or `address`'s saved-address records — exactly one call recorded for the write itself.
- AC-14: a non-authorization decline, or a successful envelope whose `data` isn't array-shaped, throws
  `NovaPoshtaApiError`.
- AC-15: a write outside the caller's scope, an invalid/expired key, or a disallowed key type for a
  contact-person op, is denied with the same standard error, message passed through as-is.
- AC-16: a timeout, dropped connection, or non-JSON response throws the standard error.
- AC-17: (contract-level, see T9 — not duplicated here, referenced for completeness).
- NFR (`spec.md` §6 row 4): median library-added overhead ≤5ms across ≥30 repeated calls to
  `getCounterparties`, with `fetch` stubbed to near-zero latency.

## Definition of Done

- [ ] `npm test` passes with every AC-01..AC-17 covered by a named or tagged test.
- [ ] The shared error-contract block (AC-14/AC-15/AC-16) is asserted once and applies uniformly
      across lookups and both write families.
- [ ] AC-13's no-cross-context-enforcement check passes (no extra calls beyond the write itself).
- [ ] The ≤5ms median overhead benchmark passes in CI.
- [ ] lint clean.

## Notes

This task is the safety net, not a replacement for T2–T6's own tests — if a T2–T6 test already covers
an AC, this task should reuse or extend it rather than duplicate the fixture from scratch.
