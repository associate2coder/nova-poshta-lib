---
id: T7
title: "Opt-in integration smoke test"
layer: "tests"
deps: ["T4"]
acs: ["AC-01"]
files_hint: ["test/integration/tracking-document.test.ts"]
owner: "<TBD lead>"
estimate: "S"
status: "todo"
---

# T7 — Opt-in integration smoke test

## Why

`spec.md`'s Test plan calls for one opt-in real-API smoke test against a single known waybill,
matching `test/integration/`'s existing convention (`internet-document.test.ts`,
`counterparty.test.ts`) — never blocks CI without a key configured.

## What

Create `test/integration/tracking-document.test.ts`:

- Reads `NOVA_POSHTA_TEST_API_KEY` and a second env var, `NOVA_POSHTA_TEST_WAYBILL`, for the known
  waybill number to track (`spec.md`'s Test data section — never hardcode a real waybill number
  into the test file).
- `describe.skipIf(!apiKey || !waybill)(...)` wraps the suite, same opt-in pattern as the existing
  integration tests.
- Calls `getStatusDocuments` (or `getDocumentStatus`) for that one waybill and asserts a typed
  record comes back with `Number`/`Status`/`StatusCode` present.

## Definition of Done

- [ ] Test is skipped (not failing) when either env var is absent.
- [ ] Test passes against a real key + waybill when both are supplied locally.
- [ ] lint + vet clean.

## Notes

Not wired into any CI job that lacks the key (per `spec.md`'s CI placement note) — runs manually or
on a schedule wherever both env vars are configured.
