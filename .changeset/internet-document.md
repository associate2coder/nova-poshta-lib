---
"nova-poshta-lib": minor
---

Add the `internet-document` domain module — typed waybill creation, full-replace update,
single/batch delete with per-Ref outcomes, list/lookup, the two pre-creation calculators
(`getDocumentPrice`, `getDocumentDeliveryDate`), and the two print-link methods (`printDocument`,
`printMarkings`), all via `createInternetDocumentModule`.

**Why:** a consuming developer who has already resolved a sender Ref, a recipient Ref, and a
location Ref through this library's `counterparty`/`address` modules previously had to hand-roll
the actual shipment-creation call, its pre-creation price/delivery-date checks, and its print step,
with none of this library's typed shapes or shared error contract. See
[spec](../docs/features/internet-document/spec.md) and
[ADR-0002](../docs/features/internet-document/adr/0002-per-ref-outcome-array-for-batch-delete.md) /
[ADR-0003](../docs/features/internet-document/adr/0003-construct-then-verify-print-links.md) /
[ADR-0004](../docs/features/internet-document/adr/0004-cargotype-is-a-plain-discriminant-field-not-a-structural-variant-axis.md).

**How to use:**

```ts
import { createClient, createInternetDocumentModule } from "nova-poshta-lib";

const client = createClient({ apiKey: "..." });
const internetDocument = createInternetDocumentModule(client);

const waybill = await internetDocument.save({
  ServiceType: "WarehouseWarehouse",
  CargoType: "Parcel",
  SenderAddress: senderWarehouseRef,
  RecipientAddress: recipientWarehouseRef,
  // ...the rest of the delivery-method-specific payload
});

const printLink = await internetDocument.printDocument({ Documents: [waybill!.Ref] });
```

The `save`/`update` payload type is discriminated by `ServiceType` at compile time, so a payload
mixing location fields from a different delivery method fails to compile rather than surfacing as a
runtime decline. `delete` always returns one outcome entry per submitted Ref — including Nova
Poshta's own rejection reason for a Ref that wasn't removed — never a single collapsed
success/failure boolean. `printDocument`/`printMarkings` return a plain URL string, verified live
before returning, never routed through the shared JSON-envelope path; that URL carries the same
authentication power as the caller's own API key and should be treated with the same care (no
redaction or scoping is performed by this library — see the module's JSDoc).

**Operational notes:** no migration, no new config/flags. Pure additive surface —
`createInternetDocumentModule`, its 8 methods, and their request/response types are newly exported
from the package root.
