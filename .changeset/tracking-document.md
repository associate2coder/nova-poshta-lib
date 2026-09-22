---
"nova-poshta-lib": minor
---

Add the `tracking-document` domain module — typed access to Nova Poshta's `TrackingDocument`
model: the raw `getStatusDocuments` batch method plus a `getDocumentStatus` single-waybill
convenience wrapper that resolves its result by matching the returned record's own waybill-number
field, never by array position, via `createTrackingDocumentModule`.

**Why:** a consuming developer who has already created a shipment through `internet-document` — or
who only ever holds a bare waybill number, from Nova Poshta's own portal or a third party — had no
typed way to check where it actually is, the last hand-rolled call `common`/`address`/`counterparty`/
`internet-document` hadn't already closed. Deliberately independent of `internet-document`: tracking
works for any waybill number, not only ones this library itself created. See
[spec](../docs/features/tracking-document/spec.md) and
[ADR-0001](../docs/features/tracking-document/adr/0001-name-the-response-type-trackingstatus-distinct-from-commons-documentstatus.md).

**How to use:**

```ts
import { createClient, createTrackingDocumentModule } from "nova-poshta-lib";

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
const trackingDocument = createTrackingDocumentModule(client);

const status = await trackingDocument.getDocumentStatus("20400048799000");

// A "not found" or "removed" waybill (StatusCode 2 or 3) resolves as a normal status record,
// not an error — check StatusCode yourself rather than wrapping this in try/catch.
if (status) {
  console.log(status.Status, status.StatusCode);
}
```

Every one of the 118 documented response fields is typed exhaustively (no `any`), and `StatusCode`
stays a plain `number` rather than a closed enum — a status code this library's authors haven't
seen is preserved and returned exactly as received, never dropped or coerced.
