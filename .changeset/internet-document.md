---
"nova-poshta-lib": minor
---

Add the `internet-document` domain module — typed waybill creation, full-replace update, single-Ref
delete (with a client-side `deleteBatch` convenience) with per-Ref outcomes, list/lookup, the two
pre-creation calculators (`getDocumentPrice`, `getDocumentDeliveryDate`), and the two print-link
methods (`printDocument`, `printMarkings`), all via `createInternetDocumentModule`.

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

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
const internetDocument = createInternetDocumentModule(client);

const waybill = await internetDocument.save({
  ServiceType: "WarehouseWarehouse",
  CargoType: "Parcel",
  SenderAddress: senderWarehouseRef,
  RecipientAddress: recipientWarehouseRef,
  // ...the rest of the delivery-method-specific payload
});

const printLink = await internetDocument.printDocument({ Documents: [waybill!.Ref] });

await internetDocument.delete({ Ref: waybill!.Ref });
await internetDocument.deleteBatch({ Documents: ["ref-1", "ref-2"] });
```

The `save`/`update` payload type is discriminated by `ServiceType` at compile time, so a payload
mixing location fields from a different delivery method fails to compile rather than surfacing as a
runtime decline. `delete` accepts exactly one Ref per call and resolves one outcome — including
Nova Poshta's own rejection reason when it isn't confirmed removed; `deleteBatch` loops over
several Refs client-side (not a single Nova Poshta batch call — see the module's JSDoc).
`printDocument`/`printMarkings` return a plain URL string, verified live before returning, never
routed through the shared JSON-envelope path; that URL carries the same authentication power as
the caller's own API key and should be treated with the same care (no redaction or scoping is
performed by this library). **The exact print-link URL-construction mechanism is provisional, not
confirmed — see the module's JSDoc before relying on it in production.**

`ServiceType` carries 6 values and `CargoType` carries 8 (cross-checked against 2 independent
sources for `ServiceType`'s Postomat pair; `save`/`update` still only accept the original 4
`ServiceType` values as structural variants pending a second source for the Postomat leg's shape).

**Operational notes:** no migration, no new config/flags. Newly exported from the package root:
`createInternetDocumentModule`, its 9 methods (8 Nova Poshta methods + the `deleteBatch`
convenience), and their request/response types.
