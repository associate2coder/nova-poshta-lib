# Changelog — tracking-document

## tracking-document — typed shipment tracking by waybill number

**What:** Consuming developers now get a fully typed `tracking-document` module: `getStatusDocuments`
(the `TrackingDocument` model's one raw Nova Poshta method — batch tracking by an array of
`{DocumentNumber, Phone}` filters) and `getDocumentStatus` (a single-waybill convenience wrapper
that makes exactly one call, then resolves its result by the returned record's own `Number` field
against the requested waybill — exact string comparison, never by array position). Exported from
the package root alongside `common`, `address`, `counterparty`, and `internet-document`.

**Why:** A consuming developer who has already created a shipment through `internet-document` — or
who only ever holds a bare waybill number from Nova Poshta's own portal or a third party — had no
typed way to check where it actually is. Deliberately kept independent of `internet-document`:
tracking has to work for any waybill number, not only ones this library itself created. This closes
roadmap step 5. See [spec.md](spec.md) §1/§2. Key decision:
[ADR-0001](adr/0001-name-the-response-type-trackingstatus-distinct-from-commons-documentstatus.md)
(the response type is named `TrackingStatus`, matching CONTEXT.md's glossary term verbatim and kept
visibly distinct from `common`'s unrelated `DocumentStatus` reference-list export — nothing
confirms the two status vocabularies correspond one-to-one).

**How to use:**

```ts
import { createClient, createTrackingDocumentModule } from "nova-poshta-lib";

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
const trackingDocument = createTrackingDocumentModule(client);

// tracking-document works for any waybill number — one this library created, one imported from
// Nova Poshta's own portal, or one a third party shipped — with no dependency on internet-document.
const status = await trackingDocument.getDocumentStatus("20400048799000");

// A "not found" or "removed" waybill (StatusCode 2 or 3) resolves as a normal status record, not
// an error (AC-06) — check StatusCode yourself rather than wrapping this call in try/catch to
// detect it. getDocumentStatus resolves undefined only when zero returned records match the
// requested waybill number, which is distinct from AC-06's "not found" status.
if (status) {
  console.log(status.Status, status.StatusCode);
}
```

**Operational notes:**
- Migration: none — no schema change (`tracking-document` holds no local entities).
- Feature flag / config: none. Pure additive surface.
- Rollback: revert the merge commit; no persisted state to unwind.
- **Security note (§6.1):** this is the first module in the library that returns recipient/sender
  PII (`RecipientFullName`, `RecipientAddress`, `PhoneRecipient`, `PhoneSender`,
  `WarehouseRecipient`/`WarehouseSender`) from a call with **no** per-counterparty ownership
  scoping at all — any caller with a valid key can track any waybill number by design (AC-09),
  matching Nova Poshta's own public tracking page. Security review completed 2026-09-22 (Tech Lead,
  during `sdd:review`), no findings requiring a code change — see
  [`_review/review-2026-09-22.md`](_review/review-2026-09-22.md).
- Every one of the 118 documented `TrackingStatus` response fields is typed exhaustively (no
  `any`); `StatusCode` stays a plain `number`, not a closed enum, so an unrecognized status code is
  preserved and returned exactly as received (AC-07).
- 11 of those 118 fields remain single-sourced (medium confidence — declared by only one of three
  cross-checked third-party SDKs); see [`contracts/api-sync-report.md`](contracts/api-sync-report.md)
  for the full field-origins table.
- Known open question carried forward: whether a non-matching phone number changes which response
  fields Nova Poshta returns (`spec.md` §8) — unverified against a live API key; doesn't affect
  library behavior either way, since every field is typed required and would show up empty/zero
  rather than absent if masked.

**Acceptance criteria delivered:** AC-01 … AC-11 — see [spec.md](spec.md) §5 and the review record
([review-2026-09-22.md](_review/review-2026-09-22.md), PASS — 7 findings fixed in the review pass:
3 spec/contract sourcing-accuracy gaps, 3 test-adequacy gaps, 1 release-artifact gap).
