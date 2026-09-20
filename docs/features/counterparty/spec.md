---
status: Draft
owner: "associate2coder"
reviewers: []
updated_at: "2026-09-20"
feature_size: "S"
---

# Spec — counterparty

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** `docs/features/address/spec.md` and `src/modules/address/index.ts` / `src/types/address.ts` / `src/client.ts` (the shipped domain module used as the structural precedent), Nova Poshta's official developer portal (`developers.novaposhta.ua` — every page fetched during this spec's own drafting blocked automated fetches, same blocker `address` hit), the actively-maintained `platx/go-nova-poshta` Go SDK's `counterparty` and `contactperson` packages (cites official Nova Poshta doc URLs per method) as the cross-check source for the in-scope method list, and `maddsua/NovaPoshtaREST` / `daaner/NovaPoshta` as secondary community cross-checks; no ticket/Confluence/knowledge-base channel available.

## 1. Context

Consuming developers building against this library today have no typed access to Nova Poshta's Counterparty domain — the senders, recipients, and third parties a shipment is registered against, plus the named contact persons Nova Poshta uses for pickup/delivery notifications. Their only options are to consult Nova Poshta's raw documentation and hand-roll untyped calls, or copy `Ref` values from a previous response and hope they stay valid — the same gap `address` closed for location data, but for the counterparties and contact people a shipment is built around.

This module is next because it is a prerequisite building block, not an isolated convenience: a future shipment-creation (`internet-document`) module needs a sender counterparty `Ref`, a recipient counterparty `Ref`, and often a contact-person `Ref`, the same way it needs the city/street/warehouse `Ref`s `address` already resolves. Shipping it now, continuing the one-module-at-a-time build order `common` and `address` established, avoids a future module inventing its own ad hoc counterparty handling.

The committed approach mirrors `address`'s structural precedent: one typed method per documented Counterparty API method (cross-checked against `platx/go-nova-poshta` since Nova Poshta's own portal blocks automated fetches) plus one typed method per documented ContactPerson API method, covering full read/write access to both — including `ThirdParty` counterparties (a company shipped on behalf of, distinct from the caller's own `Sender` entity) and full save/update/delete on contact persons — reusing the single `NovaPoshtaApiError` error contract unchanged, plus a small set of single-call convenience methods wrapping the highest-friction raw lookups, with the exact set decided later at `design`/`tasks` time, same as `address`.

### In-scope Counterparty + ContactPerson API methods (as of 2026-09-20)

Cross-checked against the `platx/go-nova-poshta` SDK's `api/counterparty` and `api/contactperson` packages (Nova Poshta's own documentation portal blocked every automated fetch attempted while drafting this spec, so this list should be re-verified against the live/official docs before implementation locks — see the matching §8 open question):

**Lookups (read-only):**

1. `getCounterparties` — list counterparties by property (`Sender`/`Recipient`/`ThirdParty`), filterable by search string, paginated (see the property-vs-type note below the list)
2. `getCounterpartiesCatalog` — look up existing counterparties by phone number + a partial last name, ahead of creating a new one (exact method name subject to the §8 re-verification — sources spell it inconsistently)
3. `getCounterpartyContactPersons` — the contact persons saved under a given counterparty
4. `getCounterpartyAddresses` — the saved addresses (per `address`) registered under a given counterparty; the response type is imported directly from `address`'s own saved-address type rather than duplicated here, so the two modules share one definition of that shape
5. `getCounterpartyOptions` — a counterparty's own configuration/options

**Writes (a developer's own counterparties):**

6. `save` — create a new counterparty as `PrivatePerson`, `Organization`, or `ThirdParty` (each type carries its own required fields — e.g. first/last name + phone for a private person, `OwnershipForm` + EDRPOU for an organization, EDRPOU + city for a third party)
7. `update` — replace an existing counterparty's fields in full, preserving its original type
8. `delete` — remove a counterparty by its `Ref`

**Writes (a counterparty's contact persons):**

9. `save` (contact person) — create a new contact person under an existing counterparty
10. `update` (contact person) — replace an existing contact person's fields in full
11. `delete` (contact person) — remove a contact person by its `Ref`

Two distinct axes share overlapping names here and must not be collapsed into one enum: a **counterparty property** (`Sender`/`Recipient`/`ThirdParty`) used only to filter `getCounterparties` results, and a **counterparty type** (`PrivatePerson`/`Organization`/`ThirdParty`) used only for `save`/`update` and AC-03's discriminated result shape. `ThirdParty` is the one value legitimately shared by both axes; `Sender`/`Recipient` never appear as a save-time type, and `PrivatePerson`/`Organization` never appear as a filter property. (`PrivatePerson` and `Organization` are now defined in `CONTEXT.md`'s glossary alongside the existing `ThirdParty` entry.)

This spec assumes Nova Poshta's lookup responses (`getCounterparties` and related) carry a real, runtime-checkable discriminant field identifying which counterparty type a given record actually is — the mechanism AC-03's discriminated-result guarantee depends on. This assumption rides on the same live-API re-verification §8 OQ-2 already schedules before implementation; if it proves false, AC-03's guarantee needs rework at that point.

Every §5 acceptance criterion, the §6 "Method-surface completeness" row, and §7's matching KPI resolve against this list. Convenience methods (§4 US-08) are additive on top of it, not a replacement for any raw method.

Traceability: module boundaries follow the same convention `address` established (one folder per Nova Poshta model, dual ESM+CJS build, factory over the shared core client); the error contract reuses `NovaPoshtaApiError` unchanged.

Decision override: client-side pagination/warnings gap — inherited unchanged from `address`'s §1 decision and §3 non-goal (the shared core client returns only `data`, dropping pagination metadata and success-path warnings; extending it is out of scope for this feature — see §3). It bites harder here: unlike most of `address`'s lookups, `getCounterparties` is explicitly a growing, transactional list (per `CONTEXT.md`'s `reference list` NOT-reference), not a small, mostly-static enumeration — so silent truncation at one page is a more realistic failure mode for a developer with a large counterparty book. Kept as a known limitation for this feature; the open question this reinforces (§8) is due before any module — this one or a later one — ships a lookup that depends on complete, multi-page counterparty results.

Decision override: the discriminated `save` payload (`PrivatePerson` / `Organization` / `ThirdParty`) must not be collapsed to its common fields when deriving the `update` full-replace type — the update guard must preserve each type's own required fields, not just the fields every type shares. `address`'s equivalent guard works only because its save payload is a single flat shape; a naive reuse of that same mechanism against a discriminated union would silently void this guarantee. The exact type-level mechanism is left to `design` (see §8 OQ), and is scoped entirely to this module's own type definitions — it requires no change to the shared core client or any other module.

## 2. Goals

- Give every consuming developer typed, discoverable access to every documented Counterparty and ContactPerson API method — lookups and writes alike — eliminating hand-rolled untyped calls for counterparty and contact-person management.
- Provide friendlier convenience methods over the highest-friction single-call lookups so common integration tasks take less code, without introducing any behavior beyond what the single underlying Nova Poshta call already provides.
- Make `counterparty` the authoritative, typed source of counterparty `Ref` values (`Sender`/`Recipient`/`ThirdParty`) that future domain modules (shipment creation) can depend on, mirroring the role `address` already plays for location `Ref`s.
- Preserve the `PrivatePerson`/`Organization`/`ThirdParty` distinction as a discriminated type from `save` through `update`, so a consuming developer can't accidentally submit a payload shaped for the wrong counterparty type.

## 3. Non-goals

- Chaining a counterparty-creation call and a contact-person-creation call into one client-side convenience method. Reason: Nova Poshta's API has no server-side equivalent, and orchestrating it client-side risks a partial failure — a created counterparty left without its contact person on a mid-sequence error, with no compensating rollback this stateless library could perform. Matches `address`'s identical non-goal.
- Caching or persisting any counterparty or contact-person data across calls. Reason: the library is stateless per its architecture, matching `address`/`common`'s precedent.
- Validating a write method's fields client-side beyond what TypeScript's type system enforces at compile time. Reason: matches `address`/`common`'s pass-through convention — Nova Poshta is the source of truth for its own field validation.
- Enforcing referential integrity across module boundaries — e.g. checking or cascading into a counterparty's contact persons, or into `address`'s saved-address records that reference that counterparty's `Ref`, when the counterparty is updated or deleted. Reason: the library holds no state and performs no cross-call bookkeeping (see AC-13); a consuming developer who stores a counterparty `Ref` elsewhere is responsible for noticing it became stale.
- Extending the shared core client to expose pagination metadata or success-path warnings. Reason: shared infrastructure beyond this feature's boundary, matching `address`'s identical non-goal; logged as an open question (§8) rather than solved here.

## 4. User stories

### US-01: Fetch counterparty lookup data

**As a** consuming developer
**I want** to fetch counterparty-domain lookup data (counterparties, their contact persons, their saved addresses, their options)
**So that** I can resolve human-readable input into the `Ref` values other requests need, without hardcoding them

### US-02: Filter a counterparty lookup

**As a** consuming developer
**I want** to pass a documented filter or search parameter (a counterparty property, a search string, a phone number + partial last name) when fetching lookup data
**So that** I get back a narrowed, relevant set of results without post-processing the full list myself

### US-03: Get typed, discriminated results

**As a** consuming developer
**I want** a counterparty's typed shape to reflect which type it actually is — `PrivatePerson`, `Organization`, or `ThirdParty` — with only that type's real fields visible
**So that** I can't accidentally read or write a field (like an organization's EDRPOU) that doesn't exist on the counterparty type I'm actually holding

### US-04: Save a new counterparty

**As a** consuming developer
**I want** to save a new counterparty as a private person, an organization, or a third party
**So that** I can register a sender, recipient, or third-party entity for later use without leaving this library

### US-05: Update an existing counterparty

**As a** consuming developer
**I want** to update an existing counterparty by supplying its complete replacement data, matching its original type
**So that** I can correct or change it without accidentally leaving stale fields behind or submitting a payload shaped for the wrong counterparty type

### US-06: Delete a counterparty

**As a** consuming developer
**I want** to delete a counterparty I no longer need
**So that** my own list of registered counterparties doesn't accumulate entries I can't use

### US-07: Manage a counterparty's contact persons

**As a** consuming developer
**I want** to save, update, and delete the contact persons attached to one of my counterparties
**So that** I can keep pickup/delivery contact details current without leaving this library

### US-08: Use a convenience method

**As a** consuming developer
**I want** a friendlier method for a common single-call lookup, with simplified parameters or sensible defaults
**So that** I can accomplish a routine lookup with less boilerplate than the raw method requires

### US-09: Get a clear error on failure

**As a** consuming developer
**I want** any Counterparty or ContactPerson method call that fails — a decline from Nova Poshta, an invalid `Ref`, a network failure — to raise the library's standard error
**So that** I can handle it the same way I handle every other error from this library, without special-casing `counterparty`

### US-10: Discover the full set of available methods

**As a** consuming developer
**I want** to see every lookup, write, and convenience method the library exposes as distinct, named typed methods
**So that** I can find the right one for my use case without cross-referencing Nova Poshta's raw API docs

### US-11: Rely on counterparty as the authoritative Ref source

**As a** consuming developer
**I want** `counterparty` to always return Nova Poshta's own live, current `Ref` value — never cached or invented locally
**So that** any future domain module that later accepts that same `Ref` can treat it as authoritative, without `counterparty` itself checking or enforcing how another module uses it

## 5. Acceptance criteria

> Every "standard error" referenced below is `NovaPoshtaApiError` (per CLAUDE.md), reused unchanged from `address`'s convention.

### AC-01 (US-01) — happy path

**Given** a consuming developer holds a valid API key
**When** they request counterparty-domain lookup data (for example, the list of their counterparties or a counterparty's contact persons)
**Then** the system returns exactly the page of Nova Poshta's documented data for that lookup as a typed array — every documented lookup method, including `getCounterpartyOptions`, returns its result this way, one consistent shape regardless of whether Nova Poshta's own concept of that data is singular or plural — for methods whose documented parameters include pagination, the library passes those parameters through when supplied but does not automatically walk multiple pages to assemble a complete list (see §1 decision override); when the developer supplies no pagination parameter at all, the library never injects one on their behalf; the developer receives no indication, explicit or implicit, of whether more results exist beyond the returned page — not a count, not a boolean, not a signal inferred from page size

### AC-02 (US-02) — happy path

**Given** a consuming developer holds a valid API key
**When** they request a lookup using one of that method's documented filter or search parameters (a counterparty property, a search string, or a phone number + partial last name)
**Then** the system passes the filter to Nova Poshta and returns exactly what Nova Poshta responds with, typed the same as the unfiltered lookup — the library performs no client-side re-filtering of results

### AC-03 (US-03) — domain invariant

**Given** a consuming developer saves or reads a counterparty
**When** they use that counterparty's typed result
**Then** the shape they receive matches its actual type — `PrivatePerson`, `Organization`, or `ThirdParty` — as a discriminated type, never a single loose shape where every type-specific field (an organization's EDRPOU, a private person's first/last name) is merely optional and could belong to any type

### AC-04 (US-04) — happy path

**Given** a consuming developer holds a valid API key and the fields their intended counterparty type requires
**When** they save a new counterparty as a private person, organization, or third party
**Then** the system records it with Nova Poshta and returns the saved counterparty's own `Ref` to the developer — or nothing, per AC-07, when Nova Poshta reports success but returns no record. At compile time, the payload's fields must all belong to one counterparty type — the type system rejects a payload mixing fields from more than one type — though it cannot verify the payload matches whichever type was previously saved under an existing `Ref`; see AC-05's identical scoping for `update`

### AC-05 (US-05) — domain invariant

**Given** a consuming developer wants to update an existing counterparty
**When** they call the update method
**Then** the system requires them to supply the complete set of fields that counterparty's own type needs, at compile time — a partial payload that omits a required field is rejected, and so is a payload mixing fields from more than one counterparty type (for example, an organization's EDRPOU field together with a private person's first/last name in one payload); an omitted key is never treated as "leave unchanged". This compile-time guard checks the payload's own internal consistency only — a bare `Ref` carries no compile-time information about which type was actually saved under it, so a payload that is internally consistent but shaped for the wrong counterparty (e.g. a well-formed `Organization` payload submitted against a `Ref` that was actually saved as a `PrivatePerson`) is not caught by the type system; that mismatch surfaces instead as Nova Poshta's own runtime decline (AC-14/AC-15). The call resolves the updated counterparty's own `Ref` — or nothing, per AC-07, when Nova Poshta reports success but returns no record

### AC-06 (US-06) — happy path

**Given** a consuming developer holds the `Ref` of a counterparty
**When** they delete it
**Then** the system removes it and returns the deleted counterparty's own `Ref` to the developer — or nothing, per AC-07, when Nova Poshta reports success but returns no record — mirroring how `save` returns the saved counterparty's `Ref` (AC-04)

### AC-07 (US-04) — domain invariant

**Given** a consuming developer performs a counterparty or contact-person write (save, update, or delete)
**When** Nova Poshta reports the write as successful but the returned data is an empty list rather than the saved/updated/deleted record
**Then** the system represents that outcome accurately as a successful write with no record to return — distinct from a malformed or non-list response, which already raises the standard error (see AC-14) — rather than crashing on the assumption a record is always present

### AC-08 (US-07) — happy path

**Given** a consuming developer holds the `Ref` of one of their own counterparties
**When** they save a new contact person under it
**Then** the system records it with Nova Poshta and returns the saved contact person's own `Ref` to the developer — or nothing, per AC-07, when Nova Poshta reports success but returns no record

### AC-09 (US-07) — domain invariant

**Given** a consuming developer wants to update an existing contact person
**When** they call the update method
**Then** the system requires them to supply every field ContactPerson documents, required and optional alike (for example, a middle name that may not apply to every contact person), at compile time — there is no partial update and no way to represent "leave this field as it was"; an omitted field is never treated as "leave unchanged," preventing a previously-saved field from being silently wiped by an incomplete update

### AC-10 (US-07) — happy path

**Given** a consuming developer holds the `Ref` of a contact person
**When** they delete it
**Then** the system removes it and returns the deleted contact person's own `Ref` to the developer — or nothing, per AC-07, when Nova Poshta reports success but returns no record

### AC-11 (US-08) — happy path

**Given** a consuming developer holds a valid API key
**When** they call a convenience method for a common single-call lookup (friendlier parameters or defaults over one raw method)
**Then** the system makes exactly one call to Nova Poshta and returns the same typed data the corresponding raw method would return for the equivalent input — a convenience method may narrow that input into Nova Poshta's own filter parameters, but it never re-filters, sorts, or otherwise post-processes the response after Nova Poshta returns it, and it never combines a counterparty write with a contact-person write into one call (see §3's chaining non-goal)

### AC-12 (US-11) — cross-context

**Given** another domain module in this library will eventually accept a counterparty `Ref` (for example, a sender or recipient `Ref` used when creating a shipment)
**When** a consuming developer resolves that `Ref` through `counterparty`
**Then** the value returned is the authoritative, current `Ref` from Nova Poshta at the moment of the call — never a value invented or cached by this library — so any module that later accepts that same `Ref` can treat `counterparty`'s output as the single source for it; `counterparty` itself performs no validation or enforcement of how another module uses the value

### AC-13 (US-11) — cross-context

**Given** a consuming developer updates or deletes a counterparty that has contact persons saved under it, or that `address` has saved addresses registered against, in another bounded context
**When** that update or delete completes
**Then** the system performs no check of, and no cascade into, those contact persons or saved addresses — it neither warns the developer that dependent records exist nor prevents the operation, leaving the developer responsible for noticing and handling any `Ref` that becomes stale as a result (see §3 non-goal)

### AC-14 (US-09) — error

**Given** a consuming developer calls any Counterparty or ContactPerson method
**When** Nova Poshta declines the request for a reason other than the API key itself (an invalid `Ref`, a missing required field, a business-rule rejection), or reports the call successful but returns data that doesn't match that method's documented shape
**Then** the system raises the library's standard error containing Nova Poshta's own explanation where one is given, rather than returning an empty or partial result that looks like a valid outcome

### AC-15 (US-09) — authorization

**Given** a consuming developer calls a write method for a counterparty or contact-person `Ref` that doesn't belong to their own API key, calls any method with an invalid or expired API key, or calls a contact-person method using an API key type Nova Poshta doesn't permit for that operation (for example, a private-individual key attempting an operation reserved for an organization-held key)
**When** the request reaches Nova Poshta
**Then** the system denies the call by raising the library's standard error, passing through Nova Poshta's own message as-is, rather than performing or revealing the operation. Every decline shares one code path — the only difference a developer sees is Nova Poshta's own message text; the library performs no inspection of `errorCodes[]` to distinguish one kind of decline from another

### AC-16 (US-09) — error

**Given** a consuming developer calls any Counterparty or ContactPerson method
**When** the network call to Nova Poshta fails before a response is received (a timeout, a dropped connection, or a response that isn't valid JSON)
**Then** the system raises the library's standard error rather than letting the failure propagate unhandled or returning an empty result that looks like a valid response

### AC-17 (US-10) — happy path

**Given** a consuming developer wants to know which Counterparty and ContactPerson methods are available
**When** they browse the library's exported `counterparty` module methods via their editor's autocomplete against the library's *published* package output — the type declaration files shipped in both the ESM and CJS builds
**Then** every in-scope method (lookups, writes, and convenience methods) appears as its own distinctly named, typed method in both published builds — verified automatically in CI by a post-build step that imports the built package output (not the source) in both module formats and type-checks the method surface against this list

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Type-safety coverage | 100% of in-scope Counterparty/ContactPerson methods (lookups, writes; convenience methods measured against whichever set §8 OQ-3 fixes at design/tasks time — shipping zero convenience methods in v1 satisfies this at 100% of that set) have zero `any` in public signatures | static check in CI |
| Error-contract coverage | 100% of in-scope methods throw the standard error (`NovaPoshtaApiError`) on any declined response, malformed response, or network failure; 0% throw an unhandled error type | unit test suite (`test/unit/modules/counterparty`) |
| Update full-replace + discriminant guard | 100% of calls to the counterparty update method fail to compile if any field its own type requires is omitted, OR if the payload mixes fields belonging to more than one counterparty type (payload-internal consistency only — matching a payload to whichever type was actually saved under an existing `Ref` is not compile-time checkable, per AC-05) | static check in CI (type-level test) |
| Library-added overhead per call | Median total call time ≤ 5ms, measured with `fetch` stubbed to near-zero latency (no client-side caching, retries, or heavy parsing) — with the network cost driven to ~0, total call time and library-added overhead are effectively the same figure | median across ≥30 repeated calls, benchmarked inside `test/unit/modules/counterparty` with `fetch` stubbed to near-zero latency, asserting the median of TOTAL elapsed call time (not a separately isolated overhead figure) (always runs in CI) |
| Method-surface completeness | 100% of the 11 methods enumerated in §1 have a corresponding typed method | manual audit against the `platx/go-nova-poshta` SDK's method list before release; §8 OQ separately tracks re-verifying against Nova Poshta's official docs once reachable |
| Published-build type-surface check | 100% of in-scope methods (lookups, writes; convenience methods measured against whichever set §8 OQ-3 fixes at design/tasks time — shipping zero convenience methods in v1 satisfies this at 100% of that set) importable and typed from the built ESM and CJS output, not just the source (see AC-17) | automated post-build step that imports the built package output in both module formats and type-checks the method surface; always runs in CI |

## 6.1 Security / privacy

- **Data classification:** confidential — this module's data (a private person's name and phone, an organization's registration details, a contact person's name and phone) is personal or business identity data, a step more sensitive than `address`'s street-level data.
- **Personal data touched:** yes — a `PrivatePerson` counterparty's name and phone, an `Organization` counterparty's registration identifier, and every contact person's name and phone qualify as personal or business identity data.
- **AuthZ/AuthN impact:** none beyond what's already fixed for the whole library — every call authenticates via the caller's own Nova Poshta API key; `counterparty` introduces no new permission tiers or roles of its own. One documented exception is enforced entirely by Nova Poshta, not this library: contact-person operations are reserved for organization-held API keys, and a private-individual key attempting one is declined the same way any other authorization failure is (see AC-15).
- **Known consideration (unverified assumption):** AC-15's cross-account-decline behavior — that Nova Poshta declines, rather than silently scopes or no-ops, a write against a `Ref` outside the caller's own account — is inferred from secondary/community sources, not confirmed against a live API response; this spec's own drafting could not reach Nova Poshta's official documentation (see §8 OQ-2). This assumption should be confirmed against a live API call before the security review below is considered complete.
- **Abuse cases:**
  - Attempting to update or delete a counterparty or contact-person `Ref` belonging to a different account: denied by Nova Poshta, surfaced as the standard error (see AC-15).
  - Using the catalog lookup (search by phone number + partial last name) to harvest personal data by iterating over guessed phone numbers: the library adds no rate-limiting or throttling of its own — Nova Poshta's own rate limits and account-scoping govern what a given API key can retrieve, and the standard error surfaces any rejection.
  - Saving a malformed or oversized counterparty/contact-person field: the request either matches the documented shape (enforced at compile time by TypeScript) or is declined by Nova Poshta and surfaced as the standard error.
- **Known consideration (no code change):** `NovaPoshtaApiError`'s message/`errors`/`warnings` pass through Nova Poshta's own response text verbatim (matching the library's no-added-behavior convention), which can echo submitted personal data (a name, phone, or EDRPOU) back inside the error. A consuming developer who forwards a caught error to a third-party logging or error-tracking service should treat its contents as potentially carrying personal data — this library performs no redaction of its own.
- **Security review:** Required — write operations on personal/business identity data, and a documented PII-bearing lookup (the phone + last-name catalog search), matching and exceeding `address`'s posture.

## 7. Metrics / KPIs

- **Type-safety completeness** — baseline: 0% (module doesn't exist yet), target: 100% of in-scope Counterparty/ContactPerson methods carry no `any` in their public signature, verified in the first release containing this feature.
- **Zero silent failures** — baseline: N/A (feature doesn't exist), target: 100% of unit tests asserting that a declined, malformed, or network-failed call throws `NovaPoshtaApiError`, passing before merge.
- **Method-surface completeness** — baseline: 0 of the 11 documented methods exposed, target: all 11 have a shipped typed method before this feature is marked done. (Convenience-method completeness is tracked separately once §8's convenience-method open question fixes their set.)
- **Write-safety** — baseline: N/A (feature doesn't exist), target: 0 GitHub issues within 90 days of release reporting that an `update` call silently dropped a previously-saved field, or accepted a payload mismatched to the counterparty's actual type.

## 8. Open questions

- [ ] Should the shared core client be extended to expose Nova Poshta's pagination metadata (`totalCount`) and success-path warnings? `address` first deferred this; it's more urgent here since `getCounterparties` is a growing transactional list, not a semi-static reference list. Default now: known limitation, not fixed in this feature (see §1 decision override, §3 non-goal). — owner: Tech Lead, due: before `sdd:design` of counterparty or any future module whose lookups depend on complete, multi-page counterparty results
- [ ] Re-verify the 11-method Counterparty/ContactPerson surface (§1) against Nova Poshta's live/official documentation once reachable — this spec's own drafting confirmed the portal still blocks automated fetches, and community sources spell the catalog-lookup method name inconsistently (`getCounterpartiesCatalog` vs `getCatalogCounterparty`). Default now: proceed on the SDK-verified list, exact method name confirmed during implementation against a live API response. — owner: Tech Lead, due: before `sdd:implement counterparty`
- [ ] Which specific convenience method(s) (US-08) should ship in v1? Default now: TBD, decided during `sdd:design`/`sdd:tasks` based on which raw lookups see the most friction in practice, mirroring `address`'s OQ-3. — owner: Tech Lead, due: before `sdd:tasks counterparty`
- [ ] What type-level mechanism should `design` use so the update full-replace guard (AC-05) preserves the `PrivatePerson`/`Organization`/`ThirdParty` discriminant, given that a naive reuse of `address`'s own update-guard mechanism collapses a discriminated union to its shared fields only (see §1 decision override)? Default now: flagged for `design` to solve explicitly, scoped to this module's own types only — not decided here. — owner: Tech Lead, due: before `sdd:design counterparty`

## Test plan

> Size S / route `quick` — plan kept inline per the size matrix, not a separate `test-plan.md`.
> Levels used: **unit** (mocked `fetch`, no real network — covers all 17 ACs) and **integration**
> (one opt-in real-API smoke test, gated by `NOVA_POSHTA_TEST_API_KEY`, matching the existing
> `test/integration/` convention — never blocks CI without a key configured). AC-17 is a
> **contract** check (the published-build type-surface test already used for `address`/`common`).
> No **e2e**, **load-as-throughput**, **component**, **visual-regression**, or **e2e-through-UI**
> apply — no UI surface, no server of its own to load-test; the one numeric NFR is handled under
> Load below.

### AC coverage

| AC (spec.md §5) | Test name (intent-based) | Level | Expected outcome |
|---|---|---|---|
| AC-01 lookup happy path | lookup passes pagination params through unmodified and never injects a default when the caller omits one | unit + integration | typed array matching the response exactly, no auto-paging |
| AC-02 filtered lookup | a filter/search param reaches Nova Poshta unmodified and the response is returned without client-side re-filtering | unit | typed array unchanged from the response |
| AC-03 discriminated shape | a `PrivatePerson`/`Organization`/`ThirdParty` counterparty resolves to its own distinct typed shape, not a shared loose type | unit (compile-time fixture) | type-checker accepts only that variant's fields; a mismatched field access fails to compile |
| AC-04 save happy path | `save` resolves the newly saved counterparty including its own `Ref`, for each of the three types | unit | returned object carries the `Ref` Nova Poshta assigned |
| AC-05 update discriminant guard | an `update` payload missing a required field, or shaped for the wrong counterparty type, fails to compile | unit (compile-time fixture) | the incorrect payload is rejected by the type checker, never reaches runtime |
| AC-06 delete happy path | `delete` resolves the deleted counterparty's own `Ref` | unit | returned object carries the `Ref` of the removed counterparty |
| AC-07 empty-on-success write | a counterparty or contact-person write resolves to no value, not an error, when Nova Poshta reports success with an empty result | unit | call resolves `undefined`; no exception thrown |
| AC-08 contact-person save | saving a contact person under an existing counterparty resolves its own `Ref` | unit | returned object carries the assigned `Ref` |
| AC-09 contact-person update guard | a contact-person `update` payload missing any field fails to compile | unit (compile-time fixture) | the incomplete payload is rejected by the type checker |
| AC-10 contact-person delete | `delete` resolves the deleted contact person's own `Ref` | unit | returned object carries the `Ref` of the removed contact person |
| AC-11 convenience method | the chosen convenience method makes exactly one call and returns what the equivalent raw method would, with no extra filtering and no chained counterparty+contact-person call | unit | exactly one call recorded; result matches the equivalent raw-method call |
| AC-12 authoritative Ref source | the same lookup called twice issues two independent requests — nothing is cached or invented locally | unit | two separate calls recorded; no memoized or stale value returned on the second call |
| AC-13 no cross-context enforcement | updating/deleting a counterparty issues no additional call to check or affect its contact persons or `address`'s saved-address records | unit | exactly one call recorded for the update/delete itself, nothing else |
| AC-14 declined or malformed-on-success | a non-authorization decline (invalid `Ref`, missing field, business-rule rejection), or a successful envelope whose data doesn't match the method's documented shape, throws the library's standard error | unit | standard error thrown |
| AC-15 authorization / bad key / restricted key type | a write on a `Ref` outside the caller's own scope, any call with an invalid/expired key, or a contact-person call with a disallowed key type, is denied with the same standard error | unit | standard error thrown with Nova Poshta's message; nothing performed or revealed |
| AC-16 network/transport failure | a timeout, dropped connection, or non-JSON response throws the standard error instead of propagating unhandled or returning an empty-looking success | unit | standard error thrown; the call never resolves as if it had succeeded |
| AC-17 published-build discoverability | every in-scope method (raw + convenience) is declared as its own identifier in both the ESM and CJS published output | contract | both built declaration files list all in-scope identifiers |

### Edge cases / error paths

- A lookup's response comes back successful but `data` isn't array-shaped → standard error thrown (the array-shape check, inherited unchanged from `address`/`common`; same code path as AC-14, listed separately here because it's a distinct trigger condition).
- The catalog lookup's outer envelope is empty (no matching counterparty found by phone/last-name) → resolves an empty typed result, not an error, distinct from AC-07's write-specific empty-on-success behavior.
- The opt-in real-API integration smoke test runs against an unreachable/rate-limited Nova Poshta sandbox → the test fails or is skipped locally; it is never wired into a CI job that lacks the key, so this can't block a merge.

### Test data

- Seed strategy: none — `counterparty` holds no local entities (`data-model.md`: no schema change); unit tests build request/response fixtures inline, shaped like Nova Poshta's documented envelopes (matching `docs/adr/0003-testing-strategy.md`).
- Integration dependency: the one opt-in smoke test (AC-01/AC-02, `getCounterparties`) calls the real Nova Poshta API directly — not a throwaway container, since Nova Poshta is a third-party API this library doesn't own. Gated by `NOVA_POSHTA_TEST_API_KEY`, same as the existing `test/integration/` folder.
- Cleanup boundary: none needed — the smoke test only performs a read (`getCounterparties`); no write/state to clean up.

### NFR validation (load)

- `spec.md` §6 NFR row 4 — library-added overhead per call, median ≤5ms beyond the network round trip → scenario: 30+ repeated calls to a representative method (`getCounterparties`) with `fetch` stubbed to near-zero latency, assert the median added overhead ≤5ms. Runs in the project's existing test runner — no separate load tool needed.
- No other §6 NFR carries a number that implies sustained rate/duration load — the remaining rows are static/CI checks already captured in the AC coverage table above.

### CI placement

- Every PR: all unit tests (all 17 ACs) + the AC-17 contract check — fast, fully deterministic, no live API key required.
- Opt-in only, never blocking CI: the real-API integration smoke test — runs manually or on a schedule wherever `NOVA_POSHTA_TEST_API_KEY` is configured.
