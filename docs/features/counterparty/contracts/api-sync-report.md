---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-20"
feature_size: "S"
---

# API sync report — counterparty

**Contract form:** `contracts/public-api.md` (library-sdk, per `sad.md` frontmatter
`target_surfaces: ["library-sdk"]` — no OpenAPI document applies to this feature).

**Gate note:** `data-model.md` is absent. Evaluated the N/A condition myself per this skill's step 1:
`sad.md` §2/§3 state the module is stateless with no datastore of its own, §5 names no new
entities/building blocks beyond the `counterparty` module, and no `docs/features/counterparty/
migrations/` directory is staged. **Legal fast-lane skip** — proceeded deriving types/constraints from
the existing Nova Poshta Counterparty/ContactPerson API shape rather than a local schema.

**Inputs found:**
- `sad.md` — found, §4 (decisions 6–8, ADR-0001 pointer) and §6 (2 sequence flows + coverage table)
  read in full.
- `spec.md` — found, §1 (in-scope 11-method list + the property-vs-type note), §5 (AC-01..AC-17), §8
  (4 open questions) read in full.
- `data-model.md` — absent, legal no-schema-change skip (see gate note above).
- `adr/0001-three-hand-written-per-variant-update-types.md` — found, read in full (the discriminated
  `Update` mechanism this contract's §3.9 implements).

## Field-origins table

One row per `method.field`. Confidence: **high** = confirmed by re-fetching `platx/go-nova-poshta`'s
actual Go source during this pass (`api/counterparty/{request,response}.go`,
`api/contactperson/{request,response}.go`); **medium** = standard Nova Poshta Counterparty/
ContactPerson API filter shape, inferred from `address`'s own lookup-filter pattern
(`FindByString`/`Page`) and `spec.md`'s prose description, not independently source-confirmed;
**flagged** = no field-level source found anywhere cross-checked — modeled as an open dictionary
rather than invented.

| Field | Origin | Confidence |
|---|---|---|
| `save`/`update`/`delete` (Counterparty), `saveContactPerson`/`updateContactPerson`/`deleteContactPerson` | `spec.md` §1 in-scope method list (11 methods) | high |
| `SaveReq.CounterpartyType` / `.CounterpartyProperty` (both req'd on every save variant) | `platx/go-nova-poshta` `api/counterparty/request.go` (re-fetched), confirmed `SaveReq` embedded in all three variant structs | high |
| `SavePrivatePersonPayload.FirstName`/`.MiddleName`/`.LastName`/`.Phone`/`.Email` | `platx/go-nova-poshta` `api/counterparty/request.go`, `SavePrivatePersonReq` (re-fetched) | high |
| `SaveOrganizationPayload.EDRPOU` | `platx/go-nova-poshta` `api/counterparty/request.go`, `SaveOrganizationReq` (re-fetched) — note: no `CityRef` on this variant, unlike ThirdParty | high |
| `SaveThirdPartyPayload.EDRPOU`/`.CityRef` | `platx/go-nova-poshta` `api/counterparty/request.go`, `SaveThirdPersonReq` (re-fetched) | high |
| `Counterparty` response fields (`Ref`, `Description`, `FirstName`/`MiddleName`/`LastName`, `OwnershipForm`/`OwnershipFormDescription`, `EDRPOU`, `CounterpartyType`) | `platx/go-nova-poshta` `api/counterparty/response.go`, `Counterparty` struct (re-fetched) | high |
| `ContactPerson` fields (`Ref`, `Description`, `FirstName`/`MiddleName`/`LastName`, `Phones`, `AdditionalPhone`, `Email`) | `platx/go-nova-poshta` `api/contactperson/response.go`, `ContactPerson` struct (re-fetched) | high |
| `SaveContactPersonPayload` fields, `UpdateContactPersonPayload` (all-mandatory incl. `MiddleName`) | `platx/go-nova-poshta` `api/contactperson/request.go` (re-fetched: `CreateReq`/`UpdateReq`), `spec.md` AC-09 | high |
| `DeleteReq`/`DeleteRes` shape (bare `Ref`) for both families | `platx/go-nova-poshta` `api/counterparty/{request,response}.go` + `api/contactperson/{request,response}.go` (re-fetched) | high |
| `GetCounterpartiesFilters` (`CounterpartyProperty`, `FindByString`, `Page`) | `spec.md` §1 method description + `spec.md` AC-02 (filter/search param), inferred from `address`'s own filter-shape pattern — **not** independently confirmed against Nova Poshta (see gap note below) | medium |
| `GetCounterpartiesCatalogFilters` (`Phone`, `LastName`, `Page`) | `spec.md` §1 method description ("phone number + a partial last name") | medium |
| `GetCounterpartyContactPersonsFilters.Ref`, `GetCounterpartyAddressesFilters.Ref` | `spec.md` §1 ("the contact persons/addresses saved under a given counterparty") | medium |
| `CounterpartyOptions` response shape | No source cross-checked (spec, sad.md, `platx/go-nova-poshta`, or the community SDKs named in `spec.md`'s header) documents this method's response fields | **flagged** — modeled as `Record<string, unknown>`, no fields invented |
| Error contract (`NovaPoshtaApiError`, conditions table) | `sad.md` §6 Flow 1 + Flow 2 `alt` branches, `spec.md` AC-07, AC-14, AC-15, AC-16 | high |

No field in the contract lacks a traceable origin above; none was invented outright (the one gap,
`CounterpartyOptions`, is modeled as an open dictionary rather than fabricated fields).

## Drift found — and how it was resolved

**Gap: `spec.md` §1's cross-check citation does not cover the 5 lookup methods.** `spec.md`'s header
states the in-scope method list was "cross-checked against the `platx/go-nova-poshta` SDK's
`api/counterparty` and `api/contactperson` packages." Re-fetching that SDK's actual source during this
pass (`model.go` in both packages) shows it implements **only** `save`/`update`/`delete` for
Counterparty (three save variants, one update, one delete) and **only** `Save`/`Update`/`Delete` for
ContactPerson — it has no `getCounterparties`, `getCounterpartiesCatalog`,
`getCounterpartyContactPersons`, `getCounterpartyAddresses`, or `getCounterpartyOptions`
implementation at all. The write-side fields this contract states at **high** confidence are genuinely
SDK-confirmed; the five lookup methods' filter/response shapes above are marked **medium** (inferred,
not source-confirmed) rather than folded into the same high-confidence bucket the write methods
earned.

This is a real citation inaccuracy in `spec.md` §1, not a contract bug — resolved as **Save-as-OQ,
owner `specify`** (this skill's back-feed rule, step 7): `spec.md`'s existing §8 OQ-2 ("re-verify the
11-method surface against Nova Poshta's live docs") already covers re-verifying the *method names*;
it does not currently flag that the *cross-check source itself* only covers 6 of the 11 methods.
Recommend `specify counterparty` (or a `clarify` pass) tighten OQ-2's wording to note this gap
explicitly, so the eventual live-API re-verification doesn't skip the 5 lookup methods believing they
were already SDK-confirmed. Not blocking this contract — the medium-confidence marking above already
carries the honest signal forward.

## Drift checklist (bidirectional)

**Forward — contract derived correctly:**

- ☑ Method↔spec: all 11 `spec.md` §1 methods have a `public-api.md` §3 entry; none added, none
  dropped. The `ContactPerson`-suffixed naming (§1 of the contract) resolves a real name collision
  `sad.md` §5 left unnamed — documented as a contract-level decision, not silently introduced.
- ☑ Error-condition↔sequence: every `sad.md` §6 `alt`/`else` branch (Flow 1: 4-way; Flow 2: 3-way)
  maps to a row in `public-api.md` §6.
- ☑ Type-shape↔decision: the three-variant discriminated `Save`/`Update` union (ADR-0001, `sad.md` §4
  decision 6) and the flat `ContactPerson` update guard (`sad.md` §4 decision 7) are both present
  exactly as decided — no collapsing to shared fields.
- ☑ Convenience-method deferral is explicit (contract §7 states the shape requirement, not a fixed
  list) — matches `spec.md` §8 OQ-3's "TBD, decided at tasks" status.

**Back-feed — coverage cross-check:**

- ☑ Every `spec.md` §5 AC (AC-01..AC-17) maps to ≥1 contract clause: AC-01/02 → §3 lookup methods;
  AC-03 → §3.6 `Counterparty` union; AC-04/06/07 → §3.8/§3.10/§6; AC-05 → §3.9; AC-08 → §3.11;
  AC-09 → §3.11 `UpdateContactPersonPayload`; AC-10 → §3.11; AC-11 → §7; AC-12/AC-13 → §8;
  AC-14/AC-15/AC-16 → §6; AC-17 → §8.
- ☑ Every contract method maps to a §4 user story (see the §3 table's "User story" column) and ≥1 AC.
- ☑ Every `sad.md` §6 `alt`-branch has a response row in §6 — no sequence gap found; both flows are
  fully covered per `sad.md`'s own §6 coverage-check table.
- **Flag raised (see "Drift found" above):** `spec.md` §1's SDK cross-check citation overstates its own
  coverage for the 5 lookup methods. Resolved as Save-as-OQ, owner `specify`, not blocking.

**Result:** 4/4 forward checks ✓, 3/4 back-feed checks ✓ with 1 flag raised and resolved via
Save-as-OQ (owner `specify`, non-blocking — under the ≥3-flags pause threshold).

## Open items carried forward (not resolved by this contract, by design)

- `spec.md` §8 OQ-1 (pagination metadata / warnings) — intentionally out of scope for this contract
  (§9 "Out of scope").
- `spec.md` §8 OQ-2 (re-verify the 11-method list + field shapes against Nova Poshta's own docs
  portal) — this report's "Drift found" section recommends tightening its wording; the medium/flagged
  rows above are what it would resolve.
- `spec.md` §8 OQ-3 (convenience-method set) — `public-api.md` §7 fixes the *shape* any convenience
  method must satisfy; the concrete list is still owned by `sdd:tasks counterparty`.
- `spec.md` §8 OQ-4 (update discriminant mechanism) — resolved by `sad.md`/ADR-0001, reflected in this
  contract's §3.9; listed here only because `spec.md` itself still shows it open.
- `CounterpartyOptions`'s response shape — no source found; kept as an open dictionary
  (`Record<string, unknown>`) in §3.5 rather than invented. Worth a live-API check alongside OQ-2.

## Lint

No OpenAPI document exists for this feature (library-sdk surface) — `spectral lint` does not apply.
The equivalent check is the published-build type-surface CI step named in `public-api.md` §8 (AC-17),
already an existing project convention (`common`/`address` do the same) — no new lint tooling proposed
here.
