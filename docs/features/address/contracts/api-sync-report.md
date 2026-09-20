---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-20"
feature_size: "S"
---

# API sync report — address

**Contract form:** `contracts/public-api.md` (library-sdk, per `sad.md` frontmatter
`target_surfaces: ["library-sdk"]` — no OpenAPI document applies to this feature).

**Gate note:** `data-model.md` is present but declares "No schema change" (legal fast-lane skip —
see its own header). Per its own note to `api`, this skill still ran the normal derive pass (not a
self-skip) because the 11-method contract + the two irregular response shapes still needed deriving
from `sad.md` §6 and `spec.md` §5. Field origins below trace to the documented Nova Poshta Address
API shape (cross-checked via `platx/go-nova-poshta`, per `spec.md` §1), not to a local schema —
there is none.

**Inputs found:**
- `sad.md` — found, §4 (decisions 5–8) and §6 (2 sequence flows + coverage table) read in full.
- `spec.md` — found, §1 (in-scope method list), §5 (AC-01..AC-13), §8 (open questions) read in full.
- `data-model.md` — found, legal no-schema-change skip (see gate note above).

## Field-origins table

One row per `method.field`. Confidence: **high** = named explicitly in `spec.md`/`sad.md`; **medium**
= standard Nova Poshta Address API field, cross-checked via the `platx/go-nova-poshta` SDK per
`spec.md` §1 but not individually re-verified against Nova Poshta's own (currently unreachable) docs
portal — tracked by `spec.md` §8 OQ-2.

| Field | Origin | Confidence |
|---|---|---|
| `getCities`, `getSettlements`, `searchSettlements`, `getAreas`, `getStreet`, `searchSettlementStreets`, `getWarehouses`, `getWarehouseTypes`, `save`, `update`, `delete` (method names) | `spec.md` §1 in-scope method list (11 methods) | high |
| `SearchWrapper<T>.TotalCount` / `.Addresses` | `sad.md` §4 decision 6 + `spec.md` AC-03 (documented `TotalCount`/`Addresses` wrapper) | high |
| `save`/`update`/`delete` return type `T \| undefined` | `sad.md` §4 decision 5, ADR-0001 (this feature) | high |
| `UpdateAddressPayload` = all-mandatory-fields variant of `SaveAddressPayload` | `sad.md` §4 decision 7, `spec.md` AC-05 | high |
| `SaveAddressPayload.CounterpartyRef` / `.StreetRef` / `.BuildingNumber` | `spec.md` AC-04 ("counterparty, a street `Ref`, and a building number") | high |
| `SaveAddressPayload.Flat` / `.Note` | `sad.md` §1 intro ("flat/note optional") | high |
| `City`/`Settlement`/`Street`/`Warehouse`/`Area`/`WarehouseType` reference-record fields (`Ref`, `Description`, `DescriptionRu`, `Area`, …) | Existing Nova Poshta Address API documented shape, cross-checked via `platx/go-nova-poshta` (`spec.md` §1) | medium |
| `GetCitiesFilters`/`GetSettlementsFilters`/`GetStreetParams`/`GetWarehousesFilters` filter fields (`FindByString`, `Page`, `Limit`, `CityRef`, `AreaRef`, …) | Existing Nova Poshta Address API documented parameters, same cross-check source | medium |
| `Warehouse.Schedule`, `.WarehouseStatus`, `.TypeOfWarehouse` | Existing Nova Poshta Address API documented shape, same cross-check source | medium |
| Error contract (`NovaPoshtaApiError`, conditions table) | `sad.md` §6 Flow 1 + Flow 2 `alt` branches, `spec.md` AC-07..AC-10 | high |

No field in the contract lacks a traceable origin above; none was invented.

## Drift checklist (bidirectional)

**Forward — contract derived correctly:**

- ☑ Method↔spec: all 11 `spec.md` §1 methods have a `public-api.md` §3 entry; none added, none
  dropped.
- ☑ Error-condition↔sequence: every `sad.md` §6 `alt`/`else` branch (Flow 1: 4-way; Flow 2: 3-way)
  maps to a row in `public-api.md` §5.
- ☑ Type-shape↔decision: `SearchWrapper<T>` (§4 decision 6), `T | undefined` write return (decision
  5), and the `UpdateAddressPayload` full-replace type (decision 7) are all present in the contract
  exactly as decided — no smoothing-over of the two irregular shapes.
- ☑ Convenience-method deferral is explicit (§6 of the contract states the shape requirement, not a
  fixed list) — matches `spec.md` §8 OQ-3's "TBD, decided at tasks" status; the contract does not
  prematurely invent a convenience-method set.

**Back-feed — coverage cross-check:**

- ☑ Every `spec.md` §5 AC (AC-01..AC-13) maps to ≥1 contract clause: AC-01/02 → §3 lookup methods;
  AC-03 → §3.3/§3.6 + §2 `SearchWrapper`; AC-04/06/07 → §3.9/§3.11 + §5; AC-05 → §3.10; AC-08/09/10 →
  §5; AC-11 → §6; AC-12/13 → §7.
- ☑ Every contract method maps to a §4 user story (see the §3 table's "User story" column) and ≥1 AC.
- ☑ Every `sad.md` §6 `alt`-branch has a response row in §5 — no sequence gap found; both flows are
  fully covered per `sad.md`'s own §6 coverage-check table, which already asserts no US/AC is left
  uncovered.

**Result:** 4/4 forward checks ✓, 3/3 back-feed checks ✓. No core finding failed; no flag raised.
No Save-as-OQ needed — no gap traced upstream to `spec.md` or `sad.md`.

## Open items carried forward (not resolved by this contract, by design)

- `spec.md` §8 OQ-3 (convenience-method set) — `public-api.md` §6 fixes the *shape* any convenience
  method must satisfy; the concrete list is still owned by `sdd:tasks address`.
- `spec.md` §8 OQ-2 (re-verify the 11-method list + field shapes against Nova Poshta's own docs
  portal once reachable) — the medium-confidence rows above are the ones this would tighten.
- `spec.md` §8 OQ-1 (pagination metadata / warnings) — intentionally out of scope for this contract
  (§8 "Out of scope").

## Lint

No OpenAPI document exists for this feature (library-sdk surface) — `spectral lint` does not apply.
The equivalent check is the published-build type-surface CI step named in `public-api.md` §7 (AC-13),
already an existing project convention (`common` does the same) — no new lint tooling proposed here.
