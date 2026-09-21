---
status: Draft
owner: "QA + implementing engineer"
reviewers: ["Tech Lead"]
updated_at: "2026-09-21"
feature_size: "M"
---

# Test plan — internet-document

`internet-document` gives every consuming developer typed, discoverable access to all 8 documented
InternetDocument methods (create, price/date calculators, update, delete, list, and the two
print-link methods) and must raise `NovaPoshtaApiError` on every decline, malformed response, or
network failure — this plan maps every `spec.md` §5 acceptance criterion to a named test so
`implement` writes the red tests against a fixed map, not "however it seems".

## Levels

| Level | Scope | Strategy (generic — no tool names) |
|---|---|---|
| Unit | Pure logic and mocked-fetch behavior: request shaping, envelope unwrap, error mapping, the discriminated-payload type check, the print methods' construct-then-verify helper. | In-memory; `fetch` mocked/stubbed, no network. Mirrors `test/unit/modules/` and `test/unit/types/` (type-level tests) already used by `address`/`counterparty`. |
| Integration | The module against the real Nova Poshta InternetDocument API. | Opt-in only: skipped automatically when `NOVA_POSHTA_TEST_API_KEY` is absent (per `CLAUDE.md`), matching `test/integration/counterparty.test.ts`'s precedent. No mocking of the datastore-equivalent (the live API) when this tier does run. |
| Contract | The boundary between the *published* package output (ESM + CJS `.d.ts`/`.d.cts`) and the developers who import it. | Import the built package (not the source) in both module formats and type-check the method surface against the documented 8-method list (AC-19) — a new tier for this feature; no equivalent exists yet in `address`/`counterparty`. |
| E2E | N/A for this feature. | <!-- N/A: library-sdk surface has no end-to-end user flow beyond a sequence of typed calls, each already exercised at unit/integration level; no UI, no orchestrated multi-service flow of our own to drive end to end. --> |
| Load | NFR validation — only when an NFR carries a number. | The load tool already in your repo, or e.g. k6 or Locust, run against all 8 methods with `fetch` stubbed to near-zero latency (repo convention: benchmarked inside `test/unit/modules/internet-document`, always runs in CI). |

<!-- No UI surface declared (sad.md target_surfaces: ["library-sdk"]) — Component / Visual-regression / E2E-through-UI rows dropped entirely. -->

## AC coverage

| AC (spec.md §5) | Test name (intent-based) | Level | Expected outcome |
|---|---|---|---|
| AC-01 — save happy path | `save` with valid Refs returns the created waybill's Ref and IntDocNumber | unit + integration | Waybill recorded; caller receives its `Ref`/`IntDocNumber` |
| AC-02 — discriminated payload compiles | `save`/`update` payload requires exactly the fields its `ServiceType`×`CargoType` combination needs, and rejects a mixed-combination payload | unit (type-level test) | Correct combination compiles; a payload mixing fields from a different combination fails to compile |
| AC-03 — price calculator happy path | `getDocumentPrice` returns Nova Poshta's calculated price unchanged, with no link to a later `save` | unit + integration | Typed price returned; no recalculation, no stored linkage |
| AC-04 — delivery-date calculator happy path | `getDocumentDeliveryDate` returns Nova Poshta's calculated date unchanged | unit + integration | Typed date returned; same no-linkage behavior as AC-03 |
| AC-05 — save/update success with empty data | `save`/`update` returns `undefined` when Nova Poshta reports success with an empty data list | unit | Represented as a successful write with no record — not a thrown error |
| AC-06 — update clears an omitted backward-delivery instruction | `update` without a previously-set cash-on-delivery instruction clears it | unit + integration | The instruction is cleared, matching every other omitted field under the full-replace convention |
| AC-07 — batch delete happy path | `delete` with one or more Refs returns one outcome entry per submitted Ref, including a single-Ref call | unit + integration | Every submitted Ref appears in the result array, each marked removed |
| AC-08 — batch delete partial rejection | `delete` where Nova Poshta's response confirms only some submitted Refs represents each Ref's own outcome and reason | unit | Per-Ref array with `Removed:false` + reason for the rejected Ref(s); no collapsed boolean; no thrown error for the partial rejection |
| AC-09 — unfiltered list happy path | `getDocumentList` with no filters returns the typed page of results | unit + integration | Call succeeds with all filter fields optional at the type level; no auto-paging, no injected default |
| AC-10 — filtered list happy path | `getDocumentList` with a documented filter (e.g. date range) passes it through and returns the typed, unfiltered-equivalent shape | unit + integration | Exactly Nova Poshta's filtered response, no client-side re-filtering |
| AC-11 — printDocument happy path | `printDocument` for one or more Refs returns a single verified URL string, never through the JSON-envelope path | unit + integration | One URL string covering all requested waybills; construct-then-verify check passes |
| AC-12 — printMarkings happy path | `printMarkings` for one or more Refs returns a single verified URL string for the label | unit + integration | Same contract as AC-11, for the label |
| AC-13 — print link is not redacted or scoped | The URL `printDocument`/`printMarkings` return is the constructed link unmodified — no redaction, scoping, or expiry applied | unit | Returned string matches the constructed URL exactly; documented as credential-bearing in the public API surface |
| AC-14 — decline or malformed-shape error | Any method throws `NovaPoshtaApiError` when Nova Poshta declines the request or returns data that doesn't match the documented shape | unit | `NovaPoshtaApiError` thrown, carrying Nova Poshta's own message where given |
| AC-15 — authorization denial | Any write/list method or an invalid/expired API key against a Ref not owned by the caller throws `NovaPoshtaApiError`, with no local ownership check performed | unit | `NovaPoshtaApiError` thrown; the operation is not performed or revealed |
| AC-16 — network/transport failure | Any method throws `NovaPoshtaApiError` on a timeout, dropped connection, or non-JSON response | unit | `NovaPoshtaApiError` thrown rather than an unhandled failure or an empty-looking success |
| AC-17 — authoritative Ref/IntDocNumber passthrough | The `Ref`/`IntDocNumber` a successful write returns is exactly what Nova Poshta sent back, never invented or cached locally | unit | Returned value equals the mocked live response's value bit-for-bit; no successful write ever returns a value the library invented |
| AC-18 — no local Ref validation | A sender/recipient/contact-person/location Ref supplied to any method is passed through as a plain string with no local validity/ownership check | unit | A syntactically-arbitrary Ref string reaches the outgoing request unchanged; only a mocked Nova Poshta decline (AC-14) rejects it — the library itself performs no check |
| AC-19 — published-build method-surface completeness | All 8 in-scope methods are importable and correctly typed from the built ESM and CJS package output | contract | Post-build step type-checks all 8 methods present and typed in both `.d.ts` and `.d.cts`; fails the build if any method is missing or `any`-typed |

## Edge cases / error paths

- Missing required field for the chosen `ServiceType`/`CargoType` combination on `save`/`update` → expected: compile-time failure (AC-02), never a runtime call.
- `delete` called with zero Refs → expected: `NovaPoshtaApiError` (Nova Poshta's own decline on an empty batch), per AC-14 — not a client-side pre-check.
- `getDocumentList` called with no filters at all when Nova Poshta's endpoint itself rejects an empty query → expected: `NovaPoshtaApiError` (AC-09's own noted fallback), not a compile-time restriction.
- `printDocument`/`printMarkings` requested for a Ref whose document Nova Poshta hasn't finished materializing yet → expected: `NovaPoshtaApiError` from the construct-then-verify check (AC-11/AC-12), never a link that resolves to a blank/error page.
- Network failure specifically during the print methods' verification fetch (distinct from the JSON-enveloped methods' failure path) → expected: `NovaPoshtaApiError` (AC-16), confirming the non-JSON code path fails the same way as the enveloped one.
- API key valid for authentication but the call targets a Ref belonging to a different account (cross-account write/list) → expected: `NovaPoshtaApiError` passing through Nova Poshta's own denial message (AC-15), with no independent ownership check performed by the library (AC-18).
- Malformed (non-array-shaped) success response on any of the 6 JSON-enveloped methods → expected: `NovaPoshtaApiError` (AC-14), distinguished from the legitimate empty-array success case (AC-05).

## Test data

- Seed strategy: no `data-model.md` schema exists for this feature (stateless library, no persistence) — test data is inline request/response fixtures per test file, one fixture set per delivery-method/cargo-type combination needed to exercise AC-02's discriminant, matching the fixture style already used in `test/unit/modules/counterparty.test.ts` and `test/unit/modules/address.test.ts`.
- Integration dependency: the real Nova Poshta API itself (no local throwaway dependency to seed — this library owns no datastore of its own); the integration suite creates and then deletes its own waybill(s) via the real `save`/`delete` calls so it leaves no live waybill behind under `NOVA_POSHTA_TEST_API_KEY`'s account.
- Cleanup boundary: per-test for the integration suite — every `save` performed by a test is followed by a `delete` of the same Ref in that same test's teardown, regardless of assertion outcome, so a failed assertion never leaves a live waybill orphaned under the test account.

## NFR validation (load)

- NFR: Library-added overhead per call, median ≤ 5ms (`spec.md` §6, `fetch` stubbed to near-zero latency) → scenario: call each of the 8 in-scope methods (a representative single-waybill payload, not a batch or a full list page) ≥30 times with `fetch` stubbed to near-zero latency, assert the median total call time (typed call → resolved promise) is ≤ 5ms per method, benchmarked inside `test/unit/modules/internet-document` and always run in CI.

## CI placement

- On every PR: unit (all 19 AC rows above, including the type-level test for AC-02 and the load benchmark) and contract (AC-19's published-build check, run post-build).
- On schedule / pre-release: integration (the opt-in suite against the real API, gated on `NOVA_POSHTA_TEST_API_KEY` being present in that environment) — matches `counterparty`'s existing integration-suite placement.
