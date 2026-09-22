---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-22"
feature_size: "S"
---

# API sync report — tracking-document

**Contract form:** `contracts/public-api.md` (library-sdk, per `sad.md` frontmatter
`target_surfaces: ["library-sdk"]` — no OpenAPI document applies to this feature).

**Gate note:** `data-model.md` is absent. Evaluated the N/A condition myself per this skill's
three-way gate: `sad.md` §2 states the module is stateless (no local entity), and no
`docs/features/tracking-document/migrations/` directory is staged — legal fast-lane skip.
Proceeded deriving types/constraints from the existing Nova Poshta TrackingDocument API shape
rather than a local schema, the same path `address`/`counterparty`/`internet-document` took.

**Inputs found:**
- `sad.md` — found, §4 (decisions 1–7, ADR-0001 pointer), §5 (building blocks), §6 (2 sequence
  flows + coverage table) read in full.
- `spec.md` — found, §1 (in-scope 1-method + 1-convenience list, 2 decision overrides), §5
  (AC-01..AC-11), §8 (6 open questions) read in full.
- `data-model.md` — absent (see gate note above).
- `adr/0001-*.md` (TrackingStatus naming, distinct from common.DocumentStatus) — found, read in full.

**Re-fetched during this pass** (beyond what `spec.md`'s own citation lists as sources — per
CLAUDE.md's API-contract sourcing policy): the actual current source of the two SDKs `spec.md` §1
quotes directly —
`platx/go-nova-poshta/api/trackingdocument/{request,response,enum}.go` and
`maddsua/NovaPoshtaREST/lib/models/TrackingDocument.ts`. (`daaner/NovaPoshta`'s PHP source and
`sirkostya009/go-novapost`'s status-code doc-comment, both already quoted verbatim in `spec.md` §1,
were not independently re-fetched again here — their relevant content is the request shape and the
21-value status-code list, both already confirmed identical across sources in `spec.md`.)

**Re-fetched again during `sdd:review` (2026-09-22):** that last assumption about
`sirkostya009/go-novapost` was wrong — its `tracking_document.go` (re-fetched via `gh api
repos/sirkostya009/go-novapost/contents/tracking_document.go`) declares a full `StatusDocument`
struct (107 fields), not just the status-code doc-comment. Used as a genuine third independent
source to corroborate the single-sourced fields below — see "Third-source corroboration"
underneath the field-origins table. The same review pass also checked the user-supplied
`api-portal.novapost.com` documentation portal: it is a real, reachable, unauthenticated official
Nova Poshta source, but documents a different, newer REST/JWT-auth tracking API
(`/shipments/tracking`, `numbers[]`) — no mention anywhere in its doc index of `modelName`,
`calledMethod`, `TrackingDocument`, or `getStatusDocuments`, the legacy surface this module
targets. Not usable as an official source for this contract; `developers.novaposhta.ua` (the
actual home of the legacy docs) remains 403.

## Field-origins table

Grouped by origin rather than one row per field (118 fields would make a 118-row table unreadable).
Confidence: **high** = confirmed by re-fetching a cross-checked source's actual current source
during this pass; **medium** = confirmed by exactly one of the two re-fetched sources, uncontradicted
by the other (the other source simply doesn't declare that field).

| Field group | Origin | Confidence | Count |
|---|---|---|---|
| `getStatusDocuments`, `getDocumentStatus` (2 methods) | `spec.md` §1 in-scope method + convenience list | high | 2 |
| `TrackingDocumentFilter` (`DocumentNumber`, `Phone`) | `platx/go-nova-poshta`'s `DocumentFilter` (`request.go`, re-fetched) — exact match against `maddsua/NovaPoshtaREST`'s inline parameter shape | high | 2 |
| `TrackingStatus` fields present in **both** re-fetched sources | `platx/go-nova-poshta`'s `DocumentStatus` struct (`response.go`) ∩ `maddsua/NovaPoshtaREST`'s `i_getStatusDocuments_result` (`TrackingDocument.ts`), both re-fetched | high | 103 |
| `TrackingStatus` fields present **only** in the Go source (`AdjustedDate`, `CounterpartySenderDescription`, `InternetDocumentDescription`, `LightReturnNumber`, `LoyaltyCardSender`, `PossibilityLightReturn`, `PossibilityTrusteeRecipient`, `RedeliveryPaymentCardDescription`, `RedeliveryPaymentCardRef`, `RedeliveryServiceCost`, `TrusteeRecipientPhone`) | `platx/go-nova-poshta`'s `DocumentStatus` struct (re-fetched) — not contradicted by the TS source, simply absent from it | medium (single-sourced) | 11 |
| `TrackingStatus` fields present in the TypeScript source **and** independently corroborated by `sirkostya009/go-novapost` (`BackwardDeliverySubTypesActions`, `BackwardDeliverySubTypesServices`, `DateReturnCargo`, `PossibilityTermExtensio`) | `maddsua/NovaPoshtaREST`'s `i_getStatusDocuments_result` ∩ `sirkostya009/go-novapost`'s `StatusDocument` struct (`tracking_document.go`) — two independent sources, re-fetched 2026-09-22 during `sdd:review` | high (two-source agreement, raised from medium during review) | 4 |
| `TrackingStatus` fields present **only** in the Go source `platx/go-nova-poshta`, still unconfirmed by either other source after re-fetching a third (`AdjustedDate`, `CounterpartySenderDescription`, `InternetDocumentDescription`, `LightReturnNumber`, `LoyaltyCardSender`, `PossibilityLightReturn`, `PossibilityTrusteeRecipient`, `RedeliveryPaymentCardDescription`, `RedeliveryPaymentCardRef`, `RedeliveryServiceCost`, `TrusteeRecipientPhone`) | `platx/go-nova-poshta`'s `DocumentStatus` struct (re-fetched) — not contradicted by either the TypeScript or the `sirkostya009/go-novapost` source, simply absent from both | medium (single-sourced) | 11 |
| 21-value `StatusCode` set (documentation reference, `TRACKING_STATUS_CODES`) | `platx/go-nova-poshta`'s `enum.go` `String()` switch (re-fetched) — independently corroborated by `sirkostya009/go-novapost`'s doc-comment, both already quoted in `spec.md` §1, and again by `sirkostya009`'s full struct re-fetch (2026-09-22) | high (two-source agreement) | 21 values |
| Error contract (`NovaPoshtaApiError`, conditions table) | `sad.md` §6 Flow 1–2 `alt` branches, `spec.md` AC-04, AC-08, AC-09, AC-10 | high | — |

No field in the contract lacks a traceable origin above. Of the original 15 single-sourced fields,
4 (the former TS-only group) were raised to `high` confidence on 2026-09-22 when a third
independent source corroborated them (see "Third-source corroboration" below); the remaining 11
(the Go-only group) stay at `medium` confidence — each is a field a re-fetched SDK author actually
declared, just still not corroborated by either other source.

## Third-source corroboration (`sdd:review`, 2026-09-22)

Re-fetched `sirkostya009/go-novapost`'s `tracking_document.go` in full (previously only its
status-code doc-comment had been read, per `spec.md` §1) — it declares a complete `StatusDocument`
struct with 107 fields, an independent third source for the response shape:

- **The 4 TS-only fields are all present** in `sirkostya009`'s struct too
  (`BackwardDeliverySubTypesActions`, `BackwardDeliverySubTypesServices`, `DateReturnCargo`,
  `PossibilityTermExtensio`) — raised from `medium` to `high` confidence above.
- **None of the 11 Go-only fields appear** in `sirkostya009`'s struct either — stays `medium`
  confidence; a third source omitting a field isn't a contradiction (SDKs commonly cover partial
  surfaces), but it also isn't the second confirmation the sourcing policy prefers.
- **No field in `sirkostya009`'s struct is absent from the current 118-field union** — no new field
  to add. (`AfterPaymentOnGoodsCost`, the Go struct's field name, carries a `json:"AfterpaymentOnGoodsCost"`
  tag matching the union's existing `AfterpaymentOnGoodsCost` field exactly — not a new field, a
  naming-convention match.)
- **The 5 `boolean | string`-disputed fields got a third data point, still genuinely split**:
  `sirkostya009` types `CargoReturnRefusal`/`Redelivery`/`SecurePayment` as bool-like (agreeing with
  `platx`'s Go source) and `AviaDelivery`/`PostomatV3CellReservationNumber` as plain `string`
  (agreeing with `maddsua`'s TypeScript source) — three sources, still a real split by field, not a
  near-unanimous case that should be narrowed. The existing `boolean | string` widening stands.
- **Status-code list:** `sirkostya009`'s doc-comment (already quoted in `spec.md` §1) matches the
  same 21 numbers and Ukrainian text as `platx`'s `enum.go` — no change.

## Drift found — and how it was resolved

### Finding 1: `spec.md` §1's "91 fields" claim does not match either re-fetched source — **RESOLVED, 2026-09-22**

`spec.md` §1 states `DocumentStatus` has "91 documented fields," trimmed to a 9-field PII-relevant
subset for readability, with a `// ... 82 further fields` comment (9 + 82 = 91). Re-fetching both
cross-checked sources' actual current source during this pass:

- `platx/go-nova-poshta`'s `DocumentStatus` struct (`api/trackingdocument/response.go`) declares
  **114** fields, not 91.
- `maddsua/NovaPoshtaREST`'s `i_getStatusDocuments_result` interface
  (`lib/models/TrackingDocument.ts`) declares **105** fields, not 91 either.
- The two sources don't even declare the *same* set: 103 field names are shared, but Go has 11
  fields TS lacks (`AdjustedDate`, `CounterpartySenderDescription`, `InternetDocumentDescription`,
  `LightReturnNumber`, `LoyaltyCardSender`, `PossibilityLightReturn`, `PossibilityTrusteeRecipient`,
  `RedeliveryPaymentCardDescription`, `RedeliveryPaymentCardRef`, `RedeliveryServiceCost`,
  `TrusteeRecipientPhone`), and TS has 4 fields Go lacks (`BackwardDeliverySubTypesActions`,
  `BackwardDeliverySubTypesServices`, `DateReturnCargo`, `PossibilityTermExtensio`) — a 118-field
  union once deduplicated by name.

Presented to the user as a core finding (per this skill's step 7 pause threshold — a confirmed
discrepancy against CLAUDE.md's sourcing policy, which blocks ship until resolved).

**Decision: type the full 118-field union** on `TrackingStatus` (`contracts/public-api.md` §2), not
the 103-field intersection — the union keeps AC-07's "never dropped" forward-compatible guarantee
intact for the 15 single-sourced fields, at the cost of typing a handful of fields (`medium`
confidence) only one SDK author happened to declare. `spec.md` §1 corrected in place to record the
actual re-fetched counts rather than leave the inaccurate "91" figure standing. See
`contracts/public-api.md` §2/§9.

A secondary, smaller disagreement surfaced during the same re-fetch: 5 fields (`AviaDelivery`,
`CargoReturnRefusal`, `PostomatV3CellReservationNumber`, `Redelivery`, `SecurePayment`) are typed
`bool`/`BoolInt` in the Go source but plain `string` in the TypeScript source. Resolved the same
way — widened to `boolean | string` on `TrackingStatus` rather than picking one shape, consistent
with the union decision above (see `contracts/public-api.md` §2 note).

## Drift checklist (bidirectional)

**Forward — contract derived correctly:**

- ☑ Method↔spec: both `spec.md` §1 methods (1 raw + 1 convenience) have a `public-api.md` §3 entry;
  none added, none dropped.
- ☑ Error-condition↔sequence: every `sad.md` §6 `alt`/`else` branch across both flows maps to a row
  in `public-api.md` §6.
- ☑ Type-shape↔decision: the plain-`number` `StatusCode` (§4 decision 6, AC-07), the match-by-identity
  convenience method (§4 decision 3, AC-04), and the self-contained no-`internet-document`-import
  boundary (§4 decision 5, AC-11) are all present exactly as decided in `sad.md` §4 — no collapsing,
  no silent reshaping.
- **Flag raised (see "Drift found" above):** the field-count/field-shape gap between `spec.md`'s "91
  fields" claim and both re-fetched sources' actual current field sets — resolved by typing the
  118-field union and correcting `spec.md` §1 in place.

**Back-feed — coverage cross-check:**

- ☑ Every `spec.md` §5 AC (AC-01..AC-11) maps to ≥1 contract clause: AC-01 → §3.1; AC-02 → §2/§3.1;
  AC-03 → §3.1; AC-04 → §3.2/§6; AC-05 → §3.1/§6; AC-06 → §3.1/§6; AC-07 → §2/§6; AC-08/AC-09/AC-10
  → §6; AC-11 → §7.
- ☑ Every contract method maps to a §4 user story (see `public-api.md` §3's "User story" column) and
  ≥1 AC.
- ☑ Every `sad.md` §6 `alt`-branch (2 flows) has a response row in `public-api.md` §6 — no sequence
  gap found; both flows are fully covered per `sad.md`'s own §6 coverage-check table.

**Result:** 3/4 forward checks clean, 1 flagged-and-resolved; 3/3 back-feed checks ✓. No sequence
gap, no AC left uncovered, no method left uncovered.

## Open items carried forward (not resolved by this contract, by design)

- `spec.md` §8 OQ (API key requirement) — **resolved during `sdd:review`, 2026-09-22:** Tech Lead's
  call was to keep the current default and close the question. Unaffected by this contract either
  way — the library sends the key like every other module (§6's error table, AC-09).
- `spec.md` §8 OQ (phone-match field masking) — does a non-matching phone number change which
  response fields Nova Poshta returns? Still open. Every `TrackingStatus` field is required-typed
  per this pass's field-origins table, not optional — `spec.md`/`sad.md` previously claimed
  optional here and were corrected in place during `sdd:review` (2026-09-22). Still worth a
  live-API check before documenting the `phone` parameter's effect for consuming developers.
- `spec.md` §8 OQ (three independent status vocabularies) — out of scope for this contract; a
  cross-module reconciliation question, not a `tracking-document`-only one. Still open.
- `spec.md` §8 OQ (live/official docs re-verification) — **resolved during `sdd:review`,
  2026-09-22:** the legacy docs site is still 403; a newer official portal
  (`api-portal.novapost.com`, reachable, real, user-supplied) turned out to document a different,
  newer REST/JWT tracking API, not this module's legacy surface. The SDK cross-check was
  strengthened instead — a third independent source (`sirkostya009/go-novapost`) was re-fetched in
  full and corroborates the method surface, the status-code list, and 4 of the 15 previously
  single-sourced fields (see "Third-source corroboration" above).
- `spec.md` §6.1 security review — **resolved during `sdd:review`, 2026-09-22:** performed by the
  Tech Lead after implementation rather than gated before it; no findings requiring a code change.
  See `docs/features/tracking-document/_review/review-2026-09-22.md`.
- The 11 still-single-sourced fields (`medium` confidence, field-origins table above; down from 15
  after the third-source re-fetch corroborated 4 of them) — worth re-confirming against a fourth
  source or Nova Poshta's own docs once reachable, same as every other open sourcing caveat this
  repo carries.

## Lint

No OpenAPI document exists for this feature (library-sdk surface) — `spectral lint` does not apply.
The equivalent check is the published-build type-surface CI step `common`/`address`/`counterparty`/
`internet-document` already use (asserting every exported method is present in both the ESM `.d.ts`
and CJS `.d.cts` build output) — no new lint tooling proposed here.
