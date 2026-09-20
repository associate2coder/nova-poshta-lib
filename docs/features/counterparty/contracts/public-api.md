---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-20"
feature_size: "S"
---

# Public API contract — counterparty

**Interface kind:** `library-sdk` (from `sad.md` frontmatter `target_surfaces`). The contract is the
public TypeScript surface `createCounterpartyModule()` exports — method signatures, request/response
types, and the error contract every method shares — not an HTTP/OpenAPI document.

Derived from: `data-model.md` — absent, **legal fast-lane skip** (no schema change: `sad.md` §2/§3
state the module is stateless, no new entities beyond the module itself; no staged
`docs/features/counterparty/migrations/`); fields instead trace to the documented Nova Poshta
Counterparty/ContactPerson API shape, cross-checked against the `platx/go-nova-poshta` SDK's
`api/counterparty` and `api/contactperson` packages (re-fetched during this pass — see the
field-origins table and the drift note in `api-sync-report.md` for where that source falls short of
`spec.md`'s own citation), `sad.md` §4 (decisions 6–8, ADR-0001) and §6 (the two runtime flows + their
`alt` branches), `spec.md` §5 (AC-01..AC-17). Nothing here is typed by hand without one of those
origins.

## 1. Module shape

```ts
// src/modules/counterparty/index.ts
export function createCounterpartyModule(client: NovaPoshtaClient): CounterpartyModule;
```

`CounterpartyModule` is a flat object — no sub-namespace, matching `address`'s precedent (`sad.md` §4
decision 1 / the single `library-sdk` surface) — exported from `src/index.ts` alongside
`createCommonModule` and `createAddressModule`.

**Naming decision (this contract, not previously fixed upstream):** `sad.md` §5 lists "3 counterparty
writes + 3 contact-person writes" without naming them individually. Nova Poshta's own wire
`calledMethod` values are `save`/`update`/`delete` for **both** families (distinguished only by
`modelName`: `Counterparty` vs `ContactPerson`), which collide on one flat TypeScript object. This
contract resolves the collision the same way `getCounterpartyContactPersons` already disambiguates a
lookup: the counterparty family keeps the bare names (`save`/`update`/`delete`), the contact-person
family gets a `ContactPerson`-suffixed name (`saveContactPerson`/`updateContactPerson`/
`deleteContactPerson`). This is a naming-surface decision within `api`'s own mandate (no legitimate
alternative avoids the collision on a flat object), not a re-opening of `sad.md` §4's no-sub-namespace
decision.

## 2. Shared types

```ts
// src/types/counterparty.ts
import type { OpenEnum } from "./common.js"; // reused, not redefined
import type { SavedAddress } from "./address.js"; // reused, not redefined (sad.md §4 decision 8)

export type CounterpartyProperty = OpenEnum<"Sender" | "Recipient" | "ThirdParty">;

export interface CounterpartyRecordBase {
  Ref?: string;
  Description?: string;
  CounterpartyProperty?: CounterpartyProperty;
}
```

*`CounterpartyProperty` is the filter/read-side axis (`spec.md` §1's "property vs type" note) — kept
as an `OpenEnum` like `address`'s `IsBranch`/`Warehouse` fields, since Nova Poshta may document values
this library hasn't enumerated. It is never used as the `save`/`update` discriminant — see §3.9.*

## 3. Methods

One typed method per §1 in-scope Counterparty/ContactPerson method (5 lookups + 3 counterparty writes
+ 3 contact-person writes = 11). Convenience methods (US-08) are **not** enumerated here — `spec.md`
§8 OQ-3 leaves the exact set open, resolved at `sdd:tasks counterparty`; §7 below fixes the contract
shape any convenience method must satisfy once named.

| # | Method | User story | AC |
|---|---|---|---|
| 1 | `getCounterparties(filters?)` | US-01, US-02 | AC-01, AC-02 |
| 2 | `getCounterpartiesCatalog(filters)` | US-01, US-02 | AC-01, AC-02 |
| 3 | `getCounterpartyContactPersons(filters)` | US-01, US-02, US-07 | AC-01, AC-02 |
| 4 | `getCounterpartyAddresses(filters)` | US-01, US-02 | AC-01, AC-02 |
| 5 | `getCounterpartyOptions(filters)` | US-01 | AC-01 |
| 6 | `save(payload)` | US-04 | AC-03, AC-04, AC-07 |
| 7 | `update(payload)` | US-05 | AC-03, AC-05, AC-07 |
| 8 | `delete(payload)` | US-06 | AC-06, AC-07 |
| 9 | `saveContactPerson(payload)` | US-07 | AC-08 |
| 10 | `updateContactPerson(payload)` | US-07 | AC-09 |
| 11 | `deleteContactPerson(payload)` | US-07 | AC-10 |

Every method's error behavior is identical and covered once in §6 (AC-14/AC-15/AC-16) — not repeated
per row.

### 3.1 `getCounterparties`

```ts
export interface GetCounterpartiesFilters {
  CounterpartyProperty?: CounterpartyProperty;
  FindByString?: string;
  Page?: number;
}

getCounterparties(filters?: GetCounterpartiesFilters): Promise<Counterparty[]>;
```

*`Page` is passed through unmodified when supplied (AC-01) — the library never injects a default or
walks additional pages (`spec.md` §1 decision override / §8 OQ-1, the same known limitation
`address` carries).*

### 3.2 `getCounterpartiesCatalog`

```ts
export interface GetCounterpartiesCatalogFilters {
  Phone?: string;
  LastName?: string;
  Page?: number;
}

getCounterpartiesCatalog(filters: GetCounterpartiesCatalogFilters): Promise<Counterparty[]>;
```

*Exact wire method name (`getCounterpartiesCatalog` vs `getCatalogCounterparty`) is still open —
`spec.md` §8 OQ-2 — confirmed at implementation against a live response; this contract fixes the
TypeScript-facing name and shape, not the wire spelling. An empty match (no counterparty found for the
given phone/last-name) resolves an empty array, not an error (`spec.md` §5 Edge cases).*

### 3.3 `getCounterpartyContactPersons`

```ts
export interface GetCounterpartyContactPersonsFilters {
  Ref: string;
  Page?: number;
}

getCounterpartyContactPersons(
  filters: GetCounterpartyContactPersonsFilters,
): Promise<ContactPerson[]>;
```

### 3.4 `getCounterpartyAddresses`

```ts
export interface GetCounterpartyAddressesFilters {
  Ref: string;
  CounterpartyProperty?: CounterpartyProperty;
}

getCounterpartyAddresses(filters: GetCounterpartyAddressesFilters): Promise<SavedAddress[]>;
```

*Response type is `address`'s own `SavedAddress`, imported directly — never redefined (`sad.md` §4
decision 8, this library's first cross-module type import).*

### 3.5 `getCounterpartyOptions`

```ts
export interface GetCounterpartyOptionsFilters {
  Ref: string;
}

/** Shape undocumented in every source this feature could cross-check (see api-sync-report.md's
 *  open items) — kept as an open dictionary rather than inventing fields with no origin. */
export type CounterpartyOptions = Record<string, unknown>;

getCounterpartyOptions(filters: GetCounterpartyOptionsFilters): Promise<CounterpartyOptions[]>;
```

### 3.6 Counterparty record types (shared by lookups + write responses)

```ts
export interface PrivatePersonCounterparty extends CounterpartyRecordBase {
  CounterpartyType: "PrivatePerson";
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

export interface OrganizationCounterparty extends CounterpartyRecordBase {
  CounterpartyType: "Organization";
  EDRPOU?: string;
  OwnershipForm?: string;
  OwnershipFormDescription?: string;
}

export interface ThirdPartyCounterparty extends CounterpartyRecordBase {
  CounterpartyType: "ThirdParty";
  EDRPOU?: string;
  CityRef?: string;
}

/** AC-03: a discriminated union on the literal CounterpartyType field — never one shared loose shape
 *  where every type-specific field is merely optional (sad.md §4 decision 6, ADR-0001). */
export type Counterparty =
  | PrivatePersonCounterparty
  | OrganizationCounterparty
  | ThirdPartyCounterparty;
```

### 3.7 `ContactPerson` record type (shared by lookup + write responses)

```ts
export interface ContactPerson {
  Ref?: string;
  Description?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Phones?: string;
  AdditionalPhone?: string;
  Email?: string;
}
```

*Single flat shape — `ContactPerson` has no type axis to discriminate, unlike `Counterparty`
(`sad.md` §4 decision 7).*

### 3.8 `save`

```ts
export interface SavePrivatePersonPayload {
  CounterpartyType: "PrivatePerson";
  CounterpartyProperty: CounterpartyProperty;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  Phone: string;
  Email?: string;
}

export interface SaveOrganizationPayload {
  CounterpartyType: "Organization";
  CounterpartyProperty: CounterpartyProperty;
  EDRPOU: string;
}

export interface SaveThirdPartyPayload {
  CounterpartyType: "ThirdParty";
  CounterpartyProperty: CounterpartyProperty;
  EDRPOU: string;
  CityRef: string;
}

/** AC-04: the type checker rejects a payload mixing fields from more than one variant — three
 *  hand-written interfaces unioned, never collapsed to their shared fields (ADR-0001). */
export type SaveCounterpartyPayload =
  | SavePrivatePersonPayload
  | SaveOrganizationPayload
  | SaveThirdPartyPayload;

save(payload: SaveCounterpartyPayload): Promise<Counterparty | undefined>;
```

*`undefined` when Nova Poshta reports success with an empty `data` array — a valid outcome, not an
error (AC-07, `address` ADR-0001 reused unchanged).*

### 3.9 `update`

```ts
/** AC-05: every field its own variant's Save payload declares becomes mandatory here — an omitted
 *  key is never "leave unchanged" — while the discriminant (CounterpartyType) is preserved per
 *  variant, never collapsed to the three types' shared fields (ADR-0001, three hand-written types,
 *  chosen over a single distributive-conditional type for readability). */
export type UpdatePrivatePersonPayload = Required<SavePrivatePersonPayload> & { Ref: string };
export type UpdateOrganizationPayload = Required<SaveOrganizationPayload> & { Ref: string };
export type UpdateThirdPartyPayload = Required<SaveThirdPartyPayload> & { Ref: string };

export type UpdateCounterpartyPayload =
  | UpdatePrivatePersonPayload
  | UpdateOrganizationPayload
  | UpdateThirdPartyPayload;

update(payload: UpdateCounterpartyPayload): Promise<Counterparty | undefined>;
```

*Full-replace + discriminant guard is compile-time only (AC-05, ADR-0001) — a payload internally
consistent with one variant but shaped for the wrong `Ref` (an `Organization` payload against a
`Ref` actually saved as `PrivatePerson`) is not compile-time catchable; it surfaces as Nova Poshta's
own runtime decline (AC-14/AC-15), per AC-05's own scoping note. `undefined` on empty-on-success, same
as `save`.*

### 3.10 `delete`

```ts
export interface DeleteCounterpartyPayload {
  Ref: string;
}
export interface DeletedCounterparty {
  Ref: string;
}

delete(payload: DeleteCounterpartyPayload): Promise<DeletedCounterparty | undefined>;
```

*`undefined` on empty-on-success, same as `save`/`update` (AC-07).*

### 3.11 `saveContactPerson` / `updateContactPerson` / `deleteContactPerson`

```ts
export interface SaveContactPersonPayload {
  CounterpartyRef: string;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  Phone: string;
}

/** AC-09: every field ContactPerson documents, required and optional alike (incl. MiddleName),
 *  becomes mandatory here — no partial update, no "leave unchanged". Single flat shape, no
 *  discriminant to preserve (sad.md §4 decision 7). */
export type UpdateContactPersonPayload = Required<Omit<SaveContactPersonPayload, "CounterpartyRef">> & {
  Ref: string;
};

export interface DeleteContactPersonPayload {
  Ref: string;
}
export interface DeletedContactPerson {
  Ref: string;
}

saveContactPerson(payload: SaveContactPersonPayload): Promise<ContactPerson | undefined>;
updateContactPerson(payload: UpdateContactPersonPayload): Promise<ContactPerson | undefined>;
deleteContactPerson(payload: DeleteContactPersonPayload): Promise<DeletedContactPerson | undefined>;
```

*`CounterpartyRef` is fixed at save time and not part of the update guard's mandatory set — Nova
Poshta identifies the contact person to update by its own `Ref`, matching `UpdateReq`'s shape in the
cross-checked SDK (§ field-origins, `api-sync-report.md`). `undefined` on empty-on-success for all
three, same as the counterparty family (AC-07).*

## 4. `CounterpartyModule` interface (assembled)

```ts
export interface CounterpartyModule {
  getCounterparties(filters?: GetCounterpartiesFilters): Promise<Counterparty[]>;
  getCounterpartiesCatalog(filters: GetCounterpartiesCatalogFilters): Promise<Counterparty[]>;
  getCounterpartyContactPersons(
    filters: GetCounterpartyContactPersonsFilters,
  ): Promise<ContactPerson[]>;
  getCounterpartyAddresses(filters: GetCounterpartyAddressesFilters): Promise<SavedAddress[]>;
  getCounterpartyOptions(filters: GetCounterpartyOptionsFilters): Promise<CounterpartyOptions[]>;
  save(payload: SaveCounterpartyPayload): Promise<Counterparty | undefined>;
  update(payload: UpdateCounterpartyPayload): Promise<Counterparty | undefined>;
  delete(payload: DeleteCounterpartyPayload): Promise<DeletedCounterparty | undefined>;
  saveContactPerson(payload: SaveContactPersonPayload): Promise<ContactPerson | undefined>;
  updateContactPerson(payload: UpdateContactPersonPayload): Promise<ContactPerson | undefined>;
  deleteContactPerson(
    payload: DeleteContactPersonPayload,
  ): Promise<DeletedContactPerson | undefined>;
  // convenience methods (US-08 / AC-11): set TBD, resolved at sdd:tasks (spec.md §8 OQ-3);
  // each added method follows §7's shape requirements below.
}
```

## 5. Wire mapping (TypeScript method → `modelName` / `calledMethod`)

| Method | `modelName` | `calledMethod` |
|---|---|---|
| `getCounterparties` | `Counterparty` | `getCounterparties` |
| `getCounterpartiesCatalog` | `Counterparty` | `getCounterpartiesCatalog` (§8 OQ-2: spelling unverified) |
| `getCounterpartyContactPersons` | `Counterparty` | `getCounterpartyContactPersons` |
| `getCounterpartyAddresses` | `Counterparty` | `getCounterpartyAddresses` |
| `getCounterpartyOptions` | `Counterparty` | `getCounterpartyOptions` |
| `save` | `Counterparty` | `save` |
| `update` | `Counterparty` | `update` |
| `delete` | `Counterparty` | `delete` |
| `saveContactPerson` | `ContactPerson` | `save` |
| `updateContactPerson` | `ContactPerson` | `update` |
| `deleteContactPerson` | `ContactPerson` | `delete` |

## 6. Error contract (derived from `sad.md` §6 `alt` branches)

Every method — lookups and writes, both families — shares one error contract; there is no per-method
variance, so it is stated once here rather than repeated in §3.

| Condition (sad.md §6 branch) | AC | Behavior |
|---|---|---|
| Network/transport failure (timeout, dropped connection, non-JSON body) | AC-16 | throws `NovaPoshtaApiError` |
| Declined — bad/expired key, `Ref` outside caller's scope, or a disallowed key type for a contact-person op | AC-15 | throws `NovaPoshtaApiError`, Nova Poshta's message passed through |
| Declined — any other reason (invalid `Ref`, missing required field, business-rule rejection) | AC-14 | throws `NovaPoshtaApiError`, Nova Poshta's message passed through |
| Success, but `data` is not array-shaped | AC-14 | throws `NovaPoshtaApiError` (array-shape check, `common` ADR-0001, inherited unchanged) |
| Success, write's `data` is an empty array | AC-07 | resolves `undefined` — **not** an error |
| Success, lookup's `data` is array-shaped | AC-01, AC-02 | resolves the typed array |

AC-14 and AC-15 share one code path — the library performs no inspection of `errorCodes[]` to tell
them apart; the table lists them separately only because `spec.md` names them as distinct ACs. No
`NovaPoshtaApiError` subclassing (project convention, `sad.md` §2).

## 7. Convenience-method shape requirement (US-08 / AC-11, deferred set)

Whichever convenience methods `sdd:tasks counterparty` picks, each must satisfy this contract clause —
fixed now so the eventual method list doesn't need a second `api` pass:

- Exactly one call into `client.request()` per invocation (no client-side chaining across two calls,
  `spec.md` §3 non-goal — including never combining a counterparty write with a contact-person write).
- May narrow its input into one of the corresponding raw method's own documented filter parameters,
  but performs no post-call re-filtering, sorting, or reshaping of the response (AC-11, same rule as
  AC-02).
- Returns the same typed shape the underlying raw method returns for the equivalent input — no new
  response type invented for a convenience method.

## 8. Non-runtime, type-level contract clauses

These `sad.md` §6 marks as non-runtime (N/A in the coverage table) but that still bind this contract:

- **AC-12 (authoritative `Ref` source):** `counterparty` performs no caching — every `Ref` returned is
  read fresh from the response; this contract does not model or constrain how another module later
  consumes that `Ref`.
- **AC-13 (no cross-context enforcement):** `update`/`delete` on a counterparty make exactly one call
  each — no additional call checks or cascades into that counterparty's contact persons or `address`'s
  saved-address records.
- **AC-17 (published-build discoverability):** every method in §4 must appear in both the ESM
  (`.d.ts`) and CJS (`.d.cts`) built output, verified by the same CI post-build step `address`/
  `common` already use.

## 9. Out of scope (per `spec.md` §3 / §1 Decision override)

- Pagination walking or surfacing `info.totalCount` — the shared core client returns only `data`;
  `Page` filters in §3 are passed through as-is, never defaulted or auto-incremented (`spec.md` §8
  OQ-1, more urgent here than for `address` since `getCounterparties` is a growing list, not a
  semi-static one).
- Surfacing success-path `warnings[]` — dropped by the shared client today, tracked as `spec.md` §8
  OQ-1, not fixed by this contract.
- Client-side validation of any write payload field before sending (`spec.md` §3 non-goal).
- Chaining a counterparty-creation call and a contact-person-creation call into one client-side
  convenience method (`spec.md` §3 non-goal — no compensating rollback this stateless library could
  perform on a mid-sequence failure).
- Enforcing referential integrity across module boundaries on update/delete (AC-13, §8 above).
