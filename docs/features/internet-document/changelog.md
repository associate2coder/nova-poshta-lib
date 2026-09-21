# Changelog — internet-document

## internet-document — typed waybill creation, calculation, and printing

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
