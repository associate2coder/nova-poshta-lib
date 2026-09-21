# Changelog — internet-document

## internet-document — typed waybill creation, calculation, and printing

**Corrected 2026-09-22 — see the post-ship section below.** `delete` is no longer batch-capable in
a single call; `ServiceType`/`CargoType` are wider than described just below. This section is kept
as originally shipped for history — read the correction section for current behavior.

**What:** Consuming developers now get a fully typed `internet-document` module: all 8 documented
Nova Poshta InternetDocument API methods — `save` (create), `update` (full-replace), `delete`
(single/batch, per-Ref outcomes), `getDocumentList` (filterable), the two pre-creation calculators
(`getDocumentPrice`, `getDocumentDeliveryDate`), and the two print-link methods (`printDocument`,
`printMarkings`). A `save`/`update` payload is discriminated by `ServiceType` at compile time, so a
payload mixing location fields from a different delivery method fails to compile rather than
surfacing as a runtime decline (AC-02). Exported from the package root alongside `common`,
`address`, and `counterparty`.

**Why:** A consuming developer who had already resolved a sender Ref, a recipient Ref, and a
location Ref through this library's `counterparty`/`address` modules previously had to hand-roll
the actual shipment-creation call, its pre-creation price/delivery-date checks, and its print step,
with none of this library's typed shapes or shared error contract. This closes roadmap step 4. See
[spec.md](spec.md) §1/§2. Key decisions:
[ADR-0002](adr/0002-per-ref-outcome-array-for-batch-delete.md) (`delete` always returns one outcome
entry per submitted Ref, including Nova Poshta's own rejection reason — never a collapsed
success/failure boolean),
[ADR-0003](adr/0003-construct-then-verify-print-links.md) (print links are constructed then
verified live, never routed through the shared JSON-envelope path, since that path can't parse a
non-JSON response and could otherwise silently return a blank/error page during a save-then-print
race), and
[ADR-0004](adr/0004-cargotype-is-a-plain-discriminant-field-not-a-structural-variant-axis.md)
(`CargoType` is a plain field, not a second structural variant axis — no cross-checked source
confirms Nova Poshta's wire format varies required fields by cargo type; superseded ADR-0001's
original two-axis design).

**How to use:**

```ts
import { createClient, createInternetDocumentModule } from "nova-poshta-lib";

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
const internetDocument = createInternetDocumentModule(client);

const waybill = await internetDocument.save({
  ServiceType: "WarehouseWarehouse",
  CargoType: "Parcel",
  SenderAddress: senderWarehouseRef,
  RecipientAddress: recipientWarehouseRef,
  // ...the rest of the delivery-method-specific payload
}); // SavedInternetDocument | undefined, per AC-05

if (waybill) {
  const printLink = await internetDocument.printDocument({ Documents: [waybill.Ref] });
  // printLink carries the same authentication power as the API key itself — see AC-13
}
```

**Operational notes:**
- Migration: none — no schema change (`internet-document` holds no local entities).
- Feature flag / config: none. Pure additive surface.
- Rollback: revert the merge commit; no persisted state to unwind (the library holds no state of
  its own).
- **Security note (AC-13):** `printDocument`/`printMarkings` return a plain URL string that carries
  live authentication equivalent to the caller's own API key. This library performs no redaction,
  scoping, or expiry of it — the consuming developer is responsible for treating it with the same
  care as the API key itself, not as an ordinary shareable document link.
- Known limitation carried forward from `address`/`counterparty`: the shared core client still
  doesn't expose Nova Poshta's pagination metadata or success-path warnings; `getDocumentList`
  inherits the same no-auto-paging behavior as `counterparty`'s lookups.
- **Real bug fixed during review (eighth pass, G3):** the print-link builder previously emitted a
  `/copies/<value>` URL segment for `Copies: "fourfold"` — Nova Poshta never defines such a
  segment. The real mechanism (confirmed against `serj1chen/nova-poshta-sdk-php`'s `getPrintLink()`
  implementation) repeats each Ref's `orders[]/<ref>` segment twice for `"fourfold"`, once
  (the default) for `"double"`/omitted. Fixed before merge — no released version ever shipped the
  wrong segment.

**Acceptance criteria delivered:** AC-01 … AC-19 — see [spec.md](spec.md) §5 and the review record
([review-2026-09-22-08.md](_review/review-2026-09-22-08.md), PASS, eighth pass — all prior rounds'
findings held on re-verification).

---

## internet-document — post-ship API-contract corrections (2026-09-22)

**What:** A new repo-wide policy (CLAUDE.md "API-contract sourcing policy" — every field must
trace to Nova Poshta's own docs or ≥2 agreeing independent implementations, quoting the exact
upstream struct) triggered a re-audit of this module's shipped contract, widening the cross-checked
source pool from 3 to 5. Three changes result:

1. **`delete` is now single-Ref per call (breaking).** `delete(payload: {Ref: string})` resolves
   one `DeletedInternetDocumentOutcome`, not an array. A new `deleteBatch(payload: {Documents:
   string[]})` provides the same batch convenience as a client-side sequential loop, resolving one
   outcome per Ref. **Why:** 3 of 4 re-fetched cross-checked sources type Nova Poshta's wire
   `DocumentRefs` field as accepting exactly one value; no source demonstrates a genuine multi-Ref
   call succeeding. See [ADR-0005](adr/0005-delete-is-single-ref-per-call-with-client-side-batch.md).
2. **`ServiceType`/`CargoType` widened (additive).** `ServiceType` now carries 6 values (added
   `WarehousePostomat`, `DoorsPostomat` — confirmed by 2 independent sources); `CargoType` now
   carries 8 (added `TiresWheels`, `Money`, `SignedDocuments`, `Trays`). `save`/`update`'s
   discriminated payload still only accepts the original 4 `ServiceType` values as structural
   variants — Postomat's own required-field shape has only 1 confirming source, not 2, so it isn't
   modeled yet.
3. **Print-link mechanism downgraded to provisional (no code change, doc-only).** A fourth
   cross-checked source builds the print URL differently than this module does, and proves the
   print methods are also reachable as plain enveloped calls — a path never attempted here.
   AC-11/AC-12/AC-13 are no longer confirmed happy-path; see
   [ADR-0003](adr/0003-construct-then-verify-print-links.md)'s amendment log.

**Migration for `delete` callers:**

```ts
// Before
await internetDocument.delete({ Documents: ["ref-1", "ref-2"] });

// After
await internetDocument.deleteBatch({ Documents: ["ref-1", "ref-2"] });
// or, for a single Ref:
await internetDocument.delete({ Ref: "ref-1" });
```

**Operational notes:**
- No migration, no new config/flags.
- No released npm version ever shipped the old `delete` signature to end users (package is
  pre-1.0.0 / unreleased at the time of this correction).
- The print-link provisional caveat is documentation-only — no behavior change; existing callers
  see no difference, only a stronger warning before relying on it in production.
