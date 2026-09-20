# Public API contract — `common`

> Interface kind: **library-sdk** (`sad.md` frontmatter `target_surfaces: ["library-sdk"]`). This
> is the exported TypeScript surface `tasks`/`implement`/`review` must produce — signatures,
> types, and error behavior — not an HTTP contract.
>
> Derived from `spec.md` §1 (in-scope list), §4/§5 (user stories + AC), and `sad.md` §4/§5/ADR-0001/
> ADR-0002. `data-model.md` does not exist for this feature — **legal fast-lane skip**: `common`
> introduces no database schema (the library is stateless, per `architecture-map.md` "Datastores:
> none" and `spec.md` §3 non-goals). Field shapes below are instead derived from the **existing
> schema equivalent** for a library-sdk surface: the current `src/types/common.ts` envelope shape
> plus the Nova Poshta `Common` model's documented per-method fields, cross-checked via community
> SDK sources as `spec.md` §1 already flags (re-verification against Nova Poshta's own docs is a
> standing `sad.md` §11 risk, owner Tech Lead, before release — not re-litigated here).

## 1. Module shape

```ts
// src/modules/common/index.ts
export function createCommonModule(client: NovaPoshtaClient): CommonModule;

export interface CommonModule {
  getCargoTypes(): Promise<CargoType[]>;
  getBackwardDeliveryCargoTypes(): Promise<CargoType[]>;
  getCargoDescriptionList(filters?: CargoDescriptionFilters): Promise<CargoDescription[]>;
  getDocumentStatuses(): Promise<DocumentStatus[]>;
  getOwnershipFormsList(): Promise<OwnershipForm[]>;
  getPalletsList(): Promise<Pallet[]>;
  getPaymentForms(): Promise<PaymentForm[]>;
  getServiceTypes(): Promise<ServiceType[]>;
  getTimeIntervals(filters: TimeIntervalFilters): Promise<TimeInterval[]>;
  getTiresWheelsList(): Promise<TireWheel[]>;
  getTraysList(): Promise<Tray[]>;
  getTypesOfAlternativePayers(): Promise<AlternativePayerType[]>;
  getTypesOfPayers(): Promise<PayerType[]>;
  getTypesOfPayersForRedelivery(): Promise<PayerTypeForRedelivery[]>;
  getTypesOfCounterparties(): Promise<CounterpartyType[]>;
}
```

`createCommonModule` mirrors every other `src/modules/<domain>/` factory (project ADR-0002):
takes the shared `NovaPoshtaClient`, returns a plain object of typed methods, calls
`client.request<T>("Common", "<CalledMethod>", methodProperties)` internally, no state of its own
(`sad.md` §4 decisions 2–3). Re-exported from `src/index.ts` alongside `createClient` so both
published builds (`.d.ts` ESM + `.d.cts` CJS via `tsup`) expose all 15 methods per AC-07.

## 2. The open-value-typing pattern (ADR-0002)

Every reference-list record's `Ref` field is the value another module will eventually accept
(e.g. a payment-form `Ref`, a payer-type `Ref`). Per ADR-0002 these are typed as **known literals
today plus an open string fallback**, never a closed union:

```ts
type OpenEnum<Known extends string> = Known | (string & {});
```

`Known` per method is populated from the live API once implementation captures real values
(`spec.md` §8 open question — "does Nova Poshta return X" — owner Tech Lead, due before
`sdd:implement common`). Until then this contract fixes the **pattern**, not the literal set —
`tasks`/`implement` fill `Known` from the integration suite's live captures, never invent it.

Every documented field on every record below is **optional** (ADR-0001 + AC-03): the shape check
only confirms the top-level response is array-shaped; a missing/`null`/off-type individual field
is tolerated, not rejected.

## 3. Types and methods

Field-origins confidence: **medium** for every row — cross-checked against Nova Poshta's `Common`
model via community SDK sources (spec.md §1), not yet verified against Nova Poshta's own docs
portal (blocked from automated fetch) or a live call. Re-verification is `sad.md` §11's standing
risk, owner Tech Lead, before release — this contract does not resolve it, it inherits it loudly.

| # | Method | Filters (`methodProperties`) | Record type | AC / US |
|---|---|---|---|---|
| 1 | `getCargoTypes` | none | `CargoType` | AC-01, US-01 |
| 2 | `getBackwardDeliveryCargoTypes` | none | `CargoType` | AC-01, US-01 |
| 3 | `getCargoDescriptionList` | `CargoDescriptionFilters` | `CargoDescription` | AC-02, US-02 |
| 4 | `getDocumentStatuses` | none | `DocumentStatus` | AC-01, US-01 |
| 5 | `getOwnershipFormsList` | none | `OwnershipForm` | AC-01, US-01 |
| 6 | `getPalletsList` | none | `Pallet` | AC-01, US-01 |
| 7 | `getPaymentForms` | none | `PaymentForm` | AC-01, US-01 |
| 8 | `getServiceTypes` | none | `ServiceType` | AC-01, US-01 |
| 9 | `getTimeIntervals` | `TimeIntervalFilters` (required) | `TimeInterval` | AC-02, US-02 |
| 10 | `getTiresWheelsList` | none | `TireWheel` | AC-01, US-01 |
| 11 | `getTraysList` | none | `Tray` | AC-01, US-01 |
| 12 | `getTypesOfAlternativePayers` | none | `AlternativePayerType` | AC-01, US-01 |
| 13 | `getTypesOfPayers` | none | `PayerType` | AC-01, US-01 |
| 14 | `getTypesOfPayersForRedelivery` | none | `PayerTypeForRedelivery` | AC-01, US-01 |
| 15 | `getTypesOfCounterparties` | none | `CounterpartyType` | AC-01, US-01 |

```ts
// src/types/common.ts (NEW — src/types/common.ts today holds the shared envelope types,
// renamed to src/types/envelope.ts per sad.md §2; this file becomes these 15 interfaces)

interface ReferenceRecordBase {
  Ref?: string;
  Description?: string;
}

export type CargoType = ReferenceRecordBase;

export type CargoDescription = ReferenceRecordBase;
export interface CargoDescriptionFilters {
  FindByString?: string;
}

export type DocumentStatus = ReferenceRecordBase;

export interface OwnershipForm extends ReferenceRecordBase {
  FullName?: string;
}

export type Pallet = ReferenceRecordBase;

export interface PaymentForm {
  Ref?: OpenEnum<never>; // known literals filled in during implementation (§2)
  Description?: string;
}

export type ServiceType = ReferenceRecordBase;

export interface TimeInterval {
  Number?: string;
  Start?: string;
  End?: string;
}
export interface TimeIntervalFilters {
  RecipientCityRef: string;
  DateTime?: string;
}

export type TireWheel = ReferenceRecordBase;

export type Tray = ReferenceRecordBase;

export type AlternativePayerType = ReferenceRecordBase;

export interface PayerType {
  Ref?: OpenEnum<never>;
  Description?: string;
}

export type PayerTypeForRedelivery = ReferenceRecordBase;

export interface CounterpartyType {
  Ref?: OpenEnum<never>;
  Description?: string;
}
```

Notes:
- `TimeIntervalFilters.RecipientCityRef` is **required** (US-02/AC-02 documented filter; the
  method has no meaningful unfiltered call per Nova Poshta's docs) — every other filter object is
  optional and every filter-less method takes none.
- `PaymentForm.Ref`, `PayerType.Ref`, `CounterpartyType.Ref`, and `AlternativePayerType`'s eventual
  `Ref` are the fields other future modules will accept as input values (`spec.md` AC-06) — these
  are the `OpenEnum` candidates; `Known` is left `never` here (compiles as plain `string`) until
  `implement` populates it from captured live values. The remaining lists (cargo types, pallets,
  trays, tires/wheels, service types, document statuses, ownership forms) are pure display/lookup
  values with no evidence in `spec.md`/`sad.md` that another module will accept them back as an
  enumerable input — plain optional `string` fields, no `OpenEnum`, unless `tasks`/`implement`
  surfaces a counter-example.

## 4. Error contract

Every method raises the library's single `NovaPoshtaApiError` (per CLAUDE.md, `spec.md` header
note above AC-01) in every failure branch from `sad.md` §6 Flow 1 — no method-specific error type,
no empty/partial-list-as-success:

| Branch (`sad.md` §6 `alt`) | Trigger | AC |
|---|---|---|
| Network/transport failure | timeout, dropped connection, non-JSON body | AC-08 |
| API key rejected | Nova Poshta declines on the key itself | AC-04 |
| Declined for another reason | bad filter value, temporarily unavailable list, etc. | AC-05 |
| Success but not array-shaped | `data` isn't a navigable list (ADR-0001 check, in the core client) | AC-03 |

`NovaPoshtaApiError` passes through Nova Poshta's own `errors`/`errorCodes`/`warnings` verbatim
for the three decline/transport branches; the AC-03 branch is the one case where the message is
library-written, since Nova Poshta itself reports no error for a shape mismatch (`spec.md` header
note).

**Not an error** (AC-03's tolerated set — must NOT throw): a missing documented field, a `null`
value, a field with an unexpected basic type, an undocumented new value, or an extra undocumented
field on an otherwise array-shaped response. `test/unit/modules/common` must assert both directions
per `spec.md` §6 NFR row 2 (100% throw on the four branches above; 0% throw on per-field noise).

## 5. Filtering behavior (AC-02)

`getCargoDescriptionList` and `getTimeIntervals` pass their filter object straight through as
`methodProperties` — no client-side re-filtering, re-sorting, or stripping of Nova Poshta's
response. How well the response matches the filter is Nova Poshta's own behavior (`spec.md` AC-02).

## 6. Examples

```ts
import { createClient } from "nova-poshta-lib";
import { createCommonModule } from "nova-poshta-lib/modules/common";

const client = createClient("<API_KEY>");
const common = createCommonModule(client);

// Happy path (AC-01)
const paymentForms = await common.getPaymentForms();
// => [{ Ref: "...", Description: "Готівка" }, ...]

// Filtered happy path (AC-02)
const descriptions = await common.getCargoDescriptionList({ FindByString: "Документи" });

// Error (AC-04/05/08/03) — all four branches throw the same class
try {
  await common.getPaymentForms();
} catch (err) {
  if (err instanceof NovaPoshtaApiError) {
    console.error(err.errors, err.errorCodes);
  }
}
```

## 7. Traceability

- Every method ↔ `spec.md` §1 in-scope list (15/15, AC-07/QG-4 method-surface completeness).
- Every method ↔ a `spec.md` §4 user story (US-01/02/03/04/05/06 — see table above and
  `sad.md` §6 coverage table, reproduced there for the runtime flow; US-05/US-06 are non-runtime,
  satisfied by the published `.d.ts`/`.d.cts` surface itself, not a method body).
- Error contract ↔ `sad.md` §6 Flow 1 `alt` branches (AC-03/04/05/08) — 1:1, no extra branch
  invented, none dropped.
- `OpenEnum` pattern ↔ ADR-0002; array-shape-only check ↔ ADR-0001 (enforced once in the core
  client per `sad.md` §5, not per-method — no method here redeclares it).
