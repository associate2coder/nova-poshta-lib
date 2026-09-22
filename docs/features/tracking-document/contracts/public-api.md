---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-22"
feature_size: "S"
---

# Public API contract — tracking-document

**Interface kind:** `library-sdk` (from `sad.md` frontmatter `target_surfaces`). The contract is the
public TypeScript surface `createTrackingDocumentModule()` exports — method signatures, request/
response types, and the error contract the two methods share — not an HTTP/OpenAPI document.

Derived from: `data-model.md` — **absent, legal fast-lane skip** (no schema change: `sad.md` §2
states the module is stateless, no local entity, no staged `docs/features/tracking-document/
migrations/`). Fields instead trace to the documented Nova Poshta TrackingDocument API shape,
re-fetched during this pass (per CLAUDE.md's API-contract sourcing policy) from the actual current
source of the two Go/TypeScript SDKs `spec.md` §1 quotes — `platx/go-nova-poshta`'s
`api/trackingdocument/{request,response,enum}.go` and `maddsua/NovaPoshtaREST`'s
`lib/models/TrackingDocument.ts` — plus `sad.md` §4 (decisions 1–7, ADR-0001) and §6 (2 runtime
flows + their `alt` branches), and `spec.md` §5 (AC-01..AC-11). Nothing here is typed by hand
without one of those origins. **This re-fetch surfaced a real drift from `spec.md` §1's "91 fields"
claim — see `api-sync-report.md` for the full field-origins table and the resolved finding.**

## 1. Module shape

```ts
// src/modules/tracking-document/index.ts
export function createTrackingDocumentModule(client: NovaPoshtaClient): TrackingDocumentModule;
```

`TrackingDocumentModule` is a flat object — no sub-namespace, matching `address`'s/`counterparty`'s/
`internet-document`'s precedent (`sad.md` §4 decision 1 / the single `library-sdk` surface) —
exported from `src/index.ts` alongside `createCommonModule`, `createAddressModule`,
`createCounterpartyModule`, `createInternetDocumentModule`.

## 2. Shared types

```ts
// src/types/tracking-document.ts

export interface TrackingDocumentFilter {
  DocumentNumber: string;
  Phone: string;
}

export interface GetStatusDocumentsPayload {
  Documents: TrackingDocumentFilter[];
}
```

*Confirmed identical, field-for-field, across both re-fetched sources —
`platx/go-nova-poshta`'s `DocumentFilter`/`GetStatusDocumentsReq` (`api/trackingdocument/
request.go`) and `maddsua/NovaPoshtaREST`'s inline `getStatusDocuments` parameter shape
(`lib/models/TrackingDocument.ts`). `Phone` is always sent, never omitted — an empty string when
the caller supplies none (AC-02, resolved during clarify).*

```ts
/** ADR-0001: named to match CONTEXT.md's "tracking status" glossary term verbatim — distinct from
 *  common's unrelated DocumentStatus export (a reference-list lookup, different concept, different
 *  call). StatusCode is a plain number (AC-07, resolved during clarify) — forward-compatible by
 *  construction, no closed enum, no OpenEnum wrapper (sad.md §4 decision 6). Every field below is
 *  typed exhaustively — the 118-field union of both re-fetched sources, not the intersection, per
 *  AC-07's "never dropped" guarantee (see api-sync-report.md for the field-origins table). */
export interface TrackingStatus {
  ActualDeliveryDate: string;
  AdditionalInformationEW: string;
  AdjustedDate: string;
  AfterpaymentOnGoodsCost: string;
  AmountPaid: string;
  AmountToPay: string;
  AnnouncedPrice: string;
  AviaDelivery: boolean | string;
  BackwardDeliverySubTypesActions: string;
  BackwardDeliverySubTypesServices: string;
  BarcodeRedBox: string;
  CalculatedWeight: string;
  CardMaskedNumber: string;
  CargoDescriptionString: string;
  CargoReturnRefusal: boolean | string;
  CargoType: string;
  CategoryOfWarehouse: string;
  CheckWeight: string;
  CheckWeightMethod: string;
  CityRecipient: string;
  CitySender: string;
  ClientBarcode: string;
  CounterpartyRecipientDescription: string;
  CounterpartySenderDescription: string;
  CounterpartySenderType: string;
  CounterpartyType: string;
  CreatedOnTheBasis: string;
  DateCreated: string;
  DateFirstDayStorage: string;
  DateMoving: string;
  DatePayedKeeping: string;
  DateReturnCargo: string;
  DateScan: string;
  DaysStorageCargo: string;
  DeliveryTimeframe: string;
  DocumentCost: string;
  DocumentWeight: string;
  ExpressWaybillAmountToPay: string;
  ExpressWaybillPaymentStatus: string;
  FactualWeight: string;
  FreeShipping: string;
  InternationalDeliveryType: string;
  InternetDocumentDescription: string;
  LastAmountReceivedCommissionGM: string;
  LastAmountTransferGM: string;
  LastCreatedOnTheBasisDateTime: string;
  LastCreatedOnTheBasisDocumentType: string;
  LastCreatedOnTheBasisNumber: string;
  LastCreatedOnTheBasisPayerType: string;
  LastTransactionDateTimeGM: string;
  LastTransactionStatusGM: string;
  LightReturnNumber: string;
  LoyaltyCardRecipient: string;
  LoyaltyCardSender: string;
  MarketplacePartnerToken: string;
  Number: string;
  OwnerDocumentNumber: string;
  OwnerDocumentType: string;
  Packaging: unknown[];
  PartialReturnGoods: unknown[];
  PayerType: string;
  PaymentMethod: string;
  PaymentStatus: string;
  PaymentStatusDate: string;
  PhoneRecipient: string;
  PhoneSender: string;
  PossibilityChangeCash2Card: boolean;
  PossibilityChangeDeliveryIntervals: boolean;
  PossibilityChangeEW: boolean;
  PossibilityCreateRedirecting: boolean;
  PossibilityCreateRefusal: boolean;
  PossibilityCreateReturn: boolean;
  PossibilityLightReturn: boolean;
  PossibilityTermExtensio: boolean;
  PossibilityTrusteeRecipient: boolean;
  PostomatV3CellReservationNumber: boolean | string;
  RecipientAddress: string;
  RecipientDateTime: string;
  RecipientFullName: string;
  RecipientFullNameEW: string;
  RecipientWarehouseTypeRef: string;
  Redelivery: boolean | string;
  RedeliveryNum: string;
  RedeliveryPayer: string;
  RedeliveryPaymentCardDescription: string;
  RedeliveryPaymentCardRef: string;
  RedeliveryServiceCost: string;
  RedeliverySum: string;
  RefCityRecipient: string;
  RefCitySender: string;
  RefEW: string;
  RefSettlementRecipient: string;
  RefSettlementSender: string;
  ScheduledDeliveryDate: string;
  SeatsAmount: string;
  SecurePayment: boolean | string;
  SenderAddress: string;
  SenderFullNameEW: string;
  ServiceType: string;
  Status: string;
  StatusCode: number;
  StorageAmount: string;
  StoragePrice: string;
  SumBeforeCheckWeight: string;
  TrackingUpdateDate: string;
  TrusteeRecipientPhone: string;
  UndeliveryReasons: string;
  UndeliveryReasonsDate: string;
  UndeliveryReasonsSubtypeDescription: string;
  VolumeWeight: string;
  WarehouseRecipient: string;
  WarehouseRecipientAddress: string;
  WarehouseRecipientInternetAddressRef: string;
  WarehouseRecipientNumber: string;
  WarehouseRecipientRef: string;
  WarehouseSender: string;
  WarehouseSenderAddress: string;
  WarehouseSenderInternetAddressRef: string;
}
```

*118 fields. `boolean | string` marks the 5 fields (`AviaDelivery`, `CargoReturnRefusal`,
`PostomatV3CellReservationNumber`, `Redelivery`, `SecurePayment`) where the two re-fetched sources
disagree on the wire shape — Go types them `bool`/`BoolInt`, the TypeScript SDK types them plain
`string` — widened rather than picked, so neither shape is silently dropped (see
`api-sync-report.md`, Drift finding 1). `Packaging`/`PartialReturnGoods` are `unknown[]` — both
sources type them `any[]`/`[]any`, with no further element shape documented by either. `StatusCode`
is the one field independently pinned by `spec.md` AC-07 (resolved during clarify) as a plain
`number`, not inheriting the ambiguous-shape treatment above.*

```ts
/** 21-value status-code set (platx/go-nova-poshta's enum.go + sirkostya009/go-novapost's
 *  doc-comment, spec.md §1 — both independently agree on all 21 numbers and Ukrainian text). Not a
 *  closed TypeScript union — StatusCode stays `number` on TrackingStatus (AC-07) — this exists only
 *  as a documentation reference for consuming developers, exported separately, never used to
 *  narrow or validate the wire value. */
export const TRACKING_STATUS_CODES = {
  1: "Створено відправником, не передано до відправки",
  2: "Видалено",
  3: "Номер не знайдено",
  4: "Перетнув межу міста відправлення",
  5: "Прямує до міста отримувача",
  6: "У місті отримувача",
  7: "Прибув на відділення отримувача",
  8: "Прибув на поштомат отримувача",
  9: "Відправлення отримано",
  10: "Відправлення отримано, грошовий переказ відправляється",
  11: "Відправлення отримано, грошовий переказ видано отримувачу",
  12: "Нова Пошта комплектує відправлення",
  41: "У місті (локал стандарт/експрес)",
  101: "На шляху до одержувача",
  102: "Відмова відправника",
  103: "Відмова одержувача",
  104: "Змінено адресу",
  105: "Припинено зберігання",
  106: "Одержано, створено ЄН зворотньої доставки",
  111: "Невдала спроба доставки — одержувача не знайдено",
  112: "Дата доставки перенесена одержувачем",
} as const;
```

## 3. Methods

| # | Method | User story | AC |
|---|---|---|---|
| 1 | `getStatusDocuments(payload)` | US-01, US-02, US-03, US-05, US-06 | AC-01, AC-02, AC-03, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10 |
| 2 | `getDocumentStatus(documentNumber, phone?)` | US-04 | AC-04, AC-08, AC-09, AC-10 |

### 3.1 `getStatusDocuments`

```ts
getStatusDocuments(payload: GetStatusDocumentsPayload): Promise<TrackingStatus[]>;
```

*Confirmed as `TrackingDocument`'s only real Nova Poshta method by reading all sources' `Model`
interfaces directly (`spec.md` §1) — a straight pass-through, no client-side splitting, capping, or
reordering (AC-03). The returned array is never reindexed/reordered/truncated to line up with the
request (AC-05, `sad.md` §1 Decision override) — a caller resolves a specific waybill's result by
that record's own `Number` field, never by array position. A not-found/removed status
(`StatusCode` 2 or 3) resolves as a normal record, not an error (AC-06); an unrecognized
`StatusCode` round-trips unchanged (AC-07).*

### 3.2 `getDocumentStatus`

```ts
/** sad.md §4 decision 3: makes exactly one call carrying a single-item Documents array, then
 *  matches the response by the returned record's own Number field against the requested
 *  documentNumber — exact string comparison, no trimming/case-folding (AC-04). Zero matches
 *  resolves undefined (distinct from AC-06's "not found" status record, which is normal data);
 *  more than one match throws NovaPoshtaApiError — the library cannot safely guess which record
 *  was meant. */
getDocumentStatus(documentNumber: string, phone?: string): Promise<TrackingStatus | undefined>;
```

*The single-waybill convenience wrapper `spec.md` §1 describes — the same shape found in every
comparable courier SDK's own convenience method (EasyPost, AfterShip) and the Nova Poshta PHP SDK's
own `checkTTN` helper, none of which are separate Nova Poshta API methods. `phone` defaults to an
empty string on the wire when omitted, matching `getStatusDocuments`' AC-02 behavior.*

## 4. `TrackingDocumentModule` interface (assembled)

```ts
export interface TrackingDocumentModule {
  getStatusDocuments(payload: GetStatusDocumentsPayload): Promise<TrackingStatus[]>;
  getDocumentStatus(documentNumber: string, phone?: string): Promise<TrackingStatus | undefined>;
}
```

## 5. Wire mapping (TypeScript method → `modelName` / `calledMethod`)

| Method | `modelName` | `calledMethod` | Transport |
|---|---|---|---|
| `getStatusDocuments` | `TrackingDocument` | `getStatusDocuments` | `client.request()` (JSON envelope) |
| `getDocumentStatus` | `TrackingDocument` | `getStatusDocuments` | `client.request()` — one call, single-item `Documents` array, then filters by `Number` client-side (`sad.md` §4 decision 3) |

No new client-side capability — both methods delegate to `NovaPoshtaClient.request()` exactly as
`common`'s and `address`'s read methods do (`sad.md` §4 decision 2). No direct `fetch`, no
`requestEnvelope()`.

## 6. Error contract (derived from `sad.md` §6 `alt` branches)

| Condition (sad.md §6 branch) | AC | Behavior |
|---|---|---|
| Network/transport failure (timeout, dropped connection, non-JSON body) | AC-10 | throws `NovaPoshtaApiError` |
| Declined — bad/expired key, or response isn't array-shaped (missing/non-array `data`) | AC-08, AC-09 | throws `NovaPoshtaApiError`, Nova Poshta's own message passed through |
| `getStatusDocuments` success, array-shaped `data` (any length — fewer/more/reordered vs. the request, none of which is a failure) | AC-01, AC-02, AC-03, AC-05, AC-06, AC-07 | resolves the typed `TrackingStatus[]` exactly as received |
| `getDocumentStatus` success, zero records match the requested `Number` | AC-04 | resolves `undefined` — not an error, and distinct from AC-06's "not found" status record |
| `getDocumentStatus` success, exactly one record matches | AC-04 | resolves that one `TrackingStatus` |
| `getDocumentStatus` success, more than one record matches the same `Number` | AC-04 | throws `NovaPoshtaApiError` — cannot safely determine which record was meant |

No `NovaPoshtaApiError` subclassing (project convention, `sad.md` §2, `CLAUDE.md`). AC-08 and AC-09
share one code path — the library performs no inspection of `errorCodes[]` to tell a decline from an
authorization failure.

## 7. Non-runtime, type-level contract clauses

`sad.md` §6 marks AC-11 non-runtime (its coverage table's explicit N/A) but it still binds this
contract:

- **AC-11 (origin-independent tracking):** neither method imports from, calls, or type-references
  `internet-document` — `documentNumber`/`DocumentNumber` is a plain `string`, never a `Ref` or any
  `internet-document`-produced value. Enforced by the module's own file boundary (`sad.md` §5 — no
  `internet-document` import in `src/modules/tracking-document/index.ts`), not a runtime check.

## 8. Out of scope (per `spec.md` §3 / §1 Decision overrides)

- Any dependency on `common.DocumentStatus` or `internet-document`'s `StateId`/`StateName` to
  resolve or cross-reference a status code's meaning (`spec.md` §1 Decision override, §3 non-goal).
- Caching, rate-limiting, or backing off a repeated tracking call (`spec.md` §3 non-goal) — even
  though `spec.md` §6.1 flags this as the library's first read endpoint likely to be polled on an
  interval.
- Capping, splitting, or client-side-validating how many waybills go into one `Documents` array call
  — the ~100-document ceiling one source states (`spec.md` §8, resolved) is never enforced here.
- Any client-side check of whether a supplied phone number's format is valid, or whether it actually
  matches the waybill's own record (AC-02, `spec.md` §8 OQ).

## 9. Findings from this pass's SDK re-fetch (see `api-sync-report.md` for full detail)

Re-fetching the two cross-checked sources' current code during this pass found `spec.md` §1's "91
fields" claim does not match either source (Go: 114 fields, TypeScript: 105 fields — a 118-field
union once deduplicated). Presented to the user as a core finding; **resolved: type the full
118-field union** (forward-compatible per AC-07), not the intersection. `spec.md` §1 corrected in
place to record the actual re-fetched counts. See `api-sync-report.md` Drift finding 1 for the
full field-origins table.
