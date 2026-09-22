---
status: Draft
owner: "associate2coder"
reviewers: []
updated_at: "2026-09-22"
feature_size: "S"
---

# Spec — tracking-document

> **Glossary:** [CONTEXT](../../../CONTEXT.md) (includes a new "tracking status" entry added while drafting this spec — see §1 Decision override)
> **Reference module / docs / channels used:** `docs/architecture-map.md`, `docs/roadmap.md`; `src/modules/address/index.ts` + `docs/features/address/spec.md` and `docs/features/common/spec.md` as the closest structural/read-mostly precedents; `src/types/internet-document.ts` (existing `StateId`/`StateName` fields and the hardcode-and-hand-sync precedent for status-like values); Nova Poshta's official developer portal — blocked (a direct fetch of `developers.novaposhta.ua/documentation` and of the method's own doc URL both returned HTTP 403; the one reachable Wayback Machine snapshot of the documentation page is an empty client-rendered shell with no method content, same blocker every shipped spec in this repo has already hit); cross-checked instead against four independent, actively-maintained community SDKs — `platx/go-nova-poshta`'s `api/trackingdocument` package (Go request/response/enum source, quoted below), `maddsua/NovaPoshtaREST`'s `lib/models/TrackingDocument.ts` (TypeScript interface, quoted below), `daaner/NovaPoshta`'s `src/Models/TrackingDocument.php` + its doc page (PHP implementation, quoted below), and `sirkostya009/go-novapost`'s `tracking_document.go` (a second independent Go implementation whose doc-comment reproduces the full 21-value status-code list, quoted below, and adds two facts the other three don't state: a documented ~100-document batch ceiling and that this one method doesn't require an API key) — all four agree field-for-field on the request shape and response field set; plus a competitive-research pass over three shipping-carrier SDKs (EasyPost, AfterShip, Shippo) for status-typing and batching conventions; no ticket/Confluence/knowledge-base channel available.

## 1. Context

Consuming developers building against this library can already create a shipment (`internet-document`) but have no typed way to check where it actually is — their only options today are to hand-roll an untyped call against Nova Poshta's tracking endpoint, or maintain their own type definitions for it, the same gap `common`, `address`, and `counterparty` already closed for their own slices of the API.

This module is next on the roadmap, and deliberately kept independent of `internet-document` rather than folded into it: tracking has to work for any waybill number, not only ones this library itself created. A consuming developer who receives a marketplace order shipped by someone else, imports historical shipments created through Nova Poshta's own portal, or otherwise only ever holds a bare waybill number needs tracking to work the same way — this module accepts a plain waybill number and nothing else, with no dependency on any `Ref` or record `internet-document` produced.

The committed approach is to ship one typed method for Nova Poshta's one real `TrackingDocument` API method (`getStatusDocuments` — confirmed as this model's *only* method by reading all four cross-checked SDKs' source directly; none document a second one), passing its request straight through, plus one convenience method for the common single-waybill case — the same raw-plus-convenience shape `address` already established. Every status value is typed open/provisional rather than as a closed enum: this project's own `internet-document` postmortem (ADR-0005 — a closed-enum assumption under-counted Nova Poshta's real wire values and needed a post-ship fix) and the competitive-research pass both point the same way — EasyPost's and AfterShip's own SDKs type shipment status as a plain open string even though their docs publish a "current" closed enum, specifically so a new carrier/status value doesn't break a consumer's type-checks the moment the vendor adds one.

Traceability: module boundaries follow the same convention `common`/`address`/`counterparty` already established (one folder per Nova Poshta model, dual ESM+CJS build, factory over the shared core client); the error contract reuses `NovaPoshtaApiError` unchanged.

Decision override: self-contained, no dependency on `common` — tracking-document does not call into or import from the already-shipped `common` module, even though `common` exports a same-concept-*sounding* `DocumentStatus` reference-list type. Nothing confirms `common.getDocumentStatuses()`'s Ref/Description values correspond one-to-one with `TrackingDocument`'s numeric `StatusCode` field — they're fetched via unrelated calls, and no source consulted while building this spec cross-references the two. Worse, the library already has a *third*, independently-hardcoded status representation: `internet-document`'s `GetDocumentListItem.StateId`/`StateName` (`src/types/internet-document.ts:215-216`), never unified with `common`'s either. Reconciling all three into one shared status type is real future work (see §8 OQ) but is a cross-module change bigger than any single domain module's spec — this module follows the precedent `internet-document` already set for `ServiceType`/`CargoType`: define its own status representation, kept in sync by hand, open/provisional rather than closed. See CONTEXT.md's new "tracking status" glossary entry, added while drafting this spec per the project's glossary-reconciliation rule.

Decision override: match returned records by identity, not by position — nothing in any of the four cross-checked SDKs guarantees Nova Poshta's response preserves the request array's order, or returns exactly one record per requested document (silent dedup, dropped-unknown, or reordering are all undocumented possibilities — none of the four source type definitions rule them out, which is not the same as confirming they can't happen). This is the same shape of risk that produced this project's ADR-0005 incident: an unverified assumption about a `Documents[]`-style array shipped, then needed a dedicated post-ship fix. To prevent a cross-shipment mixup (parcel A's page silently rendering parcel B's recipient name or address — a privacy incident, not just a display bug), every acceptance criterion below that touches more than one document requires identifying each returned record by its own waybill-number field, never by array index (see AC-05).

### In-scope TrackingDocument API methods (as of 2026-09-22)

1. `getStatusDocuments` — the model's only real Nova Poshta method. Given one or more waybill numbers (each optionally paired with a phone number), returns one status record per document: delivery status (a numeric code plus a human-readable description), recipient/sender/warehouse detail, and a set of forward-looking flags Nova Poshta itself uses to gate later actions (e.g. whether a redirect or return can currently be created for that shipment).

Convenience (additive on top of the method above, not a replacement — per §2):

- a single-waybill convenience method taking a plain waybill number (and optional phone) as direct arguments instead of requiring a one-item array — the same shape this spec's competitive-research pass found in every comparable courier SDK reviewed (EasyPost, AfterShip) and in the Nova Poshta PHP SDK's own `checkTTN` helper, none of which are separate Nova Poshta API methods — each is that SDK's own convenience wrapper over this one call.

Quoted source (three of the four independent, agreeing confirmations of the request shape — the fourth, `sirkostya009/go-novapost`, is quoted separately below alongside the status-code enum):

```go
// platx/go-nova-poshta, api/trackingdocument/request.go
type DocumentFilter struct {
	DocumentNumber string `json:"DocumentNumber"`
	Phone          string `json:"Phone"`
}
type GetStatusDocumentsReq struct {
	Documents []DocumentFilter
}

// api/trackingdocument/model.go — the interface's only method:
type Model interface {
	api.Model
	// GetStatusDocuments https://developers.novaposhta.ua/view/model/a99d2f28-8512-11ec-8ced-005056b2dbe1/method/a9ae7bc9-8512-11ec-8ced-005056b2dbe1
	GetStatusDocuments(GetStatusDocumentsReq) (GetStatusDocumentsRes, error)
}
```

```ts
// maddsua/NovaPoshtaREST, lib/models/TrackingDocument.ts
export const getStatusDocuments = async (apiToken: string, props: {
	Documents: Array<{
		DocumentNumber: string;
		Phone: string;
	}>
}) => await mkRestRequest(Object.assign(sharedProps, {
	apiKey: apiToken,
	calledMethod: 'getStatusDocuments',
	methodProperties: props
})) as i_getStatusDocuments_result;
```

```php
// daaner/NovaPoshta, src/Models/TrackingDocument.php
public function getStatusDocuments($documents): array
{
    $this->calledMethod = 'getStatusDocuments';
    // ...
    $methodProperties = ['Documents' => array_values($documents)];
    return $this->getResponse($this->model, $this->calledMethod, $methodProperties, false);
}
```

All four agree, field-for-field, on the request shape (`Documents: [{ DocumentNumber, Phone }]`) and that this is the model's only method — `checkTTN`/`getStatusTTN` (the PHP SDK's own convenience wrappers, confirmed by reading their source: both just call `getStatusDocuments` internally) are not separate Nova Poshta methods. Every §5 acceptance criterion and the §6 "Method-surface completeness" row resolve against this one raw method plus its one convenience wrapper.

**Response shape** (the source for §6.1's PII field list — three of the four sources independently type the same field set; trimmed here to the fields §6.1 relies on, full struct in `platx/go-nova-poshta`'s `api/trackingdocument/response.go`):

```go
// platx/go-nova-poshta, api/trackingdocument/response.go — DocumentStatus struct (91 fields; PII-relevant subset shown)
type DocumentStatus struct {
	Number             string                 `json:"Number"`
	Status             string                 `json:"Status"`
	StatusCode         TrackingDocumentStatus `json:"StatusCode"`
	RecipientFullName  string                 `json:"RecipientFullName"`
	RecipientAddress   string                 `json:"RecipientAddress"`
	PhoneRecipient     string                 `json:"PhoneRecipient"`
	PhoneSender        string                 `json:"PhoneSender"`
	WarehouseRecipient string                 `json:"WarehouseRecipient"`
	WarehouseSender    string                 `json:"WarehouseSender"`
	// ... 82 further fields (dates, cost, possibility-* flags, city/settlement Refs, etc.)
}
```

`sirkostya009/go-novapost`'s independent `StatusDocument` struct (`tracking_document.go`) and `maddsua/NovaPoshtaREST`'s `i_getStatusDocuments_result` interface both declare the identical field names above (`Number`, `Status`, `StatusCode`, `RecipientFullName`, `RecipientAddress`, `PhoneRecipient`, `PhoneSender`, `WarehouseRecipient`, `WarehouseSender`) — three-way agreement on the PII-relevant subset, which is what §6.1's data classification rests on.

**Resolved during clarify:** the module types every one of the 91 documented fields in `DocumentStatus` (not just the PII-relevant subset trimmed above for readability), matching `address`/`common`'s existing precedent of exhaustive field typing rather than a partial type plus a catch-all — per §6's "zero `any` in public signatures" target. This is a genuine sizing risk against the feature's current `S` estimate; `classify-size` should be re-run once `sdd:tasks` breaks the work down, since the module's actual field count is materially larger than the ~12 fields quoted above.

**Correction (api-contract pass, 2026-09-22):** the "91 fields" figure above was an inaccurate estimate — re-fetching both cross-checked SDKs' *current* source during the `api` skill's contract-derivation pass (per CLAUDE.md's sourcing policy) found `platx/go-nova-poshta`'s `DocumentStatus` struct actually declares **114** fields and `maddsua/NovaPoshtaREST`'s `i_getStatusDocuments_result` declares **105** — a **118-field union** once deduplicated by name (103 fields both agree on, 11 Go-only, 4 TypeScript-only). `docs/features/tracking-document/contracts/public-api.md` §2 now types the full 118-field union (forward-compatible per AC-07, not the intersection) — see `contracts/api-sync-report.md` for the full field-origins table and per-field confidence.

**Status-code semantics** (the source for AC-06's "not found is data, not an error" claim — two independent sources, not the CONTEXT.md glossary entry that merely restates this):

```go
// platx/go-nova-poshta, api/trackingdocument/enum.go
const (
	TrackingDocumentStatusCreatedBySender TrackingDocumentStatus = 1 // "Відправник самостійно створив цю накладну, але ще не надав до відправки"
	TrackingDocumentStatusRemoved         TrackingDocumentStatus = 2 // "Видалено"
	TrackingDocumentStatusNotFound        TrackingDocumentStatus = 3 // "Номер не знайдено"
	// ... 18 further values (4, 41, 5-12, 101-106, 111-112) covering in-transit/delivered/returned states
)
```

```go
// sirkostya009/go-novapost, tracking_document.go — doc-comment above GetStatusDocuments,
// independently reproducing the same 21-value list with matching numbers and Ukrainian text:
// 1  Відправник самостійно створив цю накладну, але ще не надав до відправки
// 2  Видалено
// 3  Номер не знайдено
// ...(4, 41, 5-12, 101-106, 111-112 — identical set to platx's enum.go above)
//
// Метод дозволяє переглядати одночасно до 100 відправлень.  ("The method allows viewing up to 100 shipments at once")
// Доступність: Не вимагає використання API-ключа.            ("Availability: does not require use of an API key")
```

Both sources agree exactly on the 21-value status-code set, including that codes 2 ("Removed") and 3 ("Not found") are themselves normal status values — this is what AC-06 rests on, not the CONTEXT.md "tracking status" glossary entry (which only restates it for readability; CLAUDE.md's sourcing policy requires the upstream struct itself, quoted above). `sirkostya009`'s doc-comment is also the only source that states a batch ceiling (~100 documents) and the no-API-key-required note — both are new findings folded into §8's open questions and §6.1 below, since no other of the four sources confirms or contradicts either one.

## 2. Goals

- Give every consuming developer a typed, discoverable way to check a shipment's live tracking status by waybill number, eliminating hand-rolled untyped calls for this one remaining read.
- Keep tracking fully decoupled from shipment creation — any waybill number works, regardless of whether `internet-document` (or this library at all) created it.
- Represent every status value Nova Poshta returns honestly and completely: a not-yet-seen status code is preserved rather than dropped, and a "not found"/"removed" outcome is returned as data rather than raised as an error, since that's how Nova Poshta itself reports it.

## 3. Non-goals

- Any dependency on the `common` module (or vice versa) to resolve a status code's description. Reason: see §1 Decision override — nothing confirms the two status vocabularies correspond, and building a cross-reference between them risks shipping something subtly wrong.
- Reconciling `common`'s `DocumentStatus`, `internet-document`'s `StateId`/`StateName`, and this module's status representation into one shared type. Reason: real future work, but a cross-module change bigger than this S-sized module — tracked as an open question (§8).
- Caching tracking results, adding client-side rate-limiting, or backing off automatically when a consuming developer polls a waybill repeatedly. Reason: matches the library's existing stateless, no-caching convention (`common`/`address`/`counterparty`'s same non-goal) — though this is flagged explicitly in §6.1 as a first-time-relevant risk, since tracking is the read endpoint most likely to be polled on an interval.
- Capping, splitting, or otherwise client-side-validating how many waybills go into one `Documents` array call. Reason: matches the library's pass-through convention; one source documents a ~100-document ceiling (§1, §8 OQ) but enforcing it is Nova Poshta's own behavior, not this library's.

## 4. User stories

### US-01: Track a shipment by waybill number

**As a** consuming developer
**I want** to look up a shipment's current status using its waybill number
**So that** I can show where a parcel is without leaving this library

### US-02: Track with a phone number for a fuller record

**As a** consuming developer
**I want** to optionally include a phone number when tracking a waybill
**So that** I get back whatever additional detail Nova Poshta releases when the phone matches its own records

### US-03: Track several shipments in one call

**As a** consuming developer
**I want** to check the status of multiple waybills in a single call
**So that** tracking a whole order or batch of parcels doesn't cost one round trip per package

### US-04: Track a single shipment without building an array

**As a** consuming developer
**I want** a convenience method that takes one waybill number directly
**So that** the common case of checking a single package doesn't require me to construct a one-item list myself

### US-05: Get forward-compatible, typed results

**As a** consuming developer
**I want** every returned status value expressed as typed data, including status codes this library's authors haven't seen before
**So that** Nova Poshta adding a new status code doesn't silently break my code or drop data I'd otherwise receive

### US-06: Get a clear error on failure

**As a** consuming developer
**I want** a tracking request that fails outright — a bad key, a network failure, or Nova Poshta declining the call itself — to raise the library's standard error
**So that** I can handle it the same way I handle every other error from this library, without special-casing tracking-document

### US-07: Track a shipment regardless of who created it

**As a** consuming developer
**I want** to track any waybill number — one created through this library's `internet-document` module, through Nova Poshta's own portal, or by a third party entirely
**So that** my tracking code works uniformly no matter where the shipment originated

## 5. Acceptance criteria

> Every "standard error" referenced below is `NovaPoshtaApiError` (per CLAUDE.md), reused unchanged from every sibling module's convention.

### AC-01 (US-01) — happy path

**Given** a consuming developer holds a valid API key and a shipment's waybill number
**When** they request that waybill's tracking status
**Then** the system returns the status record Nova Poshta reports for it as typed data, including its status code and human-readable description

### AC-02 (US-02) — happy path

**Given** a consuming developer holds a valid API key, a waybill number, and its matching phone number
**When** they request the tracking status with the phone number included
**Then** the system passes the phone number to Nova Poshta unchanged and returns exactly what Nova Poshta responds with — the library performs no client-side validation of the phone number's format and never fabricates, checks, or infers a phone number on the developer's behalf. **Resolved during clarify:** when no phone number is supplied, the system sends the phone field to Nova Poshta as an empty string rather than omitting it — matching the always-present string shape every cross-checked source documents for this field, so the request's shape never varies depending on whether a phone number was given

### AC-03 (US-03) — happy path

**Given** a consuming developer holds a valid API key and more than one waybill number
**When** they request tracking status for the whole set in a single call
**Then** the system passes every waybill through to Nova Poshta in that one call and returns typed status records for whatever Nova Poshta sends back — the library does not split the request into multiple calls, cap the list, or reorder it itself

### AC-04 (US-04) — happy path

**Given** a consuming developer holds a valid API key and a single waybill number
**When** they call the single-waybill convenience method
**Then** the system makes exactly one call to Nova Poshta carrying just that one waybill (and phone number, if supplied), locates its single result by matching a returned record's own waybill-number field against the one requested — never by blindly taking whichever record comes back first — and returns that typed record. **Resolved during clarify:** the waybill-number match is an exact comparison of the raw string values, with no trimming, case-folding, or reformatting on either side; if no returned record's waybill-number field matches what was requested, the convenience method resolves with no value (not an error) rather than handing back a different shipment's data — distinct from AC-06's "not found"/"removed" status record, which Nova Poshta itself returns as normal data; if *more than one* returned record's waybill-number field matches what was requested, the system cannot safely determine which one was meant and raises the standard error rather than guessing. This both matches this library's existing convenience-method convention (`address`'s AC-11) of narrowing input without re-filtering the response, and is the one place in this module where the library itself — not just the caller — must apply the match-by-identity rule (see AC-05, §1 Decision override)

### AC-05 (US-03) — domain invariant

**Given** a consuming developer requests tracking status for more than one waybill number in a single call
**When** Nova Poshta's response contains fewer records than requested, more than requested, or records in a different order than requested — none of which is treated as a failure
**Then** the system passes the response back with every returned record's own waybill-number field left intact and unmodified — the library never reindexes, reorders, truncates, or pads the response array to line it up with the request, so a caller resolving a specific waybill's result always does so by that field, never by array position; this is the guard against silently attaching one shipment's recipient details to a different shipment's request (see §1 Decision override, and AC-04 for the one case where the library performs this match itself)

### AC-06 (US-05) — domain invariant

**Given** a consuming developer requests tracking status for a waybill number Nova Poshta doesn't recognize, or one that's since been removed
**When** Nova Poshta reports that outcome
**Then** the system represents it as a normal, successfully-returned status record — with its own status code and description reflecting "not found" or "removed" — rather than raising an error; the library never treats an unrecognized or removed waybill as a request failure, since Nova Poshta itself reports it as a status value, not a decline

### AC-07 (US-05) — domain invariant

**Given** a consuming developer receives a status record whose status code isn't one this library's authors had seen when it was built
**When** they read the typed result
**Then** the unrecognized status code and its description are preserved and returned exactly as Nova Poshta sent them — not dropped, coerced to an "unknown" placeholder, or rejected — matching `common`'s own precedent of never shipping a closed enum for a value Nova Poshta can extend independently of this library's release cycle. **Resolved during clarify:** the status code itself is typed as a plain number (not text) — matching `internet-document`'s existing `StateId: number` field (`src/types/internet-document.ts:215`) and every source struct quoted in §1, all of which type it numerically; "not coerced" above refers to preserving unrecognized code values and their descriptions, not to the wire type itself

### AC-08 (US-06) — error

**Given** a consuming developer calls a tracking method
**When** Nova Poshta declines the request outright, or the response it returns isn't a navigable list of records at all — not an array, missing its data field, or otherwise unreadable as a list
**Then** the system raises the library's standard error containing Nova Poshta's own explanation, rather than returning an empty or partial result that looks like a valid outcome — matching `common`'s AC-03/AC-05 precedent for a response that isn't usable at all. **Resolved during clarify:** a validly-shaped response whose list happens to contain zero records is not this case — that's a success with zero results, the smallest instance of AC-05's "fewer records than requested"

### AC-09 (US-06) — authorization

**Given** a consuming developer calls a tracking method
**When** the request reaches Nova Poshta, carrying the caller's API key the same way every other module's request does — tracking-document never omits or special-cases it
**Then** whatever Nova Poshta decides about that key for this specific method is surfaced faithfully: if Nova Poshta denies the call over the key, the system raises the library's standard error with Nova Poshta's own message, exactly like every sibling module; if Nova Poshta doesn't enforce key validity for this particular method at all (one of the four cross-checked sources states this method "does not require use of an API key," unconfirmed by the other three — see §8 OQ), the system still performs no key-validity check of its own either way, since the library has never independently validated a key for any module. What's fixed regardless of that open question: tracking-document has no per-counterparty *ownership* scoping of its own, unlike `address`/`counterparty`'s write methods — any caller can track any waybill number by design, matching Nova Poshta's own public tracking page

### AC-10 (US-06) — error

**Given** a consuming developer calls a tracking method
**When** the network call to Nova Poshta fails before a response is received (a timeout, a dropped connection, or a response that isn't valid JSON)
**Then** the system raises the library's standard error rather than letting the failure propagate unhandled or returning an empty result that looks like a valid response

### AC-11 (US-07) — cross-context

**Given** a shipment's waybill number came from anywhere — created through this library's `internet-document` module, through Nova Poshta's own web portal, or by a third party the consuming developer has no other relationship with
**When** they track it through tracking-document
**Then** the system tracks it the same way regardless of its origin — tracking-document accepts a plain waybill number and performs no lookup against, dependency on, or requirement that the waybill exist in any `Ref` or record `internet-document` produced

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Type-safety coverage | 100% of in-scope methods (raw + convenience) have zero `any` in public signatures | static check in CI |
| Error-contract coverage | 100% of in-scope methods throw the standard error on a declined or non-list response, or a network failure; 0% throw when a document merely comes back not-found/removed (AC-06) | unit test suite (`test/unit/modules/tracking-document`) |
| Match-by-identity guard | 100% of multi-document test cases resolve a result by its returned waybill-number field; 0% by array index | unit test suite, dedicated fixture with a short/reordered response (AC-05) |
| Library-added overhead per call | Median ≤ 5ms beyond the underlying network round-trip (no client-side caching, retries, or heavy parsing) | median across ≥30 repeated single-waybill calls (one `DocumentNumber` per call), timing the typed method call end-to-end with `fetch` stubbed to near-zero latency, always runs in CI (resolved during clarify) |
| Method-surface completeness | 100% of the 1 raw method + 1 convenience method have a corresponding typed method | unit test suite asserts both are exported and callable (`test/unit/modules/tracking-document`), cross-checked once manually against the 4-SDK sourcing (§1) before release |

## 6.1 Security / privacy

- **Data classification:** confidential — a tracking response carries recipient/sender name, address, and phone fields (per the source structs quoted in §1: `RecipientFullName`, `RecipientAddress`, `PhoneRecipient`, `PhoneSender`, `WarehouseRecipient`/`WarehouseSender`), closer in sensitivity to `address`'s saved-address data than to `common`'s public reference catalog.
- **Personal data touched:** yes — the fields listed above qualify as personal/business shipment data whenever the counterparty is a private individual.
- **AuthZ/AuthN impact:** the library sends the caller's API key on every call the same way every module does (AC-09) — but unlike `address`/`counterparty`, tracking-document has **no** per-counterparty ownership scoping at all: any caller can track any waybill number by design. This is sharper than it sounds: one source states Nova Poshta doesn't even require an API key for this specific method (unconfirmed by the other three — §8 OQ), which would put tracking-document's real-world authorization boundary at "none" rather than "any valid key," closer to Nova Poshta's own public tracking page than to any other module in this library. Either way this is an intentional design difference from the write modules' scoping, not a gap to close.
- **Abuse cases:**
  - Enumerating waybill numbers to fish for other people's shipment details: this is accepted risk by design, not a gap — AC-09 already establishes that any valid API key can track any waybill number, with no per-caller ownership check, mirroring Nova Poshta's own public tracking page. The unresolved phone-match question (§8 OQ) affects only how much *detail* a given lookup returns, not whether tracking succeeds at all — it is not a control against enumeration and this bullet no longer claims it is. This library adds no rate-limiting of its own, matching every sibling module.
  - Polling one or many waybills on a tight interval could exhaust the calling API key's own rate-limit allowance and cause unrelated calls on the same key (e.g. creating a shipment via `internet-document`) to start failing. The library still adds no client-side backoff or caching (§3 non-goal) — flagged explicitly here since tracking is this library's first read endpoint a consuming developer is likely to poll repeatedly.
  - Cross-shipment data mixup from assuming positional correspondence in a multi-waybill response: closed by AC-05's match-by-identity requirement.
- **Logging (resolved during clarify):** the library performs no logging of its own (matching its existing stateless design) and a thrown `NovaPoshtaApiError`'s message never carries response-body fields — only Nova Poshta's own `errors[]`/`warnings[]` text, the same behavior the core client already applies to every module. No response PII (recipient/sender name, address, phone) is ever written to a log or embedded in an error message by this library.
- **Security review:** Completed 2026-09-22 by Tech Lead during `sdd:review` — the first module in the library that returns recipient/sender PII from a call that is not scoped to the caller's own counterparty (see AuthZ/AuthN impact above); no findings requiring a code change. See [`_review/review-2026-09-22.md`](_review/review-2026-09-22.md) and §8.

## 7. Metrics / KPIs

- **Type-safety completeness** — baseline: 0% (module doesn't exist yet), target: 100% of in-scope methods carry no `any` in their public signature, verified in the first release containing this feature.
- **Zero silent failures** — baseline: N/A (feature doesn't exist), target: 100% of unit tests confirming a declined or network-failed call throws `NovaPoshtaApiError`, and confirming a not-found/removed record does **not** throw (AC-06), passing before merge.
- **Match-by-identity correctness** — baseline: N/A (feature doesn't exist), target: 0 GitHub issues within 90 days of release reporting a tracking result attached to the wrong waybill number.
- **Method-surface completeness** — baseline: 0 of 2 (raw + convenience) exposed, target: both shipped with a corresponding typed method before this feature is marked done.

## 8. Open questions

- [x] Does Nova Poshta's `getStatusDocuments` impose an undocumented limit on how many waybills can go in one `Documents` array call? **Resolved during drafting** — `sirkostya009/go-novapost`'s doc-comment states "Метод дозволяє переглядати одночасно до 100 відправлень" (the method allows viewing up to 100 shipments at once); no second source confirms the exact number, but no source contradicts it either. AC-03/AC-05 stay written to hold regardless (no client-side cap is added — this library never enforces Nova Poshta's own limits for it), so this doesn't change the design, only the confidence behind §1's sourcing.
- [x] Does `getStatusDocuments` actually require a valid API key, or does Nova Poshta accept the call regardless (one source, `sirkostya009/go-novapost`, states "Доступність: Не вимагає використання API-ключа" — does not require use of an API key — unconfirmed by the other three sources, none of which contradict it either)? **Resolved during review (2026-09-22):** Tech Lead's call — keep the current default and close the question. AC-09 already holds either way (the library sends the key like every other call and never independently validates it), so this doesn't change any code, only the documented authorization-boundary claim above (§6.1's "any valid key" vs. "none at all" framing stays an open framing note, not a blocker).
- [ ] Does the phone number affect which response fields Nova Poshta returns (e.g. masking recipient name/address when the supplied phone doesn't match its own record), and if so, does that show up as an empty string or a zero value on that field? **Correction during review (2026-09-22):** the "Default now" below was inaccurate — every `TrackingStatus` field actually shipped as **required**, not optional (see `src/types/tracking-document.ts`, `contracts/api-sync-report.md`'s "Open items" section, which flagged this same drift independently). Default now: if Nova Poshta masks a field for a non-matching phone, it does so by returning an empty/zero value on that still-present field, not by omitting the field from the response object — matching how every other string/number field in this contract already degrades when Nova Poshta has nothing to report. This still doesn't change library behavior either way, but should be verified against a live API key before documenting the convenience method's `phone` parameter further for consuming developers. — owner: Tech Lead, due: before next live-API verification pass
- [ ] Should the library's now-three independent status vocabularies (`common.DocumentStatus`, `internet-document`'s `StateId`/`StateName`, and this module's status code) eventually be reconciled into one shared type? Default now: no — each stays independent per its own module's precedent (see §1 Decision override); reconciling is a cross-module change bigger than any one domain module's spec. — owner: Tech Lead, due: re-evaluate once a fourth module needs its own status representation
- [x] Re-verify the 1-method TrackingDocument surface (§1) against Nova Poshta's live/official documentation once the portal is reachable by automated tooling — the 4-SDK cross-check is strong (all four agree field-for-field on the request and response shape) but is still a third-party source, the same caveat every shipped spec in this repo already carries. **Resolved during review (2026-09-22):** re-attempted — `developers.novaposhta.ua` (the actual home of this API's legacy docs) is still 403. User-supplied `api-portal.novapost.com` URLs are reachable, but document Nova Poshta's newer REST/JWT-auth tracking API (`/shipments/tracking`, `numbers[]`), not the legacy `apiKey`/`modelName`/`calledMethod` surface this module targets — checked the portal's full doc index, no mention of `modelName`, `calledMethod`, `TrackingDocument`, or `getStatusDocuments` anywhere in it. Not usable as an official source for this feature. Proceeding on the SDK cross-check, now strengthened from 2 to 3 independently-agreeing sources for most of the response surface — `sirkostya009/go-novapost`'s `StatusDocument` struct was re-fetched during this same review pass and corroborates the method surface, the 21-value status-code list, and 4 of the 15 previously single-sourced fields (see `contracts/api-sync-report.md`).
- [x] Who performs the §6.1 security review this module requires, and what does it block (added during clarify)? **Resolved during review (2026-09-22):** performed by Tech Lead during `sdd:review` — see [`_review/review-2026-09-22.md`](_review/review-2026-09-22.md). No findings requiring a code change.

## Test plan

> Size S / route `quick` — plan kept inline per the size matrix, not a separate `test-plan.md`.
> Levels used: **unit** (mocked `fetch`, no real network — covers all 11 ACs) and **integration**
> (one opt-in real-API smoke test against a single known waybill, gated by
> `NOVA_POSHTA_TEST_API_KEY`, matching the existing `test/integration/` convention — never blocks
> CI without a key configured). No **e2e**, **load-as-throughput**, **component**,
> **visual-regression**, **contract**, or **e2e-through-UI** tiers apply — no UI surface, no
> published-type-surface contract check like `address`/`common` carry (this module ships only 2
> methods, covered directly by the unit suite's method-surface assertions); the one numeric NFR is
> handled under Load below.

### AC coverage

| AC (spec.md §5) | Test name (intent-based) | Level | Expected outcome |
|---|---|---|---|
| AC-01 track happy path | tracking a single waybill returns its typed status record | unit + integration | typed record matching the response, including status code + description |
| AC-02 phone passthrough | a supplied phone number reaches Nova Poshta unmodified, no client-side validation | unit | request body carries the phone exactly as given; response returned unmodified |
| AC-03 multi-waybill happy path | multiple waybills in one call are passed through as one request, not split/capped/reordered | unit | single `fetch` call recorded; request body's `Documents` array matches input order and length |
| AC-04 single-waybill convenience method | the convenience method makes exactly one call and returns what the equivalent raw one-item call would | unit | exactly one call recorded; result matches the equivalent raw-method call |
| AC-05 match-by-identity | a response shorter than, reordered from, or longer than the request is resolved by the record's own waybill-number field, never by index | unit | fixture with a reordered/short response resolves each result to the correct requested waybill by field, not position |
| AC-06 not-found/removed is data | a not-found or removed status code resolves normally, does not throw | unit | call resolves with the record intact (status code + description present); no exception thrown |
| AC-07 forward-compatible status | a status code/description not previously documented is preserved unchanged | unit | fixture with an unrecognized status code round-trips exactly, not dropped or coerced |
| AC-08 declined / non-list response | a decline or a non-list response throws the standard error | unit | standard error thrown, carrying Nova Poshta's own explanation |
| AC-09 authorization / bad key | an invalid or expired API key is denied with the standard error, regardless of which waybill was requested | unit | standard error thrown with Nova Poshta's message; no ownership check performed client-side |
| AC-10 network/transport failure | a timeout, dropped connection, or non-JSON response throws the standard error | unit | standard error thrown; the call never resolves as if it had succeeded |
| AC-11 origin-independent tracking | tracking a waybill number never queries or depends on any `internet-document` `Ref` or record | unit | the call's request body and behavior are identical whether or not any `internet-document` state exists |

### Edge cases / error paths

- A tracking response comes back successful but `data` isn't array-shaped → standard error thrown (the array-shape check, inherited unchanged from `common`; same code path as AC-08, listed separately here because it's a distinct trigger condition).
- An empty `Documents` array is supplied → passed through to Nova Poshta as-is (no client-side validation, matching the library's pass-through convention); whatever Nova Poshta does with it (empty result vs. a decline) is surfaced per AC-06/AC-08 as applicable.
- The opt-in real-API integration smoke test runs against an unreachable/rate-limited Nova Poshta sandbox → the test fails or is skipped locally; never wired into a CI job that lacks the key, so this can't block a merge.

### Test data

- Seed strategy: none — `tracking-document` holds no local entities (no schema change); unit tests build request/response fixtures inline, shaped like the response fields confirmed in §1's quoted sources (matching `docs/adr/0003-testing-strategy.md`).
- Integration dependency: the one opt-in smoke test (AC-01) calls the real Nova Poshta API directly with a single known-valid waybill number — not a throwaway container, since Nova Poshta is a third-party API this library doesn't own. Gated by `NOVA_POSHTA_TEST_API_KEY`, same as the existing `test/integration/` folder. **Resolved during clarify:** the waybill number itself is supplied via a second environment variable (e.g. `NOVA_POSHTA_TEST_WAYBILL`) rather than hardcoded in the test file — matching this repo's existing caution around committing a real, pre-existing record into a test (`test/integration/internet-document.test.ts`'s note on not fabricating a seed `Ref`); the test is skipped whenever that variable is absent, the same opt-in pattern already used for `NOVA_POSHTA_TEST_API_KEY`.
- Cleanup boundary: none needed — every test in this module is a read; no write/state to clean up.

### NFR validation (load)

- `spec.md` §6 NFR row 4 — library-added overhead per call, median ≤5ms beyond the network round trip → scenario: 30+ repeated single-waybill calls (one `DocumentNumber` per call, resolved during clarify) to `getStatusDocuments`, `fetch` stubbed to near-zero latency, timing the typed method call end-to-end (request-building + response-parsing, excluding the stubbed network hop) and asserting the median added overhead ≤5ms. Runs in the project's existing test runner — no separate load tool needed, since this measures in-process timing, not network throughput.
- No other §6 NFR row carries a number implying sustained rate/duration load — the remaining rows (type-safety coverage, error-contract coverage, match-by-identity guard, method-surface completeness) are static/CI or dedicated-fixture checks already captured in the AC coverage table above, not load scenarios.

### CI placement

- Every PR: all unit tests (all 11 ACs) — fast, fully deterministic, no live API key required.
- Opt-in only, never blocking CI: the real-API integration smoke test — runs manually or on a schedule wherever `NOVA_POSHTA_TEST_API_KEY` is configured.
