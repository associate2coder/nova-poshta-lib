---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-21"
feature_size: "M"
---

# API sync report — internet-document

**Contract form:** `contracts/public-api.md` (library-sdk, per `sad.md` frontmatter
`target_surfaces: ["library-sdk"]` — no OpenAPI document applies to this feature).

**Gate note:** `data-model.md` is present and states "no schema change" (the module is stateless,
`sad.md` §2 — no local entity, no staged `docs/features/internet-document/migrations/`). Proceeded
deriving types/constraints from the existing Nova Poshta InternetDocument API shape rather than a
local schema, the same path `address`/`counterparty` took.

**Inputs found:**
- `sad.md` — found, §4 (decisions 1–9, ADR-0001/0002/0003 pointers), §5 (building blocks), §6 (4
  sequence flows + coverage table) read in full.
- `spec.md` — found, §1 (in-scope 8-method list + 3 decision overrides), §5 (AC-01..AC-19), §8 (5 open
  questions) read in full.
- `data-model.md` — found, "no schema change" outcome (see gate note above).
- `adr/0001-*.md` (two-intersected-type-sets), `adr/0002-*.md` (per-Ref delete outcome),
  `adr/0003-*.md` (construct-then-verify print link) — all found, read in full.

**Re-fetched during this pass** (beyond what `spec.md`'s own citation lists as sources): the actual
current source of all three community SDKs `spec.md` §1 names —
`platx/go-nova-poshta/api/internetdocument/{model,request,response}.go`,
`serj1chen/nova-poshta-sdk-php/lib/NovaPoshta/{ApiModels/InternetDocument.php,
MethodParameters/BasePrintDocumentParameters.php}`, and
`maddsua/NovaPoshtaREST/lib/models/InternetDocument.ts` — plus the Go SDK's `custom/enum` package
(`service_type.go`, `cargo_type.go`, `payer_type.go`, `payment_method.go`) for the literal-value sets.

## Field-origins table

One row per `method.field`. Confidence: **high** = confirmed by re-fetching a cross-checked SDK's
actual source during this pass; **medium** = standard shape inferred from `spec.md`'s prose or a
closely related confirmed field, not independently source-confirmed; **flagged** = no field-level
source found in any cross-checked source — modeled defensively, no field invented.

| Field | Origin | Confidence |
|---|---|---|
| `save`/`update`/`delete`/`getDocumentList`/`getDocumentPrice`/`getDocumentDeliveryDate`/`printDocument`/`printMarkings` (8 methods) | `spec.md` §1 in-scope method list | high |
| `ServiceType` (4 values kept, per ADR-0001) | `platx/go-nova-poshta` `custom/enum/service_type.go` (re-fetched) — **note:** the source documents 6 values, not 4 (see Drift finding 1 below) | high (as far as it goes) / **flagged gap** |
| `CargoType` (4 values kept, per ADR-0001) | `platx/go-nova-poshta` `custom/enum/cargo_type.go` (re-fetched) — **note:** the source documents 8 values, not 4 (see Drift finding 1) | high (as far as it goes) / **flagged gap** |
| `PayerType`, `PaymentMethod` | `platx/go-nova-poshta` `custom/enum/{payer_type,payment_method}.go` (re-fetched) — exact match, no gap | high |
| `SaveInternetDocumentPayload` base fields (`DateTime`, `Weight`, `SeatsAmount`, `Description`, `Cost`, `CitySender`, `Sender`, `SenderAddress`, `ContactSender`, `SendersPhone`, `CityRecipient`, `Recipient`, `ContactRecipient`, `RecipientsPhone`) | `platx/go-nova-poshta` `api/internetdocument/request.go`, `SaveReq` (re-fetched) | high |
| Warehouse-leg fields (`RecipientAddress` as warehouse Ref) | `platx/go-nova-poshta` `request.go`, inferred from `WarehouseSaveReq` embedding `SaveReq` with no additional door-address fields | medium |
| Door-leg fields (`RecipientCityName`, `RecipientArea`, `RecipientAddressName`, `RecipientHouse`, `RecipientFlat`) | `platx/go-nova-poshta` `request.go`, `AddressSaveReq` (re-fetched) | high |
| `CargoType`-specific field variance (i.e., which fields change per cargo type) | No cross-checked source models cargo-detail fields as varying by `CargoType` — every source keeps `Weight`/`SeatsAmount`/`CargoDetails` uniform regardless of cargo type | **flagged, since resolved** — ADR-0004 narrowed `CargoType` to a plain discriminant field on `SaveCommonFields`/`UpdateCommonFields`, identical across every variant; the `CargoTypeDetail` intersection this row originally described was never implemented |
| `BackwardDeliveryData` (property exists) | `serj1chen/nova-poshta-sdk-php`'s `InternetDocument` class docblock, `@property array BackwardDeliveryData` (re-fetched) | high (existence) |
| `BackwardDeliveryData` sub-fields (`PayerType`, `CargoType`, `RedeliveryString`, `Amount`) | Inferred from `GetDocumentPriceReq.RedeliveryCalculate{CargoType,Amount}`'s naming convention — no source directly documents `BackwardDeliveryData`'s own sub-field set | medium |
| `SavedInternetDocument` response fields (`Ref`, `CostOnSite`, `EstimatedDeliveryDate`, `IntDocNumber`, `TypeDocument`) | `platx/go-nova-poshta` `response.go`, `SaveItem` (re-fetched) | high |
| `DeleteInternetDocumentPayload.Documents` (array shape) | ADR-0002 (design decision) — **contradicted by 2 of 3 SDKs' own field typing** (see Drift finding 2 below) | **flagged gap** |
| `DeletedInternetDocumentOutcome` (`Ref`, `Removed`, `Reason`) | `Ref` confirmed from `platx/go-nova-poshta` `response.go`'s `DeleteItem` (re-fetched, high) — no source's `DeleteItem`/`i_delete_result` carries a `Removed`/`Reason` field of its own; both are this module's own reconciliation output (ADR-0002), not a passthrough of Nova Poshta's response shape | `Ref` high / `Removed`+`Reason` — contract-original, by design |
| `WaybillListItem` fields (`Ref`, `DateTime`, `IntDocNumber`, `Cost`, `CitySender`, `CityRecipient`, `CostOnSite`, `PayerType`, `PaymentMethod`, `AfterpaymentOnGoodsCost`, `StateId`, `StateName`, `RejectionReason`) | `platx/go-nova-poshta` `response.go`, `GetDocumentListItem` (re-fetched) | high |
| `GetDocumentListFilters` (`DateTimeFrom`, `DateTimeTo`, `Page`) | `platx/go-nova-poshta` `request.go`, `GetDocumentListReq` (re-fetched) | high |
| `GetDocumentPricePayload`/`DocumentPriceEstimate` fields | `platx/go-nova-poshta` `request.go`/`response.go`, `GetDocumentPriceReq`/`GetDocumentPriceItem` (re-fetched) | high |
| `GetDocumentDeliveryDatePayload`/`DocumentDeliveryDateEstimate` fields | `platx/go-nova-poshta` `request.go`/`response.go`, `GetDocumentDeliveryDateReq`/`GetDocumentDeliveryDateItem` (re-fetched) | high |
| `PrintLinkPayload` (`Documents`/`DocumentRefs`, `Type`, `Copies`) | `serj1chen/nova-poshta-sdk-php`'s `BasePrintDocumentParameters.php` (re-fetched) | high |
| `PrintLinkPayload.Type` values (`Pdf`/`Html`) | `serj1chen/nova-poshta-sdk-php`'s `InternetDocument::PRINT_TYPE_PDF`/`PRINT_TYPE_HTML` constants (re-fetched) | high |
| `PrintLinkPayload.Copies` values (`double`/`fourfold`) | `serj1chen/nova-poshta-sdk-php`'s `InternetDocument::PRINT_COPIES_DOUBLE`/`PRINT_COPIES_FOURFOLD` constants (re-fetched) | high |
| Print link is one combined URL per call, embeds the caller's `apiKey` | `serj1chen/nova-poshta-sdk-php`'s `getPrintLink()` private helper (re-fetched: iterates all refs into one URL path, appends `/apiKey/<key>` as the final segment) — **resolves `spec.md` §8 OQ-1's two unconfirmed assumptions** at high confidence | high |
| Error contract (`NovaPoshtaApiError`, conditions table) | `sad.md` §6 Flow 1–4 `alt` branches, `spec.md` AC-05, AC-07, AC-08, AC-11, AC-12, AC-14, AC-15, AC-16 | high |

No field in the contract lacks a traceable origin above; the two genuine gaps (`CargoType`-specific
field variance, `BackwardDeliveryData` sub-fields) are modeled minimally, not invented.

## Drift found — and how it was resolved

### Finding 1: `ServiceType`/`CargoType` cardinality mismatch

`spec.md` §1 and `sad.md` ADR-0001 fix `ServiceType` at 4 values (warehouse↔warehouse, warehouse↔door,
door↔warehouse, door↔door) and `CargoType` at 4 (parcel, cargo, documents, pallet). Re-fetching
`platx/go-nova-poshta`'s actual `custom/enum` source during this pass shows the wire enum documents
**6** `ServiceType` values (adds `WarehousePostomat`, `DoorsPostomat` — postomat/parcel-locker legs)
and **8** `CargoType` values (adds `TiresWheels`, `Money`, `SignedDocuments`, `Trays`). At the full
cardinality this would be up to 48 valid combinations, not ADR-0001's ~16.

Presented to the user during this pass (core finding, per this skill's step 7 pause threshold).
**Decision: keep ADR-0001's 4×4 model as already designed**, not reopen the Accepted ADR mid-contract.
Resolved as **Save-as-OQ, owner `design`** (ADR-0001) **and `specify`** (`spec.md` §1's method-scope
list) — `spec.md`'s existing §8 OQ-1 ("re-verify... the full save/update field shape") already covers
re-verifying field shapes against the live docs; recommend tightening its wording to explicitly name
the ServiceType/CargoType cardinality gap this re-fetch found, so a future live-API check doesn't miss
it believing the 4×4 set was already SDK-confirmed. Not blocking this contract.

### Finding 2: `delete` batch capability not clearly confirmed

`sad.md` ADR-0002 and `spec.md` AC-07/AC-08 model `delete` as batch-capable (multiple Refs in one
call, reconciled per-Ref). Re-fetching all three SDKs' actual source:
- `platx/go-nova-poshta`'s `DeleteReq.DocumentRefs` is typed `types.UUID` — a **single** UUID, not an
  array.
- `maddsua/NovaPoshtaREST`'s `deleteExpressDoc` types `DocumentRefs: string` — also **singular**.
- `serj1chen/nova-poshta-sdk-php`'s instance `delete()` method wraps `$this->Ref` into a one-element
  `array($this->Ref)` client-side — it does not expose a way to submit more than one Ref in a single
  call either.

No cross-checked source demonstrates a genuine multi-Ref `delete` call. The wire field's plural name
(`DocumentRefs`) is suggestive but not, on its own, confirmation that Nova Poshta's endpoint accepts
more than one.

Presented to the user during this pass (core finding). **Decision: keep ADR-0002's batch-capable,
per-Ref-reconciled shape as already designed.** Resolved as **Save-as-OQ, owner `design`** (ADR-0002)
— `spec.md`'s existing §8 OQ-5 ("confirm whether delete's per-Ref outcome is genuinely
distinguishable... mixed batch result risk is purely theoretical") is adjacent but narrower: OQ-5
assumes batch calls happen and asks whether *mixed* results are real; this finding questions whether
genuine multi-Ref *batch itself* is real. Recommend widening OQ-5's wording (or adding a sibling
question) to cover this. Not blocking this contract.

**Combined pause assessment:** 2 core findings raised, both resolved via Save-as-OQ with the user's
explicit direction to keep the contract on the already-designed shape — under the ≥3-flags-or-core-
failure auto-pause threshold in effect (the user was asked directly rather than the run silently
proceeding).

## Drift checklist (bidirectional)

**Forward — contract derived correctly:**

- ☑ Method↔spec: all 8 `spec.md` §1 methods have a `public-api.md` §3 entry; none added, none dropped.
- ☑ Error-condition↔sequence: every `sad.md` §6 `alt`/`else` branch across all 4 flows maps to a row
  in `public-api.md` §6.
- ☑ Type-shape↔decision: the intersected `ServiceType`×`CargoType` payload (ADR-0001), the per-Ref
  delete outcome array (ADR-0002), and the construct-then-verify print link (ADR-0003) are all present
  exactly as decided in `sad.md` §4 — no collapsing, no silent reshaping.
- **Flags raised (see "Drift found" above):** cardinality gap (finding 1), batch-capability gap
  (finding 2) — both resolved via Save-as-OQ with the user's explicit sign-off to proceed on the
  designed shape.

**Back-feed — coverage cross-check:**

- ☑ Every `spec.md` §5 AC (AC-01..AC-19) maps to ≥1 contract clause: AC-01 → §3.1; AC-02 → §7; AC-03 →
  §3.5; AC-04 → §3.6; AC-05 → §3.1/§3.2/§6; AC-06 → §3.2; AC-07/AC-08 → §3.3/§6; AC-09/AC-10 → §3.4;
  AC-11/AC-12 → §3.7; AC-13 → §7; AC-14/AC-15/AC-16 → §6; AC-17/AC-18 → §7; AC-19 → §7.
- ☑ Every contract method maps to a §4 user story (see the §3 table's "User story" column) and ≥1 AC.
- ☑ Every `sad.md` §6 `alt`-branch (4 flows) has a response row in §6 — no sequence gap found; all 4
  flows are fully covered per `sad.md`'s own §6 coverage-check table.

**Result:** 3/4 forward checks clean, 1 flagged-and-resolved (2 findings bundled under one flag line);
4/4 back-feed checks ✓. No sequence gap, no AC left uncovered, no method left uncovered.

## Open items carried forward (not resolved by this contract, by design)

- `spec.md` §8 OQ-1 (re-verify the 8-method surface + full field shape against Nova Poshta's live
  docs) — this report's Drift finding 1 recommends tightening its wording to name the
  ServiceType/CargoType cardinality gap explicitly. Also **partially resolved** by this pass: the
  print-link credential-embedding and single-combined-link assumptions OQ-1 tracks are now confirmed
  at `high` confidence (§3.7 / field-origins table) — recommend `specify` update OQ-1's status to
  reflect that partial resolution rather than leaving it fully open.
- `spec.md` §8 OQ-2 (pagination metadata / warnings) — intentionally out of scope for this contract
  (§8 "Out of scope").
- `spec.md` §8 OQ-3 (discriminant mechanism) — resolved by `sad.md`/ADR-0001, reflected in this
  contract's §2/§3.1; listed here only because `spec.md` itself still shows it open.
- `spec.md` §8 OQ-4 (print-link warning strength) — a documentation-only decision (ADR-0003), not a
  contract-shape question; unaffected by this pass.
- `spec.md` §8 OQ-5 (delete mixed-result distinguishability) — this report's Drift finding 2
  recommends widening it (or adding a sibling OQ) to cover whether genuine multi-Ref batch delete is
  real at all, not just whether a mixed result within one is real.
- `BackwardDeliveryData`'s own sub-field set — modeled at `medium` confidence (§2); worth a live-API
  check alongside OQ-1.
- `CargoType`-specific field variance — no source models it; resolved by ADR-0004, which narrowed
  `CargoType` to a plain discriminant field (no per-cargo-type fields invented). Still worth
  re-confirming alongside OQ-1/finding 1 once Nova Poshta's official docs are reachable.

## Lint

No OpenAPI document exists for this feature (library-sdk surface) — `spectral lint` does not apply.
The equivalent check is the published-build type-surface CI step named in `public-api.md` §7 (AC-19),
already an existing project convention (`common`/`address`/`counterparty` do the same) — no new lint
tooling proposed here.
