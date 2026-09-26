# nova-poshta-lib

## 0.1.0

### Minor Changes

- b567451: Add the `additional-service` domain module — typed access to Nova Poshta's `AdditionalServiceGeneral`
  model, covering the full post-creation shipment lifecycle: return (`checkReturnPossible`,
  `checkReturnEditPossible`, `createReturn`, `calculateReturn`, `updateReturn`, `getReturnOrdersList`,
  `getReturnReasons`, `getReturnReasonsSubtypes`), redirect (`checkRedirectPossible`,
  `checkRedirectEditPossible`, `createRedirect`, `calculateRedirect`, `updateRedirect`,
  `getRedirectionOrdersList`), waybill-edit (`checkWaybillEditPossible`, `createWaybillEdit`,
  `getChangeEWOrdersList`), and the shared `deleteAdditionalServiceOrder` — plus a
  `createReturnIfPossible` convenience method that checks eligibility and creates a plain return to
  the sender's own address in one call, all via `createAdditionalServiceModule`.

  **Why:** a consuming developer who has already created a shipment through `internet-document` had no
  typed way to handle what happens _after_ creation — a customer wants a parcel sent back, a shipment
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

- 9c170d6: Add the `common` domain module — typed access to all 15 Nova Poshta reference/lookup lists
  (payment forms, cargo types, ownership forms, pallets, time intervals, counterparty types, and
  more), each exposed as its own discoverable method via `createCommonModule`.

  **Why:** every consuming developer building requests against other parts of the Nova Poshta API
  needs valid values for these shared reference fields (e.g. `PayerType`, `OwnershipForm`); previously
  the only options were hardcoding values from Nova Poshta's raw docs or an untyped call through the
  core client. `common` is the first domain module built specifically so later modules (address,
  counterparty, internet-document) have a single authoritative source for these values instead of
  each inventing its own handling — see
  [spec](../docs/features/common/spec.md) and
  [ADR-0002](../docs/adr/0002-modular-domain-layout-dual-build.md).

  **How to use:**

  ```ts
  import { createClient, createCommonModule } from "nova-poshta-lib";

  const client = createClient({ apiKey: "..." });
  const common = createCommonModule(client);

  const paymentForms = await common.getPaymentForms();
  const cargoDescriptions = await common.getCargoDescriptionList({ FindByString: "документ" });
  ```

  Every documented field on a reference-list record is typed as optional — Nova Poshta's real-world
  responses are inconsistent at the per-record level, and this is represented honestly rather than
  promising data that isn't really there. A response that isn't a navigable list at all (not
  array-shaped), an unreachable network, or a declined request all raise the library's standard
  `NovaPoshtaApiError` — never a silent empty/partial result.

  **Operational notes:** no migration, no new config/flags. Pure additive surface — `createCommonModule`
  and its 15 methods, plus their request/response types, are newly exported from the package root.

- 9ba5823: Add the `internet-document` domain module — typed waybill creation, full-replace update, single-Ref
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

- 9c86e11: Add the `scan-sheet` domain module — typed access to Nova Poshta's `ScanSheet` model:
  `insertDocuments`, `getScanSheet`, `getScanSheetList`, `removeDocuments`, and `deleteScanSheet`,
  plus an `addToTodaysScanSheet` convenience wrapper that finds (or creates) today's still-unprinted
  scan sheet and adds waybills to it in one call, all via `createScanSheetModule`.

  **Why:** a consuming developer who has already created a shipment through `internet-document`
  previously had no typed way to batch it onto a scan sheet for warehouse handover, or to look up,
  list, or clean up existing scan sheets, without hand-rolling the raw `ScanSheet` calls. See
  [spec](../docs/features/scan-sheet/spec.md) and
  [ADR-0001](../docs/features/scan-sheet/adr/0001-return-empty-batch-result-arrays-instead-of-throwing.md).

  **How to use:**

  ```ts
  import { createClient, createScanSheetModule } from "nova-poshta-lib";

  const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
  const scanSheet = createScanSheetModule(client);

  // addToTodaysScanSheet takes each waybill's own Ref, never its printed tracking/IntDocNumber.
  const inserted = await scanSheet.addToTodaysScanSheet(["<waybill ref 1>", "<waybill ref 2>"]);

  // ADR-0001: an empty-but-successful batch-result array is returned as-is, never thrown — check
  // its length yourself rather than wrapping this call in try/catch to detect it.
  if (inserted.length === 0) {
    console.log("Nova Poshta reported success but returned no items");
  }

  // A per-item Error/Errors value inside an otherwise-successful response never throws either —
  // inspect each item's Error/Errors field yourself to see which ones actually failed.
  for (const item of inserted) {
    if (item.Errors.length > 0) {
      console.warn(item.Ref, item.Errors);
    }
  }
  ```

  `insertDocuments`, `removeDocuments`, and `deleteScanSheet` are structurally batch
  reads-with-side-effects, the same shape as `getScanSheet`/`getScanSheetList`: an empty-but-successful
  result array is returned as-is (ADR-0001), and a per-item `Error`/`Errors` value never throws on its
  own — only a top-level `success: false` or a transport failure does (matching this library's one
  error-contract rule everywhere else).

  **Operational notes:** no migration, no new config/flags. Newly exported from the package root:
  `createScanSheetModule`, its 6 methods (5 Nova Poshta methods + the `addToTodaysScanSheet`
  convenience), and their request/response types.

- 825b0b7: Add the `tracking-document` domain module — typed access to Nova Poshta's `TrackingDocument`
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

### Patch Changes

- 713840d: Fix two `scan-sheet` defects found by testing against the live Nova Poshta API:

  - **`deleteScanSheet` threw on every call, success or failure.** Its real response is a single
    object (`{ ScanSheetRefs: { Success: [...], Errors: [...] } }`), not the navigable list every
    other method returns — the client's `Array.isArray(data)` check rejected it unconditionally. The
    core client gains `requestObject<T>()` for this rare shape, and `deleteScanSheet` now parses the
    real response into the same flat `DeleteScanSheetItem[]` it always returned.
  - **`addToTodaysScanSheet` sent the wrong wire date format.** `insertDocuments`'s `Date` field
    needs `DD.MM.YYYY`; the module was sending `YYYY-MM-DD`, which Nova Poshta rejects outright
    ("Невірний формат дати" / invalid date format). This closes scan-sheet's own previously-open
    question about the field's real wire format.

  No public API shape changed other than the new `NovaPoshtaClient.requestObject<T>()` method
  (additive) — `deleteScanSheet`'s and `addToTodaysScanSheet`'s existing typed signatures are
  unchanged, only their previously-broken/incorrect wire behavior.
