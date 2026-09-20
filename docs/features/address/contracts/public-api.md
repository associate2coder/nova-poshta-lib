---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-20"
feature_size: "S"
---

# Public API contract — address

**Interface kind:** `library-sdk` (from `sad.md` frontmatter `target_surfaces`). The contract is the
public TypeScript surface `createAddressModule()` exports — method signatures, request/response
types, and the error contract every method shares — not an HTTP/OpenAPI document.

Derived from: `data-model.md` (no schema — the legal fast-lane skip; fields instead trace to the
documented Nova Poshta Address API shape, cross-checked via `platx/go-nova-poshta`, `spec.md` §1),
`sad.md` §4 (solution-strategy decisions 5–7) and §6 (the two runtime flows + their `alt` branches),
`spec.md` §5 (AC-01..AC-13). Nothing here is typed by hand without one of those origins — see the
field-origins table in `api-sync-report.md`.

## 1. Module shape

```ts
// src/modules/address/index.ts
export function createAddressModule(client: NovaPoshtaClient): AddressModule;
```

`AddressModule` is a flat object — no sub-namespace (`sad.md` §4 decision 8) — exported from
`src/index.ts` alongside `createCommonModule`, matching the existing `common` precedent.

## 2. Shared types

```ts
// src/types/address.ts
import type { OpenEnum } from "./common.js"; // reused, not redefined

export interface AddressReferenceRecordBase {
  Ref?: string;
  Description?: string;
}

/** AC-03: the wrapper searchSettlements / searchSettlementStreets return verbatim — never unwrapped
 *  to just `Addresses`. `T` is the per-method match record shape. */
export interface SearchWrapper<T> {
  TotalCount?: number;
  Addresses?: T[];
}
```

## 3. Methods

One typed method per §1 in-scope Address API method (8 lookups + 3 writes). Convenience methods
(US-07 / AC-11) are **not** enumerated here — `spec.md` §8 OQ-3 leaves the exact set open, resolved
at `sdd:tasks address`; §6 below fixes the contract shape any convenience method must satisfy once
named.

| # | Method | User story | AC |
|---|---|---|---|
| 1 | `getCities(filters?)` | US-01, US-02 | AC-01, AC-02 |
| 2 | `getSettlements(filters?)` | US-01, US-02 | AC-01, AC-02 |
| 3 | `searchSettlements(params)` | US-01, US-02, US-03 | AC-01, AC-02, AC-03 |
| 4 | `getAreas()` | US-01 | AC-01 |
| 5 | `getStreet(params)` | US-01, US-02 | AC-01, AC-02 |
| 6 | `searchSettlementStreets(params)` | US-01, US-02, US-03 | AC-01, AC-02, AC-03 |
| 7 | `getWarehouses(filters?)` | US-01, US-02 | AC-01, AC-02 |
| 8 | `getWarehouseTypes()` | US-01 | AC-01 |
| 9 | `save(payload)` | US-04 | AC-04, AC-07 |
| 10 | `update(payload)` | US-05 | AC-05, AC-07 |
| 11 | `delete(payload)` | US-06 | AC-06, AC-07 |

Every method's error behavior is identical and covered once in §5 (AC-08/AC-09/AC-10) — not repeated
per row.

### 3.1 `getCities`

```ts
export interface GetCitiesFilters {
  Ref?: string;
  FindByString?: string;
  Page?: number;
  Limit?: number;
}
export interface City extends AddressReferenceRecordBase {
  DescriptionRu?: string;
  Area?: string;
  SettlementType?: string;
  IsBranch?: OpenEnum<"0" | "1">;
  CityID?: string;
}

getCities(filters?: GetCitiesFilters): Promise<City[]>;
```

*`Page`/`Limit` are passed through unmodified when supplied (AC-01) — the library never injects a
default or walks additional pages (the pagination-metadata gap is a known limitation, `spec.md` §1
Decision override / §8 OQ-1).*

### 3.2 `getSettlements`

```ts
export interface GetSettlementsFilters {
  AreaRef?: string;
  Ref?: string;
  Warehouse?: OpenEnum<"0" | "1">;
  FindByString?: string;
  Page?: number;
  Limit?: number;
}
export interface Settlement extends AddressReferenceRecordBase {
  DescriptionRu?: string;
  Area?: string;
  RegionsDescription?: string;
  SettlementTypeDescription?: string;
}

getSettlements(filters?: GetSettlementsFilters): Promise<Settlement[]>;
```

### 3.3 `searchSettlements`

```ts
export interface SearchSettlementsParams {
  CityName: string;
  Limit?: number;
}
export interface SettlementAddress extends AddressReferenceRecordBase {
  DeliveryCity?: string;
  StreetsAvailability?: boolean;
  ParentRegionTypeDescription?: string;
  ParentRegionCode?: string;
  RegionTypeDescription?: string;
  SettlementTypeCode?: string;
  Present?: string;
}

searchSettlements(params: SearchSettlementsParams): Promise<SearchWrapper<SettlementAddress> | undefined>;
```

*AC-03: the raw envelope is `data: [wrapper]` — the module unwraps the one-item outer array (same
unwrap ADR-0001 uses for writes) but leaves `Addresses` inside the wrapper exactly as documented.
`undefined` when the envelope's single-item array itself is empty (mirrors the write empty-on-success
shape, §5).*

### 3.4 `getAreas`

```ts
export type Area = AddressReferenceRecordBase;

getAreas(): Promise<Area[]>;
```

### 3.5 `getStreet`

```ts
export interface GetStreetParams {
  CityRef: string;
  FindByString?: string;
  Page?: number;
  Limit?: number;
}
export interface Street extends AddressReferenceRecordBase {
  StreetsType?: string;
  StreetsTypeDescription?: string;
  Location?: { lat?: string; lon?: string };
}

getStreet(params: GetStreetParams): Promise<Street[]>;
```

### 3.6 `searchSettlementStreets`

```ts
export interface SearchSettlementStreetsParams {
  StreetName: string;
  SettlementRef: string;
  Limit?: number;
}
export interface StreetAddress extends AddressReferenceRecordBase {
  SettlementRef?: string;
  SettlementStreetRef?: string;
  Location?: { lat?: string; lon?: string };
  StreetsTypeDescription?: string;
  Present?: string;
}

searchSettlementStreets(
  params: SearchSettlementStreetsParams,
): Promise<SearchWrapper<StreetAddress> | undefined>;
```

*Same wrapper/unwrap rule as `searchSettlements` (§3.3).*

### 3.7 `getWarehouses`

```ts
export interface GetWarehousesFilters {
  CityName?: string;
  CityRef?: string;
  Page?: number;
  Limit?: number;
  Language?: string;
  TypeOfWarehouseRef?: string;
  WarehouseId?: string;
  FindByString?: string;
}
export interface Warehouse extends AddressReferenceRecordBase {
  Number?: string;
  CityRef?: string;
  CityDescription?: string;
  SettlementRef?: string;
  ShortAddress?: string;
  Phone?: string;
  TypeOfWarehouse?: string;
  WarehouseStatus?: string;
  Schedule?: Record<string, string>;
}

getWarehouses(filters?: GetWarehousesFilters): Promise<Warehouse[]>;
```

### 3.8 `getWarehouseTypes`

```ts
export type WarehouseType = AddressReferenceRecordBase;

getWarehouseTypes(): Promise<WarehouseType[]>;
```

### 3.9 `save`

```ts
export interface SaveAddressPayload {
  CounterpartyRef: string;
  StreetRef: string;
  BuildingNumber: string;
  Flat?: string;
  Note?: string;
}
export interface SavedAddress {
  Ref: string;
  Description?: string;
  CounterpartyRef?: string;
  StreetRef?: string;
  BuildingNumber?: string;
  Flat?: string;
  Note?: string;
}

save(payload: SaveAddressPayload): Promise<SavedAddress | undefined>;
```

*`undefined` when Nova Poshta reports success with an empty `data` array — a valid outcome, not an
error (AC-07, ADR-0001). `Flat`/`Note` optional here; `update`'s payload makes both mandatory (§3.10).*

### 3.10 `update`

```ts
/** AC-05: every field `save` accepts is mandatory here — an omitted key is never "leave unchanged".
 *  Derived from SaveAddressPayload via a utility type so the two can't drift apart (sad.md §4-7). */
export type UpdateAddressPayload = Required<Omit<SaveAddressPayload, "CounterpartyRef">> & {
  Ref: string;
  CounterpartyRef: string;
};

update(payload: UpdateAddressPayload): Promise<SavedAddress | undefined>;
```

*Full-replace guard is compile-time only (`sad.md` §4 decision 7) — no added runtime validation.
`undefined` on empty-on-success, same as `save`.*

### 3.11 `delete`

```ts
export interface DeleteAddressPayload {
  Ref: string;
}
export interface DeletedAddress {
  Ref: string;
}

delete(payload: DeleteAddressPayload): Promise<DeletedAddress | undefined>;
```

*`undefined` on empty-on-success, same as `save`/`update` (AC-07).*

## 4. `AddressModule` interface (assembled)

```ts
export interface AddressModule {
  getCities(filters?: GetCitiesFilters): Promise<City[]>;
  getSettlements(filters?: GetSettlementsFilters): Promise<Settlement[]>;
  searchSettlements(params: SearchSettlementsParams): Promise<SearchWrapper<SettlementAddress> | undefined>;
  getAreas(): Promise<Area[]>;
  getStreet(params: GetStreetParams): Promise<Street[]>;
  searchSettlementStreets(
    params: SearchSettlementStreetsParams,
  ): Promise<SearchWrapper<StreetAddress> | undefined>;
  getWarehouses(filters?: GetWarehousesFilters): Promise<Warehouse[]>;
  getWarehouseTypes(): Promise<WarehouseType[]>;
  save(payload: SaveAddressPayload): Promise<SavedAddress | undefined>;
  update(payload: UpdateAddressPayload): Promise<SavedAddress | undefined>;
  delete(payload: DeleteAddressPayload): Promise<DeletedAddress | undefined>;
  // convenience methods (US-07 / AC-11): set TBD, resolved at sdd:tasks (spec.md §8 OQ-3);
  // each added method follows §6's shape requirements below.
}
```

## 5. Error contract (derived from `sad.md` §6 `alt` branches)

Every method — lookups and writes alike — shares one error contract; there is no per-method
variance, so it is stated once here rather than repeated in §3.

| Condition (sad.md §6 branch) | AC | Behavior |
|---|---|---|
| Network/transport failure (timeout, dropped connection, non-JSON body) | AC-10 | throws `NovaPoshtaApiError` |
| Declined — bad/expired API key, or a write on a `Ref` outside the caller's counterparty | AC-09 | throws `NovaPoshtaApiError`, Nova Poshta's message passed through |
| Declined — any other reason (invalid `Ref`, missing required field, business-rule rejection) | AC-08 | throws `NovaPoshtaApiError`, Nova Poshta's message passed through |
| Success, but `data` is not array-shaped | AC-08 | throws `NovaPoshtaApiError` (array-shape check, `common` ADR-0001, inherited unchanged) |
| Success, write's `data` is an empty array | AC-07 | resolves `undefined` — **not** an error |
| Success, lookup's `data` is array-shaped | AC-01, AC-02 | resolves the typed array |
| Success, `searchSettlements`/`searchSettlementStreets`'s one-item envelope holds the wrapper | AC-03 | resolves the typed `SearchWrapper<T>` |

AC-08 and AC-09 share one code path — the library performs no inspection of `errorCodes[]` to tell
them apart; the table lists them separately only because `spec.md` names them as distinct ACs. No
`NovaPoshtaApiError` subclassing (project convention, `sad.md` §2).

## 6. Convenience-method shape requirement (US-07 / AC-11, deferred set)

Whichever convenience methods `sdd:tasks address` picks, each must satisfy this contract clause —
it is fixed now so the eventual method list doesn't need a second api pass:

- Exactly one call into `client.request()` per invocation (no client-side chaining, `spec.md` §3
  non-goal).
- The convenience method may narrow its input into one of the corresponding raw method's own
  documented filter parameters (e.g. an exact-match convenience over `getCities`), but performs no
  post-call re-filtering, sorting, or reshaping of the response (AC-11, same rule as AC-02).
- Returns the same typed shape the underlying raw method returns for the equivalent input — no new
  response type invented for a convenience method.

## 7. Non-runtime, type-level contract clauses

These `sad.md` §6 marks as non-runtime (N/A in the coverage table) but that still bind this
contract:

- **AC-13 (published-build discoverability):** every method in §4 must appear in both the ESM
  (`.d.ts`) and CJS (`.d.cts`) built output, verified by a CI post-build step importing the built
  package (not source) in both formats.
- **AC-12 (authoritative `Ref` source):** `address` performs no caching — every `Ref` returned is
  read fresh from the response; this contract does not model or constrain how another module later
  consumes that `Ref`.

## 8. Out of scope (per `spec.md` §3 / §1 Decision override)

- Pagination walking or surfacing `info.totalCount` — the shared core client returns only `data`;
  `Page`/`Limit` filters in §3 are passed through as-is, never defaulted or auto-incremented.
- Surfacing success-path `warnings[]` (e.g. a normalized `BuildingNumber` on `save`) — dropped by the
  shared client today; tracked as `spec.md` §8 OQ-1, not fixed by this contract.
- Client-side validation of any write payload field before sending (`spec.md` §3 non-goal).
