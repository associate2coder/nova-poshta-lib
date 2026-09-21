---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-21"
feature_size: "M"
---

# Public API contract — internet-document

**Interface kind:** `library-sdk` (from `sad.md` frontmatter `target_surfaces`). The contract is the
public TypeScript surface `createInternetDocumentModule()` exports — method signatures, request/
response types, and the error contract every method shares — not an HTTP/OpenAPI document.

Derived from: `data-model.md` — present, states "no schema change" (the module is stateless, `sad.md`
§2). Fields instead trace to the documented Nova Poshta InternetDocument API shape, re-derived during
this pass by fetching the actual source of the three community SDKs `spec.md` cites —
`platx/go-nova-poshta`'s `api/internetdocument` package (`model.go`, `request.go`, `response.go`),
`serj1chen/nova-poshta-sdk-php`'s `InternetDocument.php` + `BasePrintDocumentParameters.php`, and
`maddsua/NovaPoshtaREST`'s `lib/models/InternetDocument.ts` — plus `sad.md` §4 (decisions 1–9,
ADR-0001/0002/0003) and §6 (4 runtime flows + their `alt` branches), and `spec.md` §5 (AC-01..AC-19).
Nothing here is typed by hand without one of those origins. See `api-sync-report.md` for the full
field-origins table and two significant drift findings this re-fetch surfaced (§10 below).

## 1. Module shape

```ts
// src/modules/internet-document/index.ts
export function createInternetDocumentModule(client: NovaPoshtaClient): InternetDocumentModule;
```

`InternetDocumentModule` is a flat object — no sub-namespace, matching `address`'s and
`counterparty`'s precedent (`sad.md` §4 decision 1 / the single `library-sdk` surface) — exported from
`src/index.ts` alongside `createCommonModule`, `createAddressModule`, `createCounterpartyModule`.

## 2. Shared types

```ts
// src/types/internet-document.ts

/** sad.md §4 decision 7 / ADR-0001: this module's own fixed, compile-time literal set — 4 values
 *  fixed by ADR-0001. The cross-checked wire enum documents 2 more (DoorsPostomat,
 *  WarehousePostomat) not yet in scope here — see §10 finding 1 / api-sync-report.md. */
export type ServiceType =
  | "WarehouseWarehouse"
  | "WarehouseDoors"
  | "DoorsWarehouse"
  | "DoorsDoors";

/** ADR-0001: 4 values fixed at design time. The cross-checked wire enum documents 8
 *  (adds TiresWheels, Money, SignedDocuments, Trays) — see §10 finding 1. */
export type CargoType = "Parcel" | "Cargo" | "Documents" | "Pallet";

export type PayerType = "Sender" | "Recipient" | "ThirdPerson";
export type PaymentMethod = "Cash" | "NonCash";

export interface BackwardDeliveryData {
  PayerType: PayerType;
  CargoType: "Money" | "Documents";
  RedeliveryString?: string;
  Amount?: number;
}
```

*`PayerType`/`PaymentMethod` are confirmed identical (3 and 2 values respectively) across the Go SDK's
`enum` package and used unchanged. `BackwardDeliveryData` is AC-06's cash-on-delivery instruction —
confirmed present as a documented property on the PHP SDK's `InternetDocument` class
(`@property array BackwardDeliveryData`); its own sub-fields are not independently confirmed by any
cross-checked source beyond `PayerType`/`RedeliveryString`/`Amount` naming convention shared with
`GetDocumentPriceReq.RedeliveryCalculate` — flagged `medium` in `api-sync-report.md`.*

*Package-root re-export names differ from the module-local names above: `common` already owns the
bare `ServiceType`/`CargoType`/`PayerType` names at the package root — but as its own runtime
reference-list record shapes (`{ Ref?: string; Description?: string }`, `src/types/common.ts`), not
literal unions — a different kind of type entirely, which is why this module's versions are aliased
rather than merged: `src/index.ts` re-exports them as `InternetDocumentServiceType`/
`InternetDocumentCargoType`/`InternetDocumentPayerType`. `PaymentMethod` and `BackwardDeliveryData`
are unaliased — `common` has no colliding export for either.*

## 3. Methods

One typed method per §1 in-scope InternetDocument method (8, per `spec.md` §1 / `sad.md` §5).

| # | Method | User story | AC |
|---|---|---|---|
| 1 | `save(payload)` | US-01 | AC-01, AC-02, AC-05 |
| 2 | `update(payload)` | US-05 | AC-02, AC-05, AC-06 |
| 3 | `delete(payload)` | US-06, US-07 | AC-07, AC-08 |
| 4 | `getDocumentList(filters?)` | US-08 | AC-09, AC-10 |
| 5 | `getDocumentPrice(payload)` | US-02 | AC-03 |
| 6 | `getDocumentDeliveryDate(payload)` | US-03 | AC-04 |
| 7 | `printDocument(payload)` | US-09 | AC-11, AC-13 |
| 8 | `printMarkings(payload)` | US-09 | AC-12, AC-13 |

Every method's decline/network error behavior is identical and covered once in §6 (AC-14/AC-15/
AC-16) — not repeated per row.

### 3.1 `save`

```ts
/** sad.md §4 decision 7, ADR-0001 (as narrowed by ADR-0004): one hand-written variant per
 *  ServiceType leg, each requiring only the sender-leg AND recipient-leg location fields that leg
 *  needs — never one flat shape with every field merely optional. Location-field shape per leg is
 *  confirmed from platx/go-nova-poshta's SaveReq/WarehouseSaveReq/AddressSaveReq/PostomatSaveReq
 *  (re-fetched). CargoType is a plain discriminant field, not a structural variant axis — ADR-0004
 *  supersedes ADR-0001's original two-axis design: no cross-checked source confirms Nova Poshta's
 *  wire format varies required fields by CargoType (§10 finding 1 / api-sync-report.md, still
 *  flagged; see spec.md §8 OQ-1/OQ-3).
 */
interface SaveCommonFields {
  PayerType: PayerType;
  PaymentMethod: PaymentMethod;
  DateTime: string;
  Weight: number;
  SeatsAmount: number;
  Description: string;
  Cost: number;
  CitySender: string;
  Sender: string;
  ContactSender: string;
  SendersPhone: string;
  CityRecipient: string;
  Recipient: string;
  ContactRecipient: string;
  RecipientsPhone: string;
  CargoType: CargoType;
  BackwardDeliveryData?: BackwardDeliveryData;
}

interface SenderWarehouseLeg {
  SenderAddress: string; // warehouse Ref
}
interface RecipientWarehouseLeg {
  RecipientAddress: string; // warehouse Ref
}
interface SenderDoorsLeg {
  SenderCityName: string;
  SenderArea: string;
  SenderAddressName: string;
  SenderHouse: string;
  SenderFlat?: string;
}
interface RecipientDoorsLeg {
  RecipientCityName: string;
  RecipientArea: string;
  RecipientAddressName: string;
  RecipientHouse: string;
  RecipientFlat?: string;
}

export interface SaveWarehouseToWarehousePayload extends SaveCommonFields, SenderWarehouseLeg, RecipientWarehouseLeg {
  ServiceType: "WarehouseWarehouse";
}
export interface SaveWarehouseToDoorsPayload extends SaveCommonFields, SenderWarehouseLeg, RecipientDoorsLeg {
  ServiceType: "WarehouseDoors";
}
export interface SaveDoorsToWarehousePayload extends SaveCommonFields, SenderDoorsLeg, RecipientWarehouseLeg {
  ServiceType: "DoorsWarehouse";
}
export interface SaveDoorsToDoorsPayload extends SaveCommonFields, SenderDoorsLeg, RecipientDoorsLeg {
  ServiceType: "DoorsDoors";
}

export type SaveInternetDocumentPayload =
  | SaveWarehouseToWarehousePayload
  | SaveWarehouseToDoorsPayload
  | SaveDoorsToWarehousePayload
  | SaveDoorsToDoorsPayload;

save(payload: SaveInternetDocumentPayload): Promise<SavedInternetDocument | undefined>;
```

```ts
export interface SavedInternetDocument {
  Ref: string;
  CostOnSite: number;
  EstimatedDeliveryDate: string;
  IntDocNumber: string;
  TypeDocument: string;
}
```

*`undefined` when Nova Poshta reports success with an empty `data` array — a valid outcome, not an
error (AC-05, `address` ADR-0001 reused unchanged). Response fields confirmed from
`platx/go-nova-poshta`'s `SaveItem` struct (re-fetched, `high` confidence).*

### 3.2 `update`

```ts
/** AC-06: full-replace — every field the chosen ServiceType leg's Save payload declares becomes
 *  mandatory here, EXCEPT the fields the Save payload itself already declares optional
 *  (BackwardDeliveryData, and — for a Doors-ending leg — SenderFlat/RecipientFlat): each of these
 *  stays optional by design, and omitting it (or passing it as undefined) clears it — it is never
 *  carried forward from a previous version. BackwardDeliveryData is AC-06's headline case (§1
 *  decision override), but the same clearing behavior applies to any other field the Save payload
 *  itself leaves optional. **Correction
 *  (review remediation, fourth pass, 2026-09-21):** hand-written per ServiceType leg (mirroring
 *  `counterparty` ADR-0001's explicit-variants precedent), NOT a generic `Required<SaveInternetDocumentPayload>`
 *  wrapper — `Required<>` would force BackwardDeliveryData mandatory too, making AC-06's "omit to
 *  clear" case impossible to type. See `src/types/internet-document.ts`'s
 *  UpdateWarehouseToWarehousePayload/UpdateWarehouseToDoorsPayload/UpdateDoorsToWarehousePayload/
 *  UpdateDoorsToDoorsPayload for the shipped shape. */
export type UpdateInternetDocumentPayload =
  | UpdateWarehouseToWarehousePayload
  | UpdateWarehouseToDoorsPayload
  | UpdateDoorsToWarehousePayload
  | UpdateDoorsToDoorsPayload;

update(payload: UpdateInternetDocumentPayload): Promise<SavedInternetDocument | undefined>;
```

*`undefined` on empty-on-success, same as `save` (AC-05).*

### 3.3 `delete`

```ts
/** sad.md §4 decision 8, ADR-0002: batch-capable by spec/ADR decision — every submitted Ref gets
 *  one outcome entry, reconciled defensively against whichever Refs Nova Poshta's response actually
 *  confirms removed. NOTE: 2 of the 3 cross-checked SDKs (Go, TypeScript) type the wire
 *  `DocumentRefs` field as a SINGLE ref, not an array — only the PHP SDK forces a one-element array
 *  client-side. This contract still models the batch shape ADR-0002 already fixed; §10 finding 2 /
 *  api-sync-report.md carries the unconfirmed-batch-capability flag forward. Field-name note (review
 *  2026-09-21, third pass, finding P1): `Documents` below is this module's own public field name —
 *  the module maps it to the wire's actual `DocumentRefs` field before sending; the two names are
 *  deliberately different. */
export interface DeleteInternetDocumentPayload {
  Documents: string[]; // one or more waybill Refs — sent on the wire as DocumentRefs
}

/** ADR-0002: one entry per submitted Ref, reconciled by this module — never Nova Poshta's raw
 *  response shape as-is (which, per platx/go-nova-poshta's DeleteItem, carries only `Ref` — no
 *  `Removed`/`Reason` field of its own; this module infers Removed by whether the Ref appears in
 *  Nova Poshta's confirmed-removed list). Reason is read from the envelope's success-path
 *  `warnings`/`errors` (via `client.requestEnvelope()`, review 2026-09-21 finding 4) when Nova
 *  Poshta provides one — best-effort: the envelope's warnings/errors aren't themselves keyed by
 *  Ref, so this module first tries to match each rejected Ref to whichever warning/error message
 *  names that Ref, falling back to every warning/error joined together only when nothing names it,
 *  and to a library-generated message when Nova Poshta gives no warnings/errors at all (review
 *  2026-09-21-02 finding N3; spec.md §8 OQ-5). */
export interface DeletedInternetDocumentOutcome {
  Ref: string;
  Removed: boolean;
  Reason?: string;
}

delete(payload: DeleteInternetDocumentPayload): Promise<DeletedInternetDocumentOutcome[]>;
```

*Never `T | undefined` — the one deliberate divergence from every other write method in this library
(ADR-0002). A single-Ref call still returns a one-element array (AC-07).*

### 3.4 `getDocumentList`

```ts
export interface GetDocumentListFilters {
  DateTimeFrom?: string;
  DateTimeTo?: string;
  Page?: number;
}

getDocumentList(filters?: GetDocumentListFilters): Promise<WaybillListItem[]>;
```

```ts
export interface WaybillListItem {
  Ref: string;
  DateTime: string;
  IntDocNumber: string;
  Cost: number;
  CitySender: string;
  CityRecipient: string;
  CostOnSite: number;
  PayerType: PayerType;
  PaymentMethod: PaymentMethod;
  AfterpaymentOnGoodsCost: number;
  StateId: number;
  StateName: string;
  RejectionReason?: string;
}
```

*Fields confirmed from `platx/go-nova-poshta`'s `GetDocumentListItem` struct (re-fetched, `high`
confidence) — a subset shown here; the full struct carries additional pass-through fields not
independently meaningful to this contract's typing. `Page` is passed through unmodified when
supplied (AC-09) — the library never injects a default or walks additional pages (`spec.md` §8 OQ-2,
the same known limitation `address`/`counterparty` carry). A filtered call (`DateTimeFrom`/
`DateTimeTo` supplied, AC-10) returns the same `WaybillListItem[]` shape, no re-filtering.*

### 3.5 `getDocumentPrice`

```ts
export interface GetDocumentPricePayload {
  CitySender: string;
  CityRecipient: string;
  Weight: number;
  ServiceType: ServiceType;
  CargoType: CargoType;
  Cost: number;
  SeatsAmount: number;
}

getDocumentPrice(payload: GetDocumentPricePayload): Promise<DocumentPriceEstimate>;
```

```ts
export interface DocumentPriceEstimate {
  Cost: number;
  AssessedCost: number;
  CostRedelivery: number;
}
```

*Fields confirmed from `platx/go-nova-poshta`'s `GetDocumentPriceReq`/`GetDocumentPriceItem` (re-
fetched, `high` confidence) — a subset shown; `RedeliveryCalculate`/`CargoDetails`/`PackRef` etc. are
optional, not independently meaningful to type here. No client-side recalculation, no link to a later
`save` call (AC-03, `spec.md` §3 non-goal). Unlike `save`/`update`'s AC-05 `undefined`-on-empty, a
success response with empty `data` throws `NovaPoshtaApiError` — this calculator has no meaningful
"success, no result" outcome (see §6's error contract).*

### 3.6 `getDocumentDeliveryDate`

```ts
export interface GetDocumentDeliveryDatePayload {
  DateTime: string;
  ServiceType: ServiceType;
  CitySender: string;
  CityRecipient: string;
}

getDocumentDeliveryDate(
  payload: GetDocumentDeliveryDatePayload,
): Promise<DocumentDeliveryDateEstimate>;
```

```ts
export interface DocumentDeliveryDateEstimate {
  Date: string;
  Timezone: string;
}
```

*Fields confirmed from `platx/go-nova-poshta`'s `GetDocumentDeliveryDateReq`/
`GetDocumentDeliveryDateItem` (re-fetched, `high` confidence). Same no-linkage behavior as
`getDocumentPrice` (AC-04), and the same empty-data-throws behavior — see §6.*

### 3.7 `printDocument` / `printMarkings`

```ts
/** sad.md §4 decision 9, ADR-0003: bypasses the shared core client entirely — constructs the URL,
 *  then verifies it with one live fetch, never routed through NovaPoshtaClient.request()'s
 *  envelope unwrap. Field shape confirmed from serj1chen/nova-poshta-sdk-php's
 *  BasePrintDocumentParameters (re-fetched, high confidence): DocumentRefs (array), Type, Copies. */
export interface PrintLinkPayload {
  Documents: string[]; // one or more waybill Refs
  Type?: "Pdf" | "Html"; // confirmed values, re-fetched (PRINT_TYPE_PDF/PRINT_TYPE_HTML)
  // Not a URL segment of its own (review, eighth pass, 2026-09-22 — re-fetched getPrintLink()'s
  // actual implementation, not just the PRINT_COPIES_* constants): "fourfold" repeats each Ref's
  // URL segment twice; "double" and omitting this field both behave identically to each other.
  Copies?: "double" | "fourfold";
}

printDocument(payload: PrintLinkPayload): Promise<string>;
printMarkings(payload: PrintLinkPayload): Promise<string>;
```

*Returns a single URL string covering all requested Refs — confirmed by re-fetching the PHP SDK's
`getPrintLink()` helper, which appends every Ref to one URL path (`/orders[]/<ref>`) and embeds the
caller's own API key as the URL's final segment (confirms `spec.md` §8 OQ-1's credential-embedding
assumption and the single-combined-link assumption at `high` confidence — no longer "unconfirmed
against the live/official docs" for this specific point; see `api-sync-report.md`). **Confirmed
directly against Nova Poshta's own documentation (review, seventh pass, 2026-09-22):** Nova Poshta's
`devcenter.novaposhta.ua` developer blog documents the same structural pattern — repeated
`orders[]/<ref or number>` segments followed by `apiKey/<key>` as the URL's final segment —
independently corroborating the combined-link and credential-embedding assumptions from a primary
source, not just a community SDK; see `spec.md` §8 OQ-1. **This does not extend to the exact `type`
value casing or to `Copies`** — those remain SDK-sourced only, not covered by that primary source.
**Correction (review, eighth pass, 2026-09-22):** the seventh pass re-fetched only `getPrintLink()`'s
constant *declarations*; re-fetching its actual *implementation* found `Copies` is not a URL segment
at all — see the `PrintLinkPayload.Copies` field comment above and ADR-0003's amendment. That bug
(an invented `/copies/<value>` segment) is now fixed. A failure to
obtain the link (empty `Documents`, an invalid Ref, a document not yet materialized) throws
`NovaPoshtaApiError` per the construct-then-verify check (AC-11, AC-12) — the PHP SDK's own
`getPrintLink()` returns an empty string on an empty ref list, which this contract explicitly does
NOT reuse: an empty/invalid result raises the standard error instead (ADR-0003, never a silent empty
link).*

## 4. `InternetDocumentModule` interface (assembled)

```ts
export interface InternetDocumentModule {
  save(payload: SaveInternetDocumentPayload): Promise<SavedInternetDocument | undefined>;
  update(payload: UpdateInternetDocumentPayload): Promise<SavedInternetDocument | undefined>;
  delete(payload: DeleteInternetDocumentPayload): Promise<DeletedInternetDocumentOutcome[]>;
  getDocumentList(filters?: GetDocumentListFilters): Promise<WaybillListItem[]>;
  getDocumentPrice(payload: GetDocumentPricePayload): Promise<DocumentPriceEstimate>;
  getDocumentDeliveryDate(
    payload: GetDocumentDeliveryDatePayload,
  ): Promise<DocumentDeliveryDateEstimate>;
  printDocument(payload: PrintLinkPayload): Promise<string>;
  printMarkings(payload: PrintLinkPayload): Promise<string>;
}
```

## 5. Wire mapping (TypeScript method → `modelName` / `calledMethod`)

| Method | `modelName` | `calledMethod` | Transport |
|---|---|---|---|
| `save` | `InternetDocument` | `save` | `client.request()` (JSON envelope) |
| `update` | `InternetDocument` | `update` | `client.request()` |
| `delete` | `InternetDocument` | `delete` | `client.requestEnvelope()` — reads success-path `warnings`/`errors` for AC-08's rejected-Ref `Reason` (review 2026-09-21 finding 4); payload field `Documents` is sent on the wire as `DocumentRefs` |
| `getDocumentList` | `InternetDocument` | `getDocumentList` | `client.request()` |
| `getDocumentPrice` | `InternetDocument` | `getDocumentPrice` | `client.request()` |
| `getDocumentDeliveryDate` | `InternetDocument` | `getDocumentDeliveryDate` | `client.request()` |
| `printDocument` | — | — | direct `fetch`, construct-then-verify (ADR-0003) |
| `printMarkings` | — | — | direct `fetch`, construct-then-verify (ADR-0003) |

**Shared-client surface added by this feature (review remediation, 2026-09-21 rounds 2 & 3):** two
narrow, additive members were added to `NovaPoshtaClient` (`src/client.ts`) that no earlier module
needed — both are now public package surface:
- `requestEnvelope<T>(modelName, calledMethod, methodProperties?)` → `NovaPoshtaSuccessEnvelope<T>`
  (`{ data, errors, warnings }`) — used by `delete` above. `NovaPoshtaSuccessEnvelope` is re-exported
  from `src/index.ts`.
- `apiKey: string` (read-only, non-enumerable) — used by `buildAndVerifyPrintLink()` (ADR-0003) to
  embed the caller's key in the constructed print URL, outside any envelope call.

See `spec.md` §3 non-goal's Amendments 1 & 2, ADR-0002's Amendment, and ADR-0003's Amendment 2.

## 6. Error contract (derived from `sad.md` §6 `alt` branches)

| Condition (sad.md §6 branch) | AC | Behavior |
|---|---|---|
| Network/transport failure (timeout, dropped connection, non-JSON body) | AC-16 | throws `NovaPoshtaApiError` |
| Declined — bad/expired key, or a `Ref` outside the caller's scope | AC-15 | throws `NovaPoshtaApiError`, Nova Poshta's message passed through |
| Declined — any other reason (invalid `Ref`, missing required field, business-rule rejection) or malformed response shape | AC-14 | throws `NovaPoshtaApiError`, Nova Poshta's message passed through |
| `save`/`update` success, `data` is an empty array | AC-05 | resolves `undefined` — **not** an error |
| `getDocumentPrice`/`getDocumentDeliveryDate` success, `data` is an empty array | AC-03, AC-04 | throws `NovaPoshtaApiError` — unlike `save`/`update`'s AC-05 `undefined`, neither calculator has a meaningful "success, no result" outcome to return |
| `delete` success, full or partial | AC-07, AC-08 | resolves the per-Ref outcome array (ADR-0002) — never throws for a partial rejection |
| `printDocument`/`printMarkings` verification fails (invalid Ref, unmaterialized document, network failure) | AC-11, AC-12, AC-16 | throws `NovaPoshtaApiError` |
| Any other read/calculate/write success, `data` is array-shaped (a non-empty result for `getDocumentPrice`/`getDocumentDeliveryDate`; an empty `getDocumentList` page is a valid "no results" outcome, not an error) | AC-01, AC-03, AC-04, AC-09, AC-10 | resolves the typed result |

No `NovaPoshtaApiError` subclassing (project convention, `sad.md` §2). AC-14 and AC-15 share one code
path — the library performs no inspection of `errorCodes[]` to tell them apart.

## 7. Non-runtime, type-level contract clauses

These `sad.md` §6 marks as non-runtime (N/A in the coverage table) but that still bind this contract:

- **AC-02 (discriminated payload guard):** enforced entirely by §2/§3.1's per-`ServiceType`-leg
  variants (sender leg AND recipient leg both discriminated independently) — a compile error, not a
  runtime check. `CargoType` is a plain field, not part of this structural guard (ADR-0004
  supersedes ADR-0001's original two-axis design). It verifies the payload's own internal
  consistency only; it cannot verify a location Ref actually resolves to a real matching location
  (that surfaces as AC-14).
- **AC-13 (credential-bearing print link):** documented here explicitly — the string `printDocument`/
  `printMarkings` return carries the same access as the caller's own API key (re-confirmed at `high`
  confidence, §3.7). This library performs no redaction, scoping, or expiry of it.
- **AC-17 (authoritative Ref source):** every `Ref`/`IntDocNumber` in `SavedInternetDocument` is read
  fresh from Nova Poshta's response — no caching, no local invention.
- **AC-18 (no cross-module validation):** a sender/recipient/contact-person Ref or a location Ref
  supplied to any method in §3 is passed through as a plain string — no local check of whether it is
  current, valid, or belongs to the caller.
- **AC-19 (published-build discoverability):** every method in §4 must appear in both the ESM
  (`.d.ts`) and CJS (`.d.cts`) built output, verified by the same CI post-build step `address`/
  `common`/`counterparty` already use.

## 8. Out of scope (per `spec.md` §3 / §1 Decision overrides)

- Currency conversion, unit checking, or precision logic on `Cost`, `AfterpaymentOnGoodsCost`, or any
  backward-delivery amount (`spec.md` §3 non-goal).
- Caching, reusing, or auto-linking a `getDocumentPrice`/`getDocumentDeliveryDate` result to a later
  `save` call (AC-03, AC-04, `spec.md` §3 non-goal).
- Redacting, scoping, or expiring the print-ready link (AC-13, `spec.md` §3 non-goal).
- Chaining a price check, a delivery-date check, and `save` into one client-side convenience call
  (`spec.md` §3 non-goal).
- Verifying that a supplied Ref belongs to the caller's own account (AC-18, `spec.md` §3 non-goal).
- Pagination walking or surfacing `info.totalCount` for `getDocumentList` — `Page` is passed through
  as-is (AC-09, `spec.md` §8 OQ-2).
- Extending the shared core client to give the print methods a JSON transport path (`spec.md` §3
  non-goal — implemented entirely within this module's own files, ADR-0003).

## 9. Convenience-methods

None — unlike `counterparty`, `spec.md` §1 fixes exactly 8 methods with no deferred convenience-method
set (`spec.md` §8 has no equivalent open question). No `§7`-style deferred-shape clause needed here.

## 10. Findings from this pass's SDK re-fetch (see `api-sync-report.md` for full detail)

Two findings from re-fetching the cross-checked sources are larger than routine field-origin
confidence notes, and are carried forward as open questions rather than silently reshaping
`sad.md`'s already-Accepted ADRs:

1. **`ServiceType`/`CargoType` cardinality.** The wire enum (`platx/go-nova-poshta`'s `enum` package)
   documents 6 `ServiceType` values (adds `WarehousePostomat`, `DoorsPostomat`) and 8 `CargoType`
   values (adds `TiresWheels`, `Money`, `SignedDocuments`, `Trays`) — not the 4 + 4 `spec.md` §1 and
   ADR-0001 fixed. This contract keeps ADR-0001's 4×4 model as designed, per the user's decision
   during this pass; §2 flags the exact gap in the type comments.
2. **`delete` batch capability.** Two of the three cross-checked SDKs (Go, TypeScript) type the wire
   `DocumentRefs` field as a single ref, not an array — only the PHP SDK forces a one-element array
   client-side, and no source demonstrates a genuine multi-Ref call. ADR-0002's batch-capable,
   per-Ref-reconciled shape is kept as designed; §3.3 flags the gap.

Both are recorded in `spec.md`'s existing §8 open-question set by extension (OQ-1's "re-verify... the
full save/update field shape" already covers finding 1's scope; OQ-5's "confirm whether delete's
per-Ref outcome is genuinely distinguishable" is adjacent to but narrower than finding 2 — finding 2
questions whether batch itself, not just a mixed result, is real) — `api-sync-report.md`'s drift
section recommends tightening both questions' wording.
