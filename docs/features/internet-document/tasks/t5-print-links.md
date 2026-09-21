---
id: T5
title: "Implement printDocument and printMarkings via a construct-then-verify helper"
layer: "app"
deps: ["T1"]
acs: ["AC-11", "AC-12", "AC-13"]
files_hint: ["src/modules/internet-document/index.ts"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T5 — Implement printDocument and printMarkings via a construct-then-verify helper

## Why

Derives from [contracts/public-api.md §3.7](../contracts/public-api.md), [sad.md §6 Flow
3](../sad.md), and [ADR-0003](../adr/0003-construct-then-verify-print-links.md) — the only flow in
this entire library that never touches the shared core client, and the only return value that isn't
JSON data at all.

## What

In `src/modules/internet-document/index.ts`, a private `buildAndVerifyPrintLink(typePrint, payload)`
helper:
- Builds the print URL per the documented pattern — embeds every submitted `Documents` Ref and the
  caller's own `apiKey` (confirmed shape, `contracts/public-api.md` §3.7).
- Issues one `fetch` call against that exact URL to verify it resolves before returning it — never
  through `NovaPoshtaClient.request()`'s JSON-envelope unwrap (`spec.md` §1 decision override).
- On a non-ok response, a timeout, or an empty `Documents` array, throws `NovaPoshtaApiError` — never
  returns an empty string or an unverified link (a deliberate divergence from the community SDK's own
  `getPrintLink()`, which returns `''` on an empty ref list; this module never does that).

`printDocument(payload)` and `printMarkings(payload)` each call the helper with their own
`typePrint` value and return the verified URL string.

## Definition of Done

- [ ] `printDocument` has a mocked-`fetch` unit test for the success path (resolves the URL string,
      the mock asserts the constructed URL contains every submitted Ref and the caller's `apiKey`).
- [ ] `printDocument` has a mocked-`fetch`-failure test (non-ok response) asserting it throws
      `NovaPoshtaApiError`, never resolving an empty or partial link.
- [ ] `printMarkings` has the same two tests.
- [ ] A test asserts neither method ever calls `client.request()` (spy/mock on the core client
      confirming zero invocations from this code path).
- [ ] lint + `tsc --noEmit` clean.

## Notes

Shares `src/modules/internet-document/index.ts` with T2/T3/T4 — `implement` serializes this lane via
the overlapping `files_hint`. The returned link is credential-bearing (AC-13) — this task's DoD does
not include any redaction/scoping/expiry logic (`spec.md` §3 non-goal); that documentation
responsibility belongs to T9 (README).
