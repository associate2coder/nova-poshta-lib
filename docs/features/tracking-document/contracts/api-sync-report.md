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
21-value status-code list, both already confirmed identical across sources in `spec.md`, and
neither declares the full response field set this pass needed to re-verify.)

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
| `TrackingStatus` fields present **only** in the TypeScript source (`BackwardDeliverySubTypesActions`, `BackwardDeliverySubTypesServices`, `DateReturnCargo`, `PossibilityTermExtensio`) | `maddsua/NovaPoshtaREST`'s `i_getStatusDocuments_result` (re-fetched) — not contradicted by the Go source, simply absent from it | medium (single-sourced) | 4 |
| 21-value `StatusCode` set (documentation reference, `TRACKING_STATUS_CODES`) | `platx/go-nova-poshta`'s `enum.go` `String()` switch (re-fetched) — independently corroborated by `sirkostya009/go-novapost`'s doc-comment, both already quoted in `spec.md` §1 | high (two-source agreement) | 21 values |
| Error contract (`NovaPoshtaApiError`, conditions table) | `sad.md` §6 Flow 1–2 `alt` branches, `spec.md` AC-04, AC-08, AC-09, AC-10 | high | — |

No field in the contract lacks a traceable origin above; the 15 single-sourced fields (11 Go-only +
4 TS-only) are modeled at `medium` confidence, not invented — each one is a field a re-fetched SDK
author actually declared, just not corroborated by the second source.

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

- `spec.md` §8 OQ (API key requirement) — does `getStatusDocuments` actually require a valid API
  key? One source states no; unconfirmed by the others. Unaffected by this contract — the library
  sends the key like every other module either way (§6's error table, AC-09).
- `spec.md` §8 OQ (phone-match field masking) — does a non-matching phone number change which
  response fields Nova Poshta returns? Every `TrackingStatus` field is already required-typed per
  this pass's field-origins table, not optional — worth a live-API check before documenting the
  `phone` parameter's effect for consuming developers, per `spec.md`'s own note.
- `spec.md` §8 OQ (three independent status vocabularies) — out of scope for this contract; a
  cross-module reconciliation question, not a `tracking-document`-only one.
- `spec.md` §8 OQ (live/official docs re-verification) — this pass strengthens the SDK cross-check
  (2 sources re-fetched, field-for-field) but the underlying caveat (still third-party sources, not
  Nova Poshta's own official documentation) is unchanged; carried forward.
- `spec.md` §6.1 security review — still Required before `sdd:implement tracking-document`, owner
  Tech Lead; unaffected by this contract pass.
- The 15 single-sourced fields (`medium` confidence, field-origins table above) — worth
  re-confirming against a third source or Nova Poshta's own docs once reachable, same as every
  other open sourcing caveat this repo carries.

## Lint

No OpenAPI document exists for this feature (library-sdk surface) — `spectral lint` does not apply.
The equivalent check is the published-build type-surface CI step `common`/`address`/`counterparty`/
`internet-document` already use (asserting every exported method is present in both the ESM `.d.ts`
and CJS `.d.cts` build output) — no new lint tooling proposed here.
