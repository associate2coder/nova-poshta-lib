# Changelog — additional-service

## additional-service — post-creation shipment actions: returns, redirects, waybill edits

**What:** Consuming developers now get a fully typed `additional-service` module: 18 raw Nova
Poshta `AdditionalServiceGeneral` methods covering the full post-creation shipment lifecycle —
return (`checkReturnPossible`, `checkReturnEditPossible`, `createReturn`, `calculateReturn`,
`updateReturn`, `getReturnOrdersList`, `getReturnReasons`, `getReturnReasonsSubtypes`), redirect
(`checkRedirectPossible`, `checkRedirectEditPossible`, `createRedirect`, `calculateRedirect`,
`updateRedirect`, `getRedirectionOrdersList`), waybill-edit (`checkWaybillEditPossible`,
`createWaybillEdit`, `getChangeEWOrdersList`), and the shared `deleteAdditionalServiceOrder` —
plus one convenience method, `createReturnIfPossible`, that checks eligibility and creates a plain
return to the sender's own address in one call instead of a caller chaining `checkReturnPossible`
then `createReturn` themselves. Exported from the package root alongside `common`, `address`,
`counterparty`, `internet-document`, `tracking-document`, and `scan-sheet` — the 7th and final
domain module on the roadmap.

**Why:** A consuming developer who has already created a shipment through `internet-document` had
no typed way to handle what happens *after* creation — a customer wants a parcel sent back, a
shipment needs redirecting mid-transit, or a waybill's contact/payment details need correcting once
Nova Poshta has already accepted it — without hand-rolling the raw `AdditionalServiceGeneral`
calls. See [spec.md](spec.md) §1/§2. Key decisions:
[ADR-0001](adr/0001-expose-the-envelopes-info-field-via-requestenvelope.md) (expose the response
envelope's `info` field via a new `requestEnvelope()` core-client method, needed by
`checkReturnEditPossible`/`checkRedirectEditPossible`'s edit-flag payloads) and
[ADR-0002](adr/0002-promote-firstorthrow-into-the-core-client-as-requestfirst.md) (promote
`internet-document`'s local `firstOrThrow` helper into the core client as `requestFirst<T>()`,
reused by both `internet-document` and this module's 12 single-record read/write methods instead
of a duplicated copy).

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
network-failed response — no silent swallowing, matching every sibling module's error contract
(AC-21/AC-22/AC-23).

**Operational notes:**
- Migration: none — no schema change (this library holds no persisted state of its own).
- Feature flag / config: none. Pure additive surface, plus two additive, non-breaking additions to
  the shared core client (`NovaPoshtaClient.requestFirst<T>()` and `requestEnvelope()`) that every
  module inherits.
- Rollback: revert the merge commit; no persisted state to unwind.
- **API-contract sourcing:** this feature's review went through 6 rounds before every request/
  response field traced to a genuine, directly-quoted source (official `developers.novaposhta.ua`
  docs pages, captured verbatim across several rounds, with two independent third-party SDKs used
  only where the docs page didn't cover a method) — see
  [`_review/review-2026-09-23.md`](_review/review-2026-09-23.md) for the full sourcing history.
  Two fields remain honestly graded `medium`/inferred rather than `high` in
  [`contracts/api-sync-report.md`](contracts/api-sync-report.md): `getReturnReasonsSubtypes`'s
  `ReasonRef` request field, and `getRedirectionOrdersList`'s request shape (no request example was
  ever captured for either).
- A new opt-in integration suite (`test/integration/additional-service.test.ts`) covers the
  check/calculate/read/list methods against a live API key
  (`NOVA_POSHTA_TEST_API_KEY`) — deliberately excludes create/update/delete, which mutate real
  order state, matching `internet-document`'s own integration-suite scope boundary.

**Acceptance criteria delivered:** AC-01 … AC-23 — see [spec.md](spec.md) §5 and the review record
([_review/review-2026-09-23.md](_review/review-2026-09-23.md), PASS after 6 rounds). Notable fixes
along the way: a type-safety gap that let a mixed-destination-variant `createReturn` payload
compile when assembled field-by-field in a variable (AC-04) was closed with `?: never`
cross-guards; an unchecked cast that would have thrown a raw `TypeError` instead of
`NovaPoshtaApiError` when `checkReturnEditPossible`'s `info` was absent was replaced with a
defensive unwrap; two wire-value defects surfaced by the official-docs capture itself
(`ReturnAddressOption.NonCash` is a JSON boolean, not a `"0"`/`"1"` string; `OnlyGetPricing` is a
JSON boolean, not `"1"`) were corrected before shipping, not after.
