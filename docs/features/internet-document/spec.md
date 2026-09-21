---
status: Draft
owner: "associate2coder"
reviewers: []
updated_at: "2026-09-21"
feature_size: "M"
---

# Spec — internet-document

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** `docs/features/counterparty/spec.md` and `src/modules/counterparty/index.ts` / `src/types/counterparty.ts` (the full-replace `update` convention and the return-`undefined`-on-empty-write convention, both reused unchanged), `docs/features/address/spec.md` (the Ref-resolution precedent this module builds on), Nova Poshta's official developer portal (`developers.novaposhta.ua` — blocked every automated fetch attempted while drafting this spec, the same blocker every prior spec in this repo has hit), and three independent community SDKs as the cross-check source for the in-scope method list and the `save`/`update` field shape: `platx/go-nova-poshta`'s `internetdocument` package, `maddsua/NovaPoshtaREST`, and `serj1chen/nova-poshta-sdk-php`'s `InternetDocument.php` class; no ticket/Confluence/knowledge-base channel available.

## 1. Context

Consuming developers building against this library today have no typed way to create, change, or cancel a Nova Poshta shipment — the same gap `address` closed for locations and `counterparty` closed for senders/recipients, but for the waybill itself. Without this module, a developer who has already resolved a sender Ref, a recipient Ref, and a warehouse or street Ref through this library's other modules still has to hand-roll the actual shipment-creation call, the price and delivery-date checks that precede it, and the print step that follows it, with none of this library's typed request/response shapes or its shared error contract.

This module is next because it is the natural follow-on to `address` and `counterparty`, in the roadmap's own build order: both already resolve every Ref a waybill needs (sender/recipient/contact-person from `counterparty`, city/street/warehouse from `address`), and two later roadmap steps — `scan-sheet` (batching waybills for courier handoff) and `additional-service` (returns, redirects, waybill edits) — cannot be specified until a waybill's own Ref and its printed waybill number exist for them to operate on.

The committed approach is one typed method per documented InternetDocument API call — a single flat `save` (not per-delivery-method convenience variants), full-replace `update`, single-or-batch `delete`, filterable `getDocumentList`, the two pre-creation calculators (`getDocumentPrice`, `getDocumentDeliveryDate`), and two Ref-preserving print-link methods — reusing `NovaPoshtaApiError` unchanged. Two upstream findings ground this: the competitive-research pass found no Nova-Poshta-specific SDK that types and documents the print-link sub-flow at all (it's either omitted entirely or left unverifiable) — this module's opportunity is being the first to make that quirk (the print methods return a plain hosted link, not JSON data) an explicit, tested, typed part of the same module rather than an undocumented gap a developer discovers at runtime. The failure-mode pass's sharpest finding is that routing a print call through the same envelope-unwrapping path every other method uses would either fail 100% of the time (the response isn't JSON) or, worse, silently succeed on a blank or error page during a save-then-print race — so printing is modeled as its own typed code path returning a URL string, never through `NovaPoshtaClient.request()`'s envelope unwrap. This satisfies the deep-dive's stated success criterion: close the roadmap's step 4 in full — creation, the two calculators, and printing together — not partially.

### In-scope InternetDocument API methods (as of 2026-09-21)

Cross-checked against `platx/go-nova-poshta`'s `internetdocument` package, `maddsua/NovaPoshtaREST`, and `serj1chen/nova-poshta-sdk-php`'s `InternetDocument.php` (Nova Poshta's own documentation portal blocked every automated fetch attempted while drafting this spec, so this list should be re-verified against the live/official docs before implementation locks — see the matching §8 open question):

1. `save` — create a new waybill; the required fields vary by delivery method (`ServiceType`: warehouse-to-warehouse, warehouse-to-door, door-to-warehouse, door-to-door) and by cargo type (parcel, cargo, documents, pallet) — see the discriminated-payload decision override below
2. `update` — full-replace an existing waybill's fields, matching `counterparty`'s identical convention
3. `delete` — remove one or more waybills by Ref in a single call (batch-capable — see the decision override on partial batch results below)
4. `getDocumentList` — list the caller's own waybills, filterable by date range and other documented parameters
5. `getDocumentPrice` — calculate the shipping price for a prospective shipment before creating it
6. `getDocumentDeliveryDate` — calculate the expected delivery date for a prospective shipment before creating it
7. `printDocument` — a print-ready link (PDF or HTML) for one or more existing waybills
8. `printMarkings` — a print-ready link (PDF or HTML) for one or more shipping labels

Every §5 acceptance criterion, the §6 "Method-surface completeness" row, and §7's matching KPI resolve against this list.

Traceability: module boundaries follow the same convention `address` and `counterparty` established (one folder per Nova Poshta model, dual ESM+CJS build, factory over the shared core client); the error contract reuses `NovaPoshtaApiError` unchanged; the full-replace `update` semantics and the return-`undefined`-on-empty-write behavior both reuse `address`'s ADR-0001, already scoped to extend to this module by name. AC-02's discriminated payload uses this module's own fixed, compile-time set of `ServiceType`/`CargoType` literal values — a closed list matching the same values `common`'s `getServiceTypes`/`getCargoTypes` lookup returns at runtime, but defined here as TypeScript literal types so AC-02's compile-time check is actually possible to build; `common`'s runtime lookup remains the source for displaying or working with those values dynamically elsewhere, but is not itself queried to build the discriminant. If Nova Poshta adds a new delivery method or cargo type, this module's literal types must be updated by hand — they do not automatically track `common`'s live list.

Decision override: `printDocument`/`printMarkings` return a plain hosted link (a URL string), never routed through the shared client's JSON-envelope unwrap — the failure-mode pass found that path either can't parse a non-JSON response at all, or worse, can't tell a genuine label from a blank/error page returned during a save-then-print race. These two methods are modeled as their own typed code path, distinct from every other method in this library, and documented as such rather than forced into the shared shape.

Decision override: the print link Nova Poshta issues carries the caller's own API key embedded in it (per the community SDKs cross-checked above — unconfirmed against the live/official docs, see §8). This library performs no redaction, scoping, or expiry of that link — it is exactly as powerful as the API key itself, and treating it as shareable is a real misuse a consuming developer can fall into by doing the obvious thing (rendering it as a link on a customer-facing page, emailing it, logging it). Documented explicitly in §5 (AC-13) and §6.1 rather than silently left for a developer to discover.

Decision override: a full-replace `update` call that omits a previously-set backward-delivery (cash-on-delivery) instruction clears it, exactly like every other omitted field — it is not carried forward. The failure-mode pass flagged this as a real risk (an address or phone correction that unintentionally clears the cash-to-collect instruction, delivering goods for free), but the fix is documentation and an explicit, tested AC (AC-06), not a partial-update mechanism this library's established full-replace convention doesn't otherwise use.

Decision override: a batch `delete` call's per-Ref outcome is represented individually, not collapsed into one overall success/failure — Nova Poshta's own envelope can report the call successful while individual Refs within it were rejected, and the failure-mode pass named the resulting silent half-success (a waybill the developer believes is cancelled but is still live and billable) as a distinct risk from the already-covered empty-on-success case (AC-05).

## 2. Goals

- Give every consuming developer typed, discoverable access to every documented InternetDocument method — waybill creation, full-replace update, single/batch delete, list/lookup, the two pre-creation calculators, and the two print-link methods.
- Preserve the delivery-method/cargo-type distinction as a discriminated type from `save` through `update`, so a consuming developer can't accidentally submit a payload shaped for the wrong `ServiceType`/`CargoType` combination.
- Make the print-link sub-flow and the batch-delete per-item outcome explicit, typed, and tested behaviors, rather than the undocumented gaps the competitive research found in every Nova-Poshta-specific alternative.
- Make `internet-document` the authoritative, typed source of waybill `Ref`/`IntDocNumber` values that `scan-sheet` and `additional-service` will depend on, mirroring the role `address` and `counterparty` already play for their own Refs.

## 3. Non-goals

- Currency conversion, unit checking, or any other validation of money-bearing fields (`Cost`, `AfterpaymentOnGoodsCost`, and other backward-delivery amounts) beyond TypeScript's compile-time numeric type. Reason: matches `address`/`counterparty`'s pass-through convention — Nova Poshta interprets every amount as UAH and is the source of truth for its own validation; this library adds no currency or precision logic of its own.
- Caching, reusing, or automatically linking a price or delivery-date estimate to a later `save` call. Reason: the library is stateless per its architecture; a developer who needs a fresh number at creation time must call the calculator again immediately before `save`.
- Redacting, scoping, or expiring the credential-bearing link `printDocument`/`printMarkings` return. Reason: that link's authentication mechanism is Nova Poshta's own design, external to this library, and this library performs no request signing or session management of its own to alter it.
- Chaining a price check, a delivery-date check, and `save` into one client-side convenience call. Reason: matches `counterparty`'s identical chaining non-goal — orchestrating three calls client-side risks a partial failure this stateless library can't roll back, and each calculator's result may no longer hold by the time `save` runs.
- Verifying that a sender/recipient/contact-person Ref or a city/street/warehouse Ref supplied to this module actually belongs to the caller's own account, or was resolved by `address`/`counterparty` rather than typed by hand. Reason: matches `counterparty`'s identical scoping limit (§3 non-goal on cross-module referential integrity, AC-13) — a bare Ref carries no compile-time information about its origin or ownership; Nova Poshta's own response is the sole judge of whether it's valid.
- Changing the shared core client (`src/client.ts`) to give the print methods a non-JSON transport path of their own. Reason: the distinct code path AC-11/AC-12 need (§1 decision override) is implemented entirely within this module's own files; extending shared infrastructure is explicitly out of the roadmap's scope (`docs/roadmap.md` "Out of scope") and would push this feature past its declared M size. **Amendment (review remediation, 2026-09-21):** this non-goal held for the print path but not for `delete` — AC-08's fix required a narrow, additive `requestEnvelope()` entry point on the shared client so `delete` could read Nova Poshta's own success-path warnings/errors for a rejected Ref's `Reason`; see ADR-0002's update and §8 OQ-2 below. **Amendment 2 (review remediation, third pass, 2026-09-21):** the print path itself also required one narrow, additive shared-client change after all — a public, read-only `apiKey` member on `NovaPoshtaClient` — because ADR-0003's construct-then-verify URL must embed the caller's key outside any `request()`/`requestEnvelope()` call; it is exposed non-enumerable (so `JSON.stringify`/`Object.keys`/`console.log` on the client never surface it) and documented at its declaration in `src/client.ts`. This is still a narrow, additive change to the shared client's surface, not the non-JSON transport path this non-goal rules out — see ADR-0003's updated Decision drivers/Consequences.

## 4. User stories

### US-01: Create a new waybill

**As a** consuming developer
**I want** to create a new Nova Poshta waybill using the sender, recipient, and location Refs I've already resolved
**So that** I can register a shipment for pickup or drop-off without leaving this library

### US-02: Get a price estimate before creating

**As a** consuming developer
**I want** to calculate the shipping price for a prospective shipment before I create it
**So that** I can show or charge an accurate cost ahead of committing to the shipment

### US-03: Get a delivery-date estimate before creating

**As a** consuming developer
**I want** to calculate the expected delivery date for a prospective shipment before I create it
**So that** I can set the right customer expectation ahead of committing to the shipment

### US-04: Get a typed payload matching my chosen delivery method

**As a** consuming developer
**I want** the fields `save`/`update` require to reflect the delivery method and cargo type I've actually chosen
**So that** I can't accidentally submit a payload shaped for a different delivery method than the one I intend

### US-05: Update an existing waybill

**As a** consuming developer
**I want** to update an existing waybill by supplying its complete replacement data
**So that** I can correct a mistake before the shipment moves, understanding that every field I don't include is cleared, not preserved

### US-06: Delete one or more existing waybills

**As a** consuming developer
**I want** to delete one or more waybills I no longer need, in a single call
**So that** I can cancel a shipment, or a batch of shipments, without leaving this library

### US-07: Get a clear, per-item result for a batch delete

**As a** consuming developer
**I want** a batch delete's result to tell me which specific waybills were removed and which weren't, with the reason for each
**So that** I never mistake a partially-failed batch for a fully successful one

### US-08: List or look up my own waybills

**As a** consuming developer
**I want** to fetch the waybills registered under my account, optionally filtered (for example, by date range)
**So that** I can review my own shipment history without hardcoding a separate call for every filter combination

### US-09: Get print-ready links for waybills and labels

**As a** consuming developer
**I want** a print-ready link for an existing waybill's document or shipping label
**So that** I can hand it to a printer or a courier without building that link myself

### US-10: Get a clear error on failure

**As a** consuming developer
**I want** any InternetDocument method call that fails — a decline from Nova Poshta, an invalid Ref, a network failure — to raise the library's standard error
**So that** I can handle it the same way I handle every other error from this library, without special-casing `internet-document`

### US-11: Rely on internet-document as the authoritative Ref source

**As a** consuming developer
**I want** `internet-document` to always return Nova Poshta's own live, current waybill Ref and IntDocNumber — never cached or invented locally — and to trust that it performs no re-validation of Refs I supply from `address`/`counterparty`
**So that** a later module (`scan-sheet`, `additional-service`) can treat its output as authoritative, while I understand that Nova Poshta itself, not this library, is what actually checks a Ref I pass in

### US-12: Discover the full set of available methods

**As a** consuming developer
**I want** to see every InternetDocument method the library exposes as a distinct, named typed method
**So that** I can find the right one for my use case without cross-referencing Nova Poshta's raw API docs

## 5. Acceptance criteria

> Every "standard error" referenced below is `NovaPoshtaApiError` (per CLAUDE.md), reused unchanged from `address`/`counterparty`'s convention.

### AC-01 (US-01) — happy path

**Given** a consuming developer holds a valid API key, a sender Ref, a recipient Ref, and the location Refs their chosen delivery method requires
**When** they save a new waybill
**Then** the system records it with Nova Poshta and returns the created waybill's own Ref and its printed waybill number (IntDocNumber) — or nothing, per AC-05, when Nova Poshta reports success but returns no record

### AC-02 (US-04) — domain invariant

**Given** a consuming developer wants to create or update a waybill for a specific delivery method (warehouse-to-warehouse, warehouse-to-door, door-to-warehouse, or door-to-door)
**When** they build the payload
**Then** the type system requires exactly the location fields that delivery method's sender leg AND recipient leg each need (for example, a warehouse Ref for a leg ending at a warehouse, a street/building/flat for a leg ending at a door — enforced independently on both the sender side and the recipient side) and rejects a payload mixing location fields belonging to a different leg, at compile time — this checks the payload's own internal consistency only; it cannot verify that a warehouse or street Ref actually resolves to a real, matching location, which surfaces instead as Nova Poshta's own runtime decline (AC-14). `CargoType` is a plain discriminant field, not a structural variant axis — no cross-checked source confirms Nova Poshta's wire format varies required fields by cargo type (see ADR-0004, superseding ADR-0001's original two-axis design); a wrong `CargoType`/field combination, if one is later confirmed to exist, surfaces at runtime (AC-14) rather than at compile time — tracked in §8 OQ-1/OQ-3

### AC-03 (US-02) — happy path

**Given** a consuming developer holds a valid API key and the fields a price estimate requires
**When** they request a price calculation for a prospective shipment
**Then** the system returns exactly Nova Poshta's calculated price as typed data, performing no client-side recalculation, and the result carries no link back to any later `save` call — a developer who needs the number to still hold at creation time must request it again immediately before saving (see §3 non-goal)

### AC-04 (US-03) — happy path

**Given** a consuming developer holds a valid API key and the fields a delivery-date estimate requires
**When** they request a delivery-date calculation for a prospective shipment
**Then** the system returns exactly Nova Poshta's calculated date as typed data, with the same no-linkage behavior as AC-03

### AC-05 (US-01) — domain invariant

**Given** a consuming developer performs a waybill write (save or update)
**When** Nova Poshta reports the write as successful but the returned data is an empty list rather than the saved/updated record
**Then** the system represents that outcome accurately as a successful write with no record to return — distinct from a malformed or non-list response, which already raises the standard error (see AC-14) — rather than crashing on the assumption a record is always present. `delete`'s empty-on-success case is represented differently — see AC-07/AC-08, which always return one outcome entry per submitted Ref rather than nothing

### AC-06 (US-05) — domain invariant

**Given** a consuming developer wants to update an existing waybill that has a backward-delivery (cash-on-delivery) instruction on it
**When** they call update without including that instruction in the new payload
**Then** the system clears it, exactly as it would clear any other omitted field under this library's full-replace convention — an omitted backward-delivery instruction is never carried forward from the previous version, so a developer intending to keep it must resupply it explicitly

### AC-07 (US-06) — happy path

**Given** a consuming developer holds the Ref of one or more of their own waybills
**When** they delete them in a single call
**Then** the system removes them and returns one outcome entry per submitted Ref confirming each was removed — including a single-Ref call, which returns a one-element array rather than nothing; see AC-08 for the case where not every Ref succeeds

### AC-08 (US-07) — error

**Given** a consuming developer submits multiple waybill Refs to delete in one call
**When** Nova Poshta's response reports the overall call successful but some of the submitted Refs were rejected while others were removed
**Then** the system represents the outcome per Ref — which were removed, which were not, and Nova Poshta's own reason for each rejected one — as part of the same per-Ref outcome array every `delete` call returns (AC-07), never collapsing the batch into one overall success/failure boolean, and never throwing for a partial rejection (a full network or malformed-response failure still raises the standard error per AC-14/AC-16)

### AC-09 (US-08) — happy path

**Given** a consuming developer holds a valid API key
**When** they request their own waybill list
**Then** the system returns exactly the page of Nova Poshta's documented data as a typed array — every documented `getDocumentList` parameter, including any date-range field, stays optional at the type level, so a call with no filters at all is valid TypeScript; if Nova Poshta's own endpoint then rejects an empty query, that surfaces as the standard error (see AC-14), not as a compile-time restriction this library adds. For parameters that include pagination, the library passes them through when supplied but never auto-walks multiple pages or injects a default the developer didn't supply, and gives no signal, explicit or implicit, of whether more results exist beyond the returned page (matches `counterparty`'s identical pagination decision, inherited as a known limitation — see §8)

### AC-10 (US-08) — happy path

**Given** a consuming developer holds a valid API key
**When** they request their waybill list using one of that method's documented filter parameters (for example, a date range)
**Then** the system passes the filter to Nova Poshta and returns exactly what Nova Poshta responds with, typed the same as the unfiltered list, performing no client-side re-filtering

### AC-11 (US-09) — happy path

**Given** a consuming developer holds the Ref(s) of one or more existing waybills
**When** they request a print-ready link for the waybill document(s)
**Then** the system returns a single URL string covering all requested waybills — Nova Poshta issues one combined printable document per call, not one link per Ref (unconfirmed against the live/official docs, see §8 OQ-1) — without routing the request through this library's shared JSON-envelope handling (see §1 decision override) — a failure to obtain the link (an invalid Ref, a document Nova Poshta hasn't finished materializing) raises the standard error rather than returning a link that resolves to a blank or error page

### AC-12 (US-09) — happy path

**Given** a consuming developer holds the Ref(s) of one or more existing waybills
**When** they request a print-ready link for the shipping label
**Then** the system returns it with the same contract as AC-11 (a single URL string covering all requested labels), for the label rather than the waybill document

### AC-13 (US-09) — domain invariant

**Given** a consuming developer receives a print-ready link from either print method
**When** they store, display, or transmit that link
**Then** the system's documented contract is that the link carries live authentication equivalent to the caller's own API key — this library performs no redaction, scoping, or expiry of it, so the developer is responsible for treating it with the same care as the API key itself, not as an ordinary shareable document link (see §3 non-goal, §6.1)

### AC-14 (US-10) — error

**Given** a consuming developer calls any InternetDocument method
**When** Nova Poshta declines the request for a reason other than the API key itself (an invalid Ref, a missing required field, a business-rule rejection), or reports the call successful but returns data that doesn't match that method's documented shape
**Then** the system raises the standard error containing Nova Poshta's own explanation where one is given, rather than returning an empty or partial result that looks like a valid outcome

### AC-15 (US-10) — authorization

**Given** a consuming developer calls a write or list method for a waybill Ref that doesn't belong to their own API key, or calls any method with an invalid or expired API key
**When** the request reaches Nova Poshta
**Then** Nova Poshta denies the request and the system surfaces that denial by raising the standard error, passing through Nova Poshta's own message as-is, rather than performing or revealing the operation — the library performs no independent ownership check of its own (see AC-18); Nova Poshta's response is the sole judge of whether a Ref belongs to the caller

### AC-16 (US-10) — error

**Given** a consuming developer calls any InternetDocument method
**When** the network call to Nova Poshta fails before a response is received (a timeout, a dropped connection, or a response that isn't valid JSON)
**Then** the system raises the standard error rather than letting the failure propagate unhandled or returning an empty result that looks like a valid response

### AC-17 (US-11) — cross-context

**Given** `scan-sheet` or `additional-service` will eventually accept a waybill Ref or IntDocNumber
**When** a consuming developer resolves that value through `internet-document`
**Then** the value returned is the authoritative, current one from Nova Poshta at the moment of the call — never a value invented or cached by this library — so any module that later accepts that same Ref/IntDocNumber can treat `internet-document`'s output as the single source for it; this guarantee applies to the value when one is returned — per AC-05, a successful `save` may also legitimately return no record at all (Nova Poshta reported success but gave nothing back), in which case there is simply no Ref/IntDocNumber yet for a later module to consume, and a caller must handle that case the same way it already must for `update`/`delete`

### AC-18 (US-11) — cross-context

**Given** a consuming developer supplies a sender/recipient/contact-person Ref (from `counterparty`) or a city/street/warehouse Ref (from `address`) when calling an InternetDocument method
**When** the request reaches Nova Poshta
**Then** the system performs no local check of whether that Ref is current, valid, or belongs to the caller's account — Nova Poshta's own response is the sole judge, and any mismatch surfaces as the standard error (AC-14), not as a check this library performs itself (see §3 non-goal)

### AC-19 (US-12) — happy path

**Given** a consuming developer wants to know which InternetDocument methods are available
**When** they browse the library's exported `internet-document` module methods via their editor's autocomplete against the library's *published* package output — the type declaration files shipped in both the ESM and CJS builds
**Then** every in-scope method (all 8 listed in §1) appears as its own distinctly named, typed method in both published builds — verified automatically in CI by a post-build step that imports the built package output (not the source) in both module formats and type-checks the method surface against this list

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Type-safety coverage | 100% of in-scope InternetDocument methods have zero `any` in public signatures | static check in CI |
| Error-contract coverage | 100% of in-scope methods throw the standard error (`NovaPoshtaApiError`) on any declined response, malformed response, or network failure; 0% throw an unhandled error type | unit test suite (`test/unit/modules/internet-document`) |
| Save/update discriminant guard | 100% of calls to `save`/`update` fail to compile if any field the chosen delivery method's sender or recipient leg requires is omitted, OR if the payload mixes location fields belonging to a different leg (payload-internal consistency only, per AC-02; `CargoType` is a plain field, not part of this structural guard — ADR-0004) | static check in CI (type-level test) |
| Batch-delete result fidelity | 100% of `delete` calls, single-Ref or batch, return a per-Ref outcome array, never a single collapsed boolean, whether Nova Poshta reports full success or a mixed result (AC-07, AC-08) | unit test suite |
| Library-added overhead per call | Median total call time ≤ 5ms, measured with `fetch` stubbed to near-zero latency (no client-side caching, retries, or heavy parsing) | median across ≥30 repeated calls per method, covering all 8 in-scope methods including `printDocument`/`printMarkings`; timed from the typed method call to its returned promise resolving, using a representative single-waybill payload (not a large batch or a full list page), with `fetch` stubbed to near-zero latency, benchmarked inside `test/unit/modules/internet-document` (always runs in CI) |
| Method-surface completeness | 100% of the 8 methods enumerated in §1 have a corresponding typed method | manual audit against the three cross-checked community SDKs before release; §8 open question separately tracks re-verifying against Nova Poshta's official docs once reachable |
| Published-build type-surface check | 100% of in-scope methods importable and typed from the built ESM and CJS output, not just the source (see AC-19) | automated post-build step that imports the built package output in both module formats and type-checks the method surface; always runs in CI |

## 6.1 Security / privacy

- **Data classification:** confidential — a waybill carries the same sender/recipient personal or business identity data `counterparty` already classifies as confidential, plus money fields (declared value, cash-on-delivery/backward-delivery amounts) this library has not carried before.
- **Personal data touched:** yes — a waybill embeds the sender's and recipient's identity data (through their Refs, and any raw contact fields Nova Poshta's `save`/`update` also accept directly) and the shipment's financial details.
- **AuthZ/AuthN impact:** none beyond what's already fixed for the whole library — every call authenticates via the caller's own Nova Poshta API key; `internet-document` introduces no new permission tiers of its own.
- **Known consideration (unverified assumption):** the print-link methods' returned URL embeds the caller's API key directly, per the community SDKs cross-checked in §1 — not confirmed against a live API response, since this spec's own drafting could not reach Nova Poshta's official documentation (see §8 OQ-1, which now also tracks this specific assumption). If confirmed, any holder of a shared print link can act with the caller's full account privileges, not merely view a document — this is documented in AC-13 and should be confirmed before this security review is considered complete.
- **Abuse cases:**
  - Attempting to update, delete, or list a waybill Ref belonging to a different account: denied by Nova Poshta, surfaced as the standard error (see AC-15).
  - Redistributing a print-ready link outside the developer's own trusted systems (a customer-facing page, an email, a third-party log): the library performs no redaction, expiry, or scoping of that link (see AC-13) — a holder of the link may be able to act with the caller's account privileges, not just view the document.
  - Submitting a save/update payload with money fields (`Cost`, backward-delivery amounts) denominated in the wrong currency or unit: the library performs no currency or unit validation (see §3 non-goal) — the declared value and any cash-on-delivery charge are only as correct as what the developer supplies.
- **Security review:** Required — new money-bearing fields, a credential-bearing return value (the print link), and personal data at write time; matches and exceeds `counterparty`'s posture.

## 7. Metrics / KPIs

- **Type-safety completeness** — baseline: 0% (module doesn't exist yet), target: 100% of in-scope InternetDocument methods carry no `any` in their public signature, verified in the first release containing this feature.
- **Zero silent failures** — baseline: N/A (feature doesn't exist), target: 100% of unit tests asserting that a declined, malformed, or network-failed call throws `NovaPoshtaApiError`, passing before merge.
- **Method-surface completeness** — baseline: 0 of the 8 documented methods exposed, target: all 8 have a shipped typed method before this feature is marked done.
- **Write-safety** — baseline: N/A (feature doesn't exist), target: 0 GitHub issues within 90 days of release reporting that an `update` call silently cleared a previously-set backward-delivery instruction, or that a batch `delete` call was misreported as fully successful when some Refs were actually rejected.

## 8. Open questions

- [ ] Re-verify the 8-method InternetDocument surface (§1), the full `save`/`update` field shape per delivery-method/cargo-type combination, whether the print-link methods' URL genuinely embeds the caller's API key (AC-13, §6.1), whether the print methods genuinely return one combined link per call rather than one per Ref (AC-11, AC-12), what format/parameter options (PDF vs HTML, copies, label size) the print methods' typed request should expose, AND how a caller can tell a print request failed given the print path does not read a JSON envelope (AC-11, AC-12, §1 decision override) — all against Nova Poshta's live/official documentation once reachable. This spec's own drafting confirmed the portal still blocks automated fetches, and all of the above are currently inferred from community SDKs rather than the official source. Default now: proceed on the cross-checked list, the credential-embedding assumption, and the single-combined-link assumption, to be confirmed by live API calls. **Sharpened (review remediation, third pass, 2026-09-21):** the shipped verification (`GET` + discard body, ADR-0003 amendment) can only detect a non-2xx status — it cannot detect a blank/error HTML page returned with a `200` status, which is exactly the save-then-print-race risk AC-11 was written to guard against. Re-verifying against the live docs should specifically determine whether Nova Poshta's print endpoint signals that failure mode some other way (a response header, a body marker) this library could check without holding the body open. — owner: Tech Lead, due: before next release (`sdd:ship internet-document`)
- [ ] Should the shared core client be extended to expose Nova Poshta's pagination metadata (`totalCount`) for `getDocumentList`? `address` and `counterparty` both deferred this; carried forward unchanged here since `getDocumentList` is the same kind of growing, transactional list as `getCounterparties`. Default now: known limitation, not fixed in this feature (see AC-09). **Narrowed (review remediation, 2026-09-21):** success-path *warnings* are no longer part of this open question — `client.ts` gained `requestEnvelope()`, which exposes them, to fix AC-08's rejected-delete-reason bug; only `totalCount`/pagination metadata remains undecided. — owner: Tech Lead, due: before `sdd:design` of any module whose lookups depend on complete, multi-page results
- [ ] What type-level mechanism should `design` use to model the discriminated `ServiceType`/`CargoType` payload for `save`/`update` (AC-02), given that a naive reuse of `counterparty`'s own discriminated-union mechanism was built around a different axis (counterparty type, not delivery method × cargo type)? This also covers the still-undocumented question of which exact fields each of the up to 16 delivery-method × cargo-type combinations actually requires — not just how the compile-time check is implemented, but what it checks against. Default now: flagged for `design` to solve explicitly, scoped to this module's own types only, cross-checked against the same three community SDKs used elsewhere in this spec pending official docs. — owner: Tech Lead, due: before `sdd:design internet-document`
- [ ] Should the print-link methods' return type carry a stronger developer-facing warning (a distinct wrapper type, a doc comment enforced by lint) about the embedded-credential risk (AC-13), beyond what's written in this spec and the eventual API docs? Default now: document only, no code-level warning mechanism decided yet. — owner: Tech Lead, due: before `sdd:ship internet-document`
- [ ] Confirm whether `delete`'s per-Ref outcome (AC-08) is actually distinguishable in Nova Poshta's live response shape, or whether the "mixed batch result" risk the failure-mode pass identified is purely theoretical for this endpoint. Default now: build AC-08's per-Ref representation defensively; downgrade to a simpler contract if the live API never actually returns a mixed result. — owner: Tech Lead, due: before `sdd:design internet-document`
- [ ] AC-19's published-build check (`test/unit/build-surface.test.ts`) verifies the method surface by text-matching the built `.d.ts`/`.d.cts` declaration files rather than importing the built package and type-checking it — so a method shipped with a wrong or `any` signature would still pass. This gap is pre-existing and shared by `address` and `counterparty`'s equivalent checks (found during `internet-document`'s review, 2026-09-21), not unique to this module. Default now: leave as-is for `internet-document`, consistent with its siblings; fix as one cross-module change rather than diverging per-module. — owner: Tech Lead, due: before the next module's AC-19-equivalent is written
