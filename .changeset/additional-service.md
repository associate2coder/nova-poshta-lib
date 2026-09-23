---
"nova-poshta-lib": minor
---

Add the `additional-service` domain module — typed access to Nova Poshta's `AdditionalServiceGeneral`
model, covering the full post-creation shipment lifecycle: return (`checkReturnPossible`,
`checkReturnEditPossible`, `createReturn`, `calculateReturn`, `updateReturn`, `getReturnOrdersList`,
`getReturnReasons`, `getReturnReasonsSubtypes`), redirect (`checkRedirectPossible`,
`checkRedirectEditPossible`, `createRedirect`, `calculateRedirect`, `updateRedirect`,
`getRedirectionOrdersList`), waybill-edit (`checkWaybillEditPossible`, `createWaybillEdit`,
`getChangeEWOrdersList`), and the shared `deleteAdditionalServiceOrder` — plus a
`createReturnIfPossible` convenience method that checks eligibility and creates a plain return to
the sender's own address in one call, all via `createAdditionalServiceModule`.

**Why:** a consuming developer who has already created a shipment through `internet-document` had no
typed way to handle what happens *after* creation — a customer wants a parcel sent back, a shipment
needs redirecting mid-transit, or a waybill's contact/payment details need correcting once Nova
Poshta has already accepted it — without hand-rolling the raw `AdditionalServiceGeneral` calls. This
is the roadmap's final domain module (step 7 of 7). See
[spec](../docs/features/additional-service/spec.md),
[ADR-0001](../docs/features/additional-service/adr/0001-expose-the-envelopes-info-field-via-requestenvelope.md),
and
[ADR-0002](../docs/features/additional-service/adr/0002-promote-firstorthrow-into-the-core-client-as-requestfirst.md).

**How to use:**

```ts
import { createClient, createAdditionalServiceModule } from "nova-poshta-lib";

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
const additionalService = createAdditionalServiceModule(client);

// createReturnIfPossible checks eligibility then creates a plain return to the sender's own
// address in one call — the convenience path for the most common return case.
const createdReturn = await additionalService.createReturnIfPossible({
  IntDocNumber: waybill!.IntDocNumber,
  PaymentMethod: "Cash",
  Reason: "<return reason ref, from additionalService.getReturnReasons()>",
});

console.log(createdReturn.Number, createdReturn.Ref);
```

Every method throws this library's single `NovaPoshtaApiError` on a declined, malformed, or
network-failed response — no silent swallowing, matching every sibling module's error contract.

**Operational notes:** no migration, no new config/flags. Newly exported from the package root:
`createAdditionalServiceModule`, its 19 methods (18 raw + the `createReturnIfPossible` convenience),
and their request/response types. Also adds `NovaPoshtaClient.requestFirst<T>()` to the core client
(ADR-0002) and exposes the response envelope's `info` field via `requestEnvelope()` (ADR-0001) —
both additive, non-breaking changes to `src/client.ts` that every module inherits.
