---
status: Draft
owner: "associate2coder"
reviewers: []
updated_at: "2026-09-20"
feature_size: "S"
---

# Spec — address

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** `docs/architecture-map.md`, `docs/features/common/spec.md` and `src/modules/common/index.ts` (the one shipped domain module, used as the structural precedent), Nova Poshta's official developer portal (blocked automated fetches — see §8), and the actively-maintained `platx/go-nova-poshta` Go SDK (cites official Nova Poshta doc URLs per method) as the cross-check source for the in-scope method list; no ticket/Confluence/knowledge-base channel available.

## 1. Context

Consuming developers building against this library today have no typed access to Nova Poshta's Address domain — the cities, settlements, streets, warehouses, and administrative areas Nova Poshta delivers to, plus the ability to save, update, and delete an address entry under their own counterparty. Their only options are to consult Nova Poshta's raw documentation and hand-roll untyped calls, or hardcode `Ref` values they've looked up once and hope they stay valid — the same gap `common` closed for reference values like payment forms and cargo types, but for location and address data instead.

This module is next because it is a prerequisite building block, not an isolated convenience: every future domain module that creates or manages something location-bound — a shipment (internet-document), a counterparty's registered address — needs the `Ref` values (city, street, warehouse) that only `address`'s lookup methods can resolve from a consuming developer's human-readable input (a city name, a warehouse number). Shipping it now, following the same one-module-at-a-time sequence `common` established, avoids every later module inventing its own ad hoc address-lookup handling.

The committed approach is to ship one typed method per documented Nova Poshta Address API method — cross-checked against the actively-maintained `platx/go-nova-poshta` Go SDK, which cites the official Nova Poshta documentation URL for each method individually (a stronger cross-check than the community-summary sources `common` relied on) — plus a small set of single-call convenience methods that wrap the highest-friction raw lookups in friendlier parameters/defaults, sharing logic where the raw methods overlap. Chaining multiple Address calls into one convenience method is explicitly out of scope: Nova Poshta's own API has no server-side chaining anywhere in this domain (verified — every one of the 11 methods below maps to exactly one API call), and the user decided that building client-side multi-call orchestration adds partial-failure complexity this S-sized module shouldn't take on.

### In-scope Address API methods (as of 2026-09-20)

Cross-checked against the `platx/go-nova-poshta` SDK's `api/address` package, which links the official Nova Poshta documentation page for every method (Nova Poshta's own documentation portal blocks automated fetches, so this list should be re-verified against the live/official docs before implementation locks — see the matching §8 open question):

**Lookups (read-only):**

1. `getCities` — city directory lookup, filterable by name or `Ref`
2. `getSettlements` — the broader settlement directory (cities, towns, villages), filterable by area/region/warehouse-presence
3. `searchSettlements` — typeahead search across the settlement directory by name
4. `getAreas` — the full list of administrative areas/regions
5. `getStreet` — street directory within a given city
6. `searchSettlementStreets` — typeahead search for streets within a given settlement
7. `getWarehouses` — warehouse/branch/parcel-locker directory, filterable by city, type, or warehouse number
8. `getWarehouseTypes` — the full list of warehouse/branch type classifications

**Writes (a counterparty's saved address book):**

9. `save` — create a new saved address for a counterparty (requires a counterparty `Ref`, a street `Ref`, and a building number; flat/note optional)
10. `update` — replace an existing saved address's fields in full
11. `delete` — remove a saved address by its `Ref`

Every §5 acceptance criterion, the §6 "Method-surface completeness" row, and §7's matching KPI resolve against this list. Convenience methods (§2) are additive on top of it, not a replacement for any raw method.

Traceability: module boundaries follow the same convention `common` established (one folder per Nova Poshta model, dual ESM+CJS build, factory over the shared core client); the error contract reuses `NovaPoshtaApiError` unchanged.

Decision override: client-side pagination/warnings gap — the shared core client (`src/client.ts`) currently returns only the response's `data` array, silently dropping Nova Poshta's pagination metadata (`info`, including `totalCount`) and any warnings returned alongside a successful response. `address` is the first module where this materially bites (large city/warehouse lists can silently truncate at one page; a successful `save`/`update` can carry a warning — e.g. a normalized building number — the developer never sees). The project owner decided to keep this as a known limitation for this feature rather than extend the shared client now, since that change is shared infrastructure beyond this feature's boundary and would affect `common` too, likely pushing this feature past its S sizing. Logged as an open question (§8) for a future client-level enhancement.

## 2. Goals

- Give every consuming developer typed, discoverable access to every documented Nova Poshta Address API method — lookups and writes alike — eliminating hand-rolled untyped calls for location and address data.
- Provide friendlier convenience methods over the highest-friction single-call lookups so common integration tasks take less code, without introducing any behavior beyond what the single underlying Nova Poshta call already provides.
- Make `address` the authoritative, typed source of `Ref` values (city, settlement, street, warehouse) that future domain modules (shipment creation, counterparty management) can depend on instead of each inventing its own lookup handling.

## 3. Non-goals

- Chaining multiple Address API calls into one client-side convenience method (e.g. resolving a city name straight through to a warehouse list in one call). Reason: Nova Poshta's API has no server-side equivalent anywhere in this domain, and orchestrating it client-side adds partial-failure complexity beyond what this S-sized module takes on.
- Caching or persisting any Address data (lookups or saved addresses) across calls. Reason: the library is stateless per its architecture map, matching `common`'s precedent — consuming developers own their own caching decisions.
- Validating a write method's fields (e.g. a saved address's building number or street `Ref`) client-side before sending. Reason: matches `common`'s pass-through convention — Nova Poshta is the source of truth for its own field validation; the library doesn't duplicate it.
- Extending the shared core client to expose pagination metadata or success-path warnings. Reason: shared infrastructure beyond this feature's boundary (see the §1 Decision override); logged as an open question rather than solved here.

## 4. User stories

### US-01: Fetch address lookup data

**As a** consuming developer
**I want** to fetch address-domain lookup data (cities, settlements, streets, warehouses, warehouse types, areas)
**So that** I can resolve human-readable input into the `Ref` values other requests need, without hardcoding them

### US-02: Filter a lookup

**As a** consuming developer
**I want** to pass a documented filter or search parameter (e.g. a city name, a settlement search string) when fetching lookup data
**So that** I get back a narrowed, relevant set of results without post-processing the full directory myself

### US-03: Get typed results

**As a** consuming developer
**I want** every Address method's response — including ones structured differently from the others — expressed as typed fields matching its actual documented shape
**So that** mistyped field names or a wrong assumption about the response shape are caught by TypeScript at compile time, not at runtime

### US-04: Save a new address

**As a** consuming developer
**I want** to save a new address under my counterparty, given a street `Ref` and a building number
**So that** I can register a pickup or return address for later use without leaving this library

### US-05: Update a saved address

**As a** consuming developer
**I want** to update an existing saved address by supplying its complete replacement data
**So that** I can correct or change it without accidentally leaving stale or missing fields behind

### US-06: Delete a saved address

**As a** consuming developer
**I want** to delete a saved address I no longer need
**So that** my counterparty's address book doesn't accumulate entries I can't use

### US-07: Use a convenience method

**As a** consuming developer
**I want** a friendlier method for a common single-call lookup, with simplified parameters or sensible defaults
**So that** I can accomplish a routine lookup with less boilerplate than the raw method requires

### US-08: Get a clear error on failure

**As a** consuming developer
**I want** any Address method call that fails — a decline from Nova Poshta, an invalid `Ref`, a network failure — to raise the library's standard error
**So that** I can handle it the same way I handle every other error from this library, without special-casing `address`

### US-09: Discover the full set of available methods

**As a** consuming developer
**I want** to see every lookup, write, and convenience method the library exposes as distinct, named typed methods
**So that** I can find the right one for my use case without cross-referencing Nova Poshta's raw API docs

### US-10: Rely on Address as the authoritative Ref source

**As a** consuming developer
**I want** every future domain module in this library that accepts a location-bound `Ref` (a city, street, or warehouse) to expect the same `Ref` values `address` resolves, not maintain its own lookup
**So that** the `Ref` I resolve through `address` is the same one every other module expects, without `address` itself checking or enforcing how another module uses it

## 5. Acceptance criteria

> Every "standard error" referenced below is `NovaPoshtaApiError` (per CLAUDE.md), reused unchanged from `common`'s convention.

### AC-01 (US-01) — happy path

**Given** a consuming developer holds a valid API key
**When** they request address lookup data (for example, the list of cities or warehouses)
**Then** the system returns exactly the page of Nova Poshta's documented data for that lookup as typed values — for methods whose documented parameters include pagination, the library passes those parameters through when supplied but does not automatically walk multiple pages to assemble a complete list (see §1 Decision override); when the developer supplies no pagination parameter at all, the library never injects one on their behalf — the request goes to Nova Poshta exactly as given, and Nova Poshta's own default applies

### AC-02 (US-02) — happy path

**Given** a consuming developer holds a valid API key
**When** they request a lookup using one of that method's documented filter or search parameters
**Then** the system passes the filter to Nova Poshta and returns exactly what Nova Poshta responds with, typed the same as the unfiltered lookup — the library performs no client-side re-filtering of results; this rule applies to every method that reaches Nova Poshta, raw or convenience (see AC-11)

### AC-03 (US-03) — domain invariant

**Given** a consuming developer calls a lookup method whose Nova Poshta response is structured differently from the library's other lookup methods — specifically `searchSettlements` and `searchSettlementStreets`, whose documented response nests the matches under a result-count wrapper (e.g. `TotalCount`/`Addresses`) rather than returning a plain list
**When** they use that method's typed result
**Then** the shape they receive accurately reflects what Nova Poshta actually documents for that specific method, wrapper included — the library never unwraps it to just the inner array, so a consuming developer never has to guess whether "the list" is the top-level result or nested inside it

### AC-04 (US-04) — happy path

**Given** a consuming developer holds a valid API key and the `Ref` values a new address requires (their counterparty, a street)
**When** they save a new address
**Then** the system records it with Nova Poshta and returns the saved address's own `Ref` to the developer

### AC-05 (US-05) — domain invariant

**Given** a consuming developer wants to update an existing saved address
**When** they call the update method
**Then** the system requires them to supply the complete set of fields the update needs, at compile time — a partial payload that omits a field (for example, an apartment/flat note) is not accepted as "only change what I specified," preventing a previously-saved field from being silently wiped by an incomplete update. This includes fields that are optional on `save` (for example, flat/note): the update payload type makes every field mandatory to supply, even when the developer's intent is "no value" — an omitted key is never treated as "leave unchanged."

### AC-06 (US-06) — happy path

**Given** a consuming developer holds the `Ref` of a saved address
**When** they delete it
**Then** the system removes it from the counterparty's saved addresses and returns the deleted address's own `Ref` to the developer, mirroring how `save` returns the saved address's `Ref` (AC-04)

### AC-07 (US-04) — domain invariant

**Given** a consuming developer performs a write (save, update, or delete)
**When** Nova Poshta reports the write as successful but the returned data is an empty list rather than the saved/updated/deleted record
**Then** the system represents that outcome to the developer accurately as a successful write with no record to return — distinct from a malformed or non-list response, which already raises the standard error (see AC-10) — rather than crashing on the assumption a record is always present

### AC-08 (US-08) — error

**Given** a consuming developer calls any Address method
**When** Nova Poshta declines the request for a reason other than the API key itself (an invalid `Ref`, a missing required field, a business-rule rejection)
**Then** the system raises the library's standard error containing Nova Poshta's own explanation, rather than returning an empty or partial result that looks like a valid outcome

### AC-09 (US-08) — authorization

**Given** a consuming developer calls a write method for an address `Ref` that doesn't belong to their own API key's counterparty, or calls any Address method with an invalid or expired API key
**When** the request reaches Nova Poshta
**Then** the system denies the call by raising the library's standard error, passing through Nova Poshta's own message as-is, rather than performing or revealing the operation. AC-08 and AC-09 share one code path — every decline raises the same `NovaPoshtaApiError` shape regardless of cause; the only difference a developer sees is Nova Poshta's own message text inside it. The library performs no inspection of `errorCodes[]` to distinguish an authorization failure from any other decline.

### AC-10 (US-08) — error

**Given** a consuming developer calls any Address method
**When** the network call to Nova Poshta fails before a response is received (a timeout, a dropped connection, or a response that isn't valid JSON)
**Then** the system raises the library's standard error rather than letting the failure propagate unhandled or returning an empty result that looks like a valid response

### AC-11 (US-07) — happy path

**Given** a consuming developer holds a valid API key
**When** they call a convenience method for a common single-call lookup (friendlier parameters or defaults over one raw method)
**Then** the system makes exactly one call to Nova Poshta and returns the same typed data the corresponding raw method would return for the equivalent input — a convenience method may narrow that input into Nova Poshta's own filter parameters (so the single call itself returns fewer or more specific results, for example one exact match), but it never re-filters, sorts, or otherwise post-processes the response after Nova Poshta returns it, matching AC-02's no-client-side-re-filtering rule for raw lookups

### AC-12 (US-10) — cross-context

**Given** another domain module in this library will eventually accept a `Ref` value that only `address`'s lookup methods can supply (for example, a city or street `Ref` used when creating a shipment)
**When** a consuming developer resolves that `Ref` through `address`
**Then** the value returned is the authoritative, current `Ref` from Nova Poshta at the moment of the call — never a value invented or cached by this library — so any module that later accepts that same `Ref` can treat `address`'s output as the single source for it; `address` itself performs no validation or enforcement of how another module uses the value

### AC-13 (US-09) — happy path

**Given** a consuming developer wants to know which Address methods are available
**When** they browse the library's exported `address` module methods via their editor's autocomplete against the library's *published* package output — the type declaration files shipped in both the ESM and CJS builds
**Then** every in-scope method (lookups, writes, and convenience methods) appears as its own distinctly named, typed method in both published builds — verified automatically in CI by a post-build step that imports the built package output (not the source) in both module formats and type-checks the method surface against this list, so a misconfigured `package.json` `exports`/`types` field is caught before release, not just a missing method

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Type-safety coverage | 100% of in-scope Address methods (lookups, writes, convenience) have zero `any` in public signatures | static check in CI |
| Error-contract coverage | 100% of in-scope methods throw the standard error (`NovaPoshtaApiError`) on any declined response, malformed response, or network failure; 0% throw an unhandled error type | unit test suite (`test/unit/modules/address`) |
| Update full-replace guard | 100% of calls to the update method fail to compile if any field the full-replace payload requires is omitted | static check in CI (type-level test) |
| Library-added overhead per call | Median ≤ 5ms beyond the underlying network round-trip (no client-side caching, retries, or heavy parsing) | median across ≥30 repeated calls, benchmarked inside `test/unit/modules/address` with `fetch` stubbed to near-zero latency (always runs in CI) |
| Method-surface completeness | 100% of the 11 methods enumerated in §1 have a corresponding typed method | manual audit against the `platx/go-nova-poshta` SDK's method list (the same cross-check source §1 used to build the 11-method list) before release; §8 OQ-2 separately tracks re-verifying against Nova Poshta's official docs once reachable |
| Published-build type-surface check | 100% of in-scope methods (lookups, writes, convenience) importable and typed from the built ESM and CJS output, not just the source (see AC-13) | automated post-build step that imports the built package output in both module formats and type-checks the method surface; always runs in CI |

## 6.1 Security / privacy

- **Data classification:** confidential — unlike `common`'s public reference catalog, this module's write methods and saved-address data concern a specific counterparty's address book (street, building number, flat, counterparty `Ref`), which is business/personal address data, not public catalog data.
- **Personal data touched:** yes — a saved address's fields (street, building number, flat/note, and the counterparty `Ref` it belongs to) qualify as personal or business address data when the counterparty is a private individual.
- **AuthZ/AuthN impact:** none beyond what's already fixed for the whole library — every call authenticates via the caller's own Nova Poshta API key; `address` introduces no new permission tiers or roles. Write methods only ever act within the scope of the calling API key's own counterparty, enforced by Nova Poshta itself. This cross-counterparty enforcement is trusted from Nova Poshta's own documented behavior, not independently verified by this library's test suite — the unit tests confirm the library correctly surfaces whatever decline Nova Poshta sends back (mocked), not that Nova Poshta's own enforcement holds in production.
- **Abuse cases:**
  - Attempting to update or delete an address `Ref` belonging to a different counterparty than the caller's own: denied by Nova Poshta, surfaced as the standard error (see AC-09).
  - Excessive/automated polling of a lookup method to work around Nova Poshta's own rate limits: the library adds no rate-limiting or retry of its own — Nova Poshta's own throttling governs, and the standard error surfaces any rejection.
  - Saving a malformed or oversized address field: the request either matches the documented shape (enforced at compile time by TypeScript) or is declined by Nova Poshta and surfaced as the standard error.
- **Security review:** Required — this is the first module in the library with write operations (`save`/`update`/`delete`) and the first to touch personal/business address data, unlike `common`'s public, read-only reference data.

## 7. Metrics / KPIs

- **Type-safety completeness** — baseline: 0% (module doesn't exist yet), target: 100% of in-scope Address methods carry no `any` in their public signature, verified in the first release containing this feature.
- **Zero silent failures** — baseline: N/A (feature doesn't exist), target: 100% of unit tests asserting that a declined, malformed, or network-failed call throws `NovaPoshtaApiError`, passing before merge.
- **Method-surface completeness** — baseline: 0 of the 11 documented methods exposed, target: all 11 have a shipped typed method before this feature is marked done. (Convenience-method completeness is tracked separately once §8 OQ-3 fixes their set.)
- **Write-safety** — baseline: N/A (feature doesn't exist), target: 0 GitHub issues within 90 days of release reporting that an `update` call silently dropped a previously-saved field.

## 8. Open questions

- [ ] Should the shared core client be extended to expose Nova Poshta's pagination metadata (`totalCount`) and success-path warnings, given `address` is the first module where their absence materially bites? Default now: known limitation, not fixed in this feature (see the §1 Decision override). — owner: Tech Lead, due: before `sdd:design` of any future module whose lookups depend on complete, multi-page Address results
- [ ] Re-verify the 11-method Address surface (§1) against Nova Poshta's live/official documentation once it's reachable — the SDK cross-check is strong but is still a third-party source. Default now: proceed on the SDK-verified list. — owner: Tech Lead, due: before `sdd:implement address`
- [ ] Which specific convenience methods (US-07) should ship in v1 — the exact set of single-call raw methods worth wrapping? Default now: TBD, decided during `sdd:design`/`sdd:tasks` based on which raw lookups see the most friction in practice. — owner: Tech Lead, due: before `sdd:tasks address`
- [ ] Should the update full-replace guard (AC-05) be documented with a runtime warning/doc-comment in addition to the compile-time type enforcement? Default now: compile-time only, matching the library's convention of no added runtime validation beyond the shared error contract. — owner: Tech Lead, due: before `sdd:design address`
