---
"nova-poshta-lib": minor
---

Add the `scan-sheet` domain module — typed access to Nova Poshta's `ScanSheet` model:
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

const inserted = await scanSheet.addToTodaysScanSheet(["20400048799000", "20400048799001"]);

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
