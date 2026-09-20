---
status: Draft
owner: "associate2coder"
reviewers: []
updated_at: "2026-09-20"
feature_size: "S"
---

# Spec — common

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** `docs/architecture-map.md`, `docs/adr/0002-modular-domain-layout-dual-build.md`, `docs/adr/0003-testing-strategy.md` — no reference module exists yet ('common' is the first domain module built); no ticket/Confluence/knowledge-base channel available.

## 1. Context

Consuming developers building requests against other parts of the Nova Poshta API regularly need valid values for shared reference fields — payment forms, cargo types, ownership forms, pallets, time intervals, and similar — but today nothing in this library exposes them: a consuming developer's only options are to consult Nova Poshta's raw documentation and hardcode values, or make an untyped call through the core client and hope the shape holds.

This module is being built now because the library's foundation was just scaffolded, and `common` is deliberately the first domain module: other domain modules the library will eventually expose (e.g. building a shipment waybill) need valid values for fields like `PayerType` and `OwnershipForm` that only `common`'s reference lists can supply — shipping it first avoids every later module inventing its own ad hoc handling of these shared values.

The committed approach is to ship one typed method per documented Nova Poshta reference list, each accepting that method's documented optional filters, with every reference value's type treated as provisional against Nova Poshta's live data rather than a closed/frozen enum. This is grounded in two upstream findings: the research pass found no precedent among comparable typed API-client libraries for keeping a live-fetched (not build-time-generated) reference list from going stale the moment the upstream API adds a value; and the failure-mode pass's sharpest finding is that a response cast to its declared type with no runtime check would silently produce typed-but-wrong data — the acceptance criteria below instead require an error in that case, in service of the "zero silent failures" success bar.

Nova Poshta's written documentation is the starting point for each list's shape, but where the live API disagrees with the docs, the live API wins — types are derived from what the live API actually returns (verified via the integration suite against the real endpoint), consistent with treating reference values as provisional against live data rather than a frozen source.

### In-scope reference lists (as of 2026-09-20)

Cross-checked against Nova Poshta's `Common`-model API surface via community SDK sources (Nova Poshta's own documentation portal blocks automated fetches, so this list should be re-verified against the live/official docs before implementation locks — see the matching §8 open question):

1. `getCargoTypes` — cargo type classifications (parcel, documents, cargo, pallets, tires)
2. `getBackwardDeliveryCargoTypes` — cargo types valid for return shipments
3. `getCargoDescriptionList` — cargo descriptions (accepts a search-string filter)
4. `getDocumentStatuses` — possible document/shipment status values
5. `getOwnershipFormsList` — business ownership forms
6. `getPalletsList` — standard pallet sizes
7. `getPaymentForms` — payment method options
8. `getServiceTypes` — delivery service types
9. `getTimeIntervals` — delivery time-interval windows (accepts a recipient city + optional date filter)
10. `getTiresWheelsList` — tire/wheel cargo options
11. `getTraysList` — tray types
12. `getTypesOfAlternativePayers` — alternative payer type options
13. `getTypesOfPayers` — payer categories
14. `getTypesOfPayersForRedelivery` — payer types for return deliveries
15. `getTypesOfCounterparties` — counterparty classifications (individual / organization / private entrepreneur)

Every §5 acceptance criterion, the §6 "Method-surface completeness" row, and §7's "Method-surface completeness" KPI resolve against this list.

Traceability: module boundaries follow ADR-0002 (one folder per Nova Poshta model, dual ESM+CJS build); the test split (mocked unit suite required in CI, opt-in integration suite) follows ADR-0003.

Decision override: feature size — a critic pass flagged that "one typed method per documented reference list" spans a dozen-plus near-identical methods, each needing its own type and tests, which is realistically more than a single one-day PR. Reclassified from XS to S (see `docs/features/common/.size`) to size the feature honestly; the route stays `quick`.

Note: satisfying AC-03 (reject a response that isn't a navigable list) requires new work — today's scaffolded core client casts a parsed response to its declared type with no check that `data` is actually array-shaped. This is deliberately narrow: per-field/per-record inconsistency on an individual reference-list record is tolerated, not validated — see the Decision override below.

Decision override: shape-check strictness — real production experience with the Nova Poshta API (per the project owner, 2026-09-20) is that individual records routinely omit or vary documented fields; that's normal API noise, not a defect worth blocking a delivery-vendor integration over. A genuinely broken response — a temporary server malfunction, a non-list payload — is different and should fail loudly. AC-03 (below) and the reference-list types are built around this line: fail only when the response isn't a usable list at all; tolerate everything else, typing every documented field as optional so the gap is represented honestly instead of either blocking the call or promising data that isn't really there. This also settles the two open items `clarify` deferred to `design` (the runtime shape-check + the open/provisional value-typing technique) — see ADR-0001 and ADR-0002.

## 2. Goals

- Give every consuming developer typed, discoverable access to every documented Nova Poshta reference/lookup list, eliminating hardcoded magic values in their own code.
- Make `common` the single authoritative source other domain modules can point to for shared reference values (payment forms, ownership forms, cargo types, etc.), instead of each module inventing its own copy.
- Guarantee that a reference-list response is at least usable as a list — a response that isn't a navigable list at all surfaces as an error the consuming developer can act on; a response that's missing or inconsistent at the per-field level (normal Nova Poshta API noise) is represented honestly as an optional field, never silently promised as present when it isn't.

## 3. Non-goals

- Caching or persisting reference-list responses across calls. Reason: the library is stateless per its architecture map; consuming developers own caching decisions for their own use case, and baking one in would bake in a staleness policy this library can't validate.
- Validating that a value a consuming developer later sends to another domain module (e.g. a `PayerType` passed to internet-document) still exists in the current reference list. Reason: that check belongs to the module receiving the value, once it exists — `common` only supplies the authoritative list, it doesn't police later use.
- Localizing or normalizing multi-language description fields (Ukrainian/Russian/English variants) that Nova Poshta returns. Reason: the whole library's pass-through convention already fixed this — `common` returns exactly what Nova Poshta sends; language selection is the consuming developer's concern.
- Guaranteeing every documented reference method returns non-empty data for any given API key tier. Reason: some lookup lists may be gated by Nova Poshta's own account/contract tier outside this library's control — an upstream account concern, not a library defect.

## 4. User stories

### US-01: Fetch a reference list

**As a** consuming developer
**I want** to fetch a specific Nova Poshta reference list (e.g. payment forms)
**So that** I can populate valid input options for other requests without hardcoding values

### US-02: Filter a reference list

**As a** consuming developer
**I want** to pass a documented filter (e.g. a search string) when fetching a reference list
**So that** I get back a narrowed set of values relevant to what I'm building, without post-processing the full list myself

### US-03: Get typed results

**As a** consuming developer
**I want** fetched reference-list values expressed as typed fields
**So that** mistyped field names or wrong value shapes are caught by TypeScript at compile time, not at runtime

### US-04: Get a clear error on failure

**As a** consuming developer
**I want** a reference-list request that fails (bad key, Nova Poshta rejects it, or the response doesn't match its documented shape) to raise the library's standard error
**So that** I can handle it the same way I handle every other error from this library, without special-casing `common`

### US-05: Discover the full set of available reference lists

**As a** consuming developer
**I want** to see every reference list the library exposes as distinct, named typed methods
**So that** I can find the right one for my use case without cross-referencing Nova Poshta's raw API docs

### US-06: Rely on one source of truth across modules

**As a** consuming developer
**I want** every domain module in this library that accepts a shared reference value (e.g. a payment form) to draw its valid values from the same `common` reference list, not maintain its own copy
**So that** the value I fetch from `common` is the same one every other module expects, without `common` itself checking or enforcing how any other module uses it

## 5. Acceptance criteria

> Every "standard error" referenced below is `NovaPoshtaApiError` (per CLAUDE.md) — including AC-03's shape-check failure, which raises the same class with a library-written message, since Nova Poshta itself reports no error for a shape mismatch.

### AC-01 (US-01) — happy path

**Given** a consuming developer holds a valid API key
**When** they request a specific reference list (for example, the list of payment forms)
**Then** the system returns every documented value for that list as typed data

### AC-02 (US-02) — happy path

**Given** a consuming developer holds a valid API key
**When** they request a reference list using one of that method's documented filter parameters (for example, a search string)
**Then** the system passes the filter to Nova Poshta and returns exactly what Nova Poshta responds with, typed the same as the unfiltered list — the library performs no client-side re-filtering or stripping of results; how well the response matches the filter is Nova Poshta's own behavior, not something this library corrects

### AC-03 (US-03) — domain invariant

**Given** a consuming developer calls any reference-list method
**When** the response Nova Poshta returns for that call is not a navigable list — the data isn't array-shaped, so there's nothing a consuming developer could iterate over as "the list"
**Then** the system treats the call as failed, rather than handing back something that looks like a list but isn't

**Not a violation of this AC — tolerated, not failed:** an individual record missing one of its documented fields, a field that's `null` where a value was expected, a field whose value doesn't match its documented basic type, a field containing a new previously-undocumented *value* (the open/provisional typing from §1 already expects and absorbs new values Nova Poshta adds over time), or an extra field this library doesn't document. Nova Poshta's real-world responses are inconsistent at the per-field, per-record level — normal API noise, not a defect. When in doubt, the library passes through whatever Nova Poshta actually sent rather than blocking the call; every documented field on a reference-list record is typed as optional for exactly this reason (see the §1 Decision override).

### AC-04 (US-04) — authorization

**Given** a consuming developer calls any reference-list method with an invalid or expired API key
**When** the request reaches Nova Poshta
**Then** the system denies the call by raising the library's standard error, passing through Nova Poshta's own message about the key as-is — no library-side detection or separate error type is required — rather than returning any reference data

### AC-05 (US-04) — error

**Given** a consuming developer calls a reference-list method
**When** Nova Poshta declines the request for a reason other than the API key itself (for example, a filter value it doesn't accept, or a temporarily unavailable list)
**Then** the system raises the library's standard error containing Nova Poshta's own explanation, rather than returning an empty or partial list that looks like a valid result

### AC-06 (US-06) — cross-context

**Given** another domain module in this library will eventually accept a field whose valid values come only from a `common` reference list (for example, a payment-form value)
**When** a consuming developer fetches that reference list through `common`
**Then** the values returned are the authoritative, current set from Nova Poshta at the moment of the call — never a value invented or hardcoded by this library — so any module that later accepts that same field can treat `common`'s output as the single source for it; `common` itself performs no validation or enforcement of how another module uses the value — that check, if any, belongs to the module receiving it (see §3 non-goal)

### AC-07 (US-05) — happy path

**Given** a consuming developer wants to know which reference lists are available
**When** they browse the library's exported `common` module methods via their editor's autocomplete against the library's *published* package output — the type declaration files shipped in both the ESM and CJS builds (per ADR-0002), not just the source code
**Then** every in-scope reference list (see §1) appears as its own distinctly named, typed method in both published builds

### AC-08 (US-04) — error

**Given** a consuming developer calls a reference-list method
**When** the network call to Nova Poshta fails before a response is received (a timeout, a dropped connection, or a response that isn't valid JSON)
**Then** the system raises the library's standard error rather than letting the failure propagate unhandled or returning an empty result that looks like a valid response

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Type-safety coverage | 100% of in-scope reference-list methods have zero `any` in public signatures | static check in CI |
| Error-contract coverage | 100% of in-scope methods throw the standard error (`NovaPoshtaApiError`) on any declined response or a response whose data isn't array-shaped; 0% throw an unhandled error type; 0% throw on a per-field/per-record inconsistency (tolerated per AC-03) | unit test suite (`test/unit/modules/common`) |
| Library-added overhead per call | Median ≤ 5ms beyond the underlying network round-trip, including the AC-03 shape-check cost (no client-side caching, retries, or heavy parsing) | median across ≥30 repeated calls, benchmarked inside `test/unit/modules/common` with `fetch` stubbed to near-zero latency (always runs in CI — not the opt-in integration suite) |
| Method-surface completeness | 100% of the reference lists enumerated in §1 have a corresponding typed method | manual audit against Nova Poshta docs before release |

## 6.1 Security / privacy

- **Data classification:** public — reference lists (cargo types, payment forms, etc.) are Nova Poshta's own public catalog data, not customer- or shipment-specific.
- **Personal data touched:** none — these lookup lists contain no personal data.
- **AuthZ/AuthN impact:** none beyond what's already fixed for the whole library — every call authenticates via the caller's own Nova Poshta API key; `common` introduces no new permission tiers or roles.
- **Abuse cases:**
  - Excessive/automated polling of a reference list to work around Nova Poshta's own rate limits: the library adds no rate-limiting or retry of its own — Nova Poshta's own throttling governs, and the standard error surfaces any rejection.
  - Passing an oversized or malformed filter value: the request either matches the documented filter shape (enforced at compile time by TypeScript) or is declined by Nova Poshta and surfaced as the standard error; no additional sanitization is needed since there is no persistence or injection surface.
  - Spam-create: N/A — this feature is entirely read-only, there is no create action to spam.
- **Security review:** N/A — no new PII, no new authorization boundary, no persistence; reuses the existing single-API-key security model.

## 7. Metrics / KPIs

- **Type-safety completeness** — baseline: 0% (module doesn't exist yet), target: 100% of in-scope reference-list methods carry no `any` in their public signature, verified in the first release containing this feature.
- **Zero silent failures** — baseline: N/A (feature doesn't exist), target: 100% of unit tests asserting that a declined response or a non-array-shaped response throws `NovaPoshtaApiError` — and that a per-field/per-record inconsistency does NOT throw (tolerated per AC-03), passing before merge.
- **Method-surface completeness** — baseline: 0 of the documented reference lists exposed, target: every reference list in the agreed §1 scope has a shipped typed method before this feature is marked done.
- **Stale-enum issue rate** — baseline: N/A (feature doesn't exist), target: 0 GitHub issues within 90 days of release reporting that TypeScript rejected a value Nova Poshta's live API actually accepts.

## 8. Open questions

- [ ] Does Nova Poshta's API reject an invalid documented filter value with an explicit error, or silently ignore it and return an unfiltered/empty list? Default now: AC-05 is phrased to hold regardless of which; verify against the live API before implementation locks the per-method contract. — owner: Tech Lead, due: before `sdd:implement common`
- [x] §1 already commits to open/provisional typing (not a closed union) for reference values, per the stale-enum finding — which specific technique should `design` use to model that (e.g. a string-literal union with an unrecognized-value fallback vs. a plain string type)? **Resolved by `design`** — known values + an open string fallback; see `sad.md` §4 and ADR-0002.
- [x] What runtime shape-check should `common` (or the shared core client) perform on a reference-list response to satisfy AC-03, and where should it live? **Resolved by `design`** — a shared "is `data` array-shaped" check in the core client, no per-field validation; see `sad.md` §4 and ADR-0001.
- [ ] Do any in-scope reference lists carry multi-language (UA/RU/EN) description fields, and if so should the typed shape expose all language variants or just Nova Poshta's default? Default now: pass through verbatim per the fixed pass-through convention, no library-side language selection. — owner: Tech Lead, due: before `sdd:tasks common`
- [ ] Should reference lists gated behind a Nova Poshta account/contract tier (returning empty for ordinary keys) still ship as typed methods in v1, or be flagged/excluded once identified? Default now: ship them (the full-surface decision stands), flag the tier dependency in the method's documentation comment. — owner: Tech Lead, due: before `sdd:tasks common`
- [ ] Should `common` be expected to be called on a hot/frequent path by future modules (e.g. once per shipment operation), and if so does that change the no-caching decision in §3? Default now: no-caching stands as written; each future module that consumes `common` repeatedly is responsible for its own call pattern. — owner: Tech Lead, due: before `sdd:design` of the first module that consumes `common`'s reference lists
