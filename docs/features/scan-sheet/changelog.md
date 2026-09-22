# Changelog — scan-sheet

## scan-sheet — batch waybills into a courier-handoff scan sheet

**What:** Consuming developers now get a fully typed `scan-sheet` module: the 5 confirmed Nova
Poshta `ScanSheet` methods — `insertDocuments`, `getScanSheet`, `getScanSheetList`,
`removeDocuments`, `deleteScanSheet` — passed straight through, plus one convenience method,
`addToTodaysScanSheet`, that finds (or creates) today's still-unprinted scan sheet and adds
waybills to it in one call instead of a caller chaining `getScanSheetList` then `insertDocuments`
themselves. Exported from the package root alongside `common`, `address`, `counterparty`,
`internet-document`, and `tracking-document`.

**Why:** A consuming developer who creates shipments through `internet-document` had no typed way
to batch several waybill `Ref`s into the manifest a courier scans once at pickup — the same
hand-rolled-call gap every prior module already closed for its own slice of the API. This is the
second-to-last domain module before the library's full 7-domain roadmap target. See
[spec.md](spec.md) §1/§2. Key decision:
[ADR-0001](adr/0001-return-empty-batch-result-arrays-instead-of-throwing.md) (a per-item batch
`Error`/`Errors` value inside an otherwise-successful response never throws — only a top-level
`success: false` or a transport failure does, matching this library's one error-contract rule
everywhere else).

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

**Operational notes:**
- Migration: none — no schema change (`scan-sheet` holds no local entities).
- Feature flag / config: none. Pure additive surface.
- Rollback: revert the merge commit; no persisted state to unwind.
- **Security note (§6.1):** `getScanSheet` returns sender identity/address PII
  (`Sender`, `SenderAddress`, `CitySender`) scoped only by whatever `CounterpartyRef` the caller
  supplies — Nova Poshta enforces that scoping, not this library, matching `tracking-document`'s
  precedent of trusting the carrier's own authorization boundary. Security review completed
  2026-09-22 (Tech Lead, during `sdd:review`), 9 findings raised and all resolved across 3 review
  rounds — see [`_review/review-2026-09-22.md`](_review/review-2026-09-22.md), final verdict PASS.
- `printScanSheet` is deliberately **not** shipped — only 1 of 4 cross-checked third-party sources
  implements it, below this project's 2-source API-contract policy bar (§1 Decision override,
  §8 open question).
- Known open questions carried forward (§8): the exact wire format of `DateTime`/`Date`
  (ISO-ish vs. `DD.MM.YYYY`) and whether `Printed === "0"` genuinely means "unprinted" are both
  unverified against a live API key — `addToTodaysScanSheet`'s date matching and most-recent
  tie-break (`extractDatePart`/`toComparableTimestamp` in
  [`src/modules/scan-sheet/index.ts`](../../../src/modules/scan-sheet/index.ts)) were built to
  tolerate either plausible format so a wrong guess degrades safely rather than silently
  misclassifying every sheet. Re-verify once a live key is available.

**Acceptance criteria delivered:** AC-01 … AC-13 — see [spec.md](spec.md) §5 and the review record
([review-2026-09-22.md](_review/review-2026-09-22.md), PASS after 3 rounds — 9 findings, all
resolved: unsourced date-format assumptions made format-tolerant, a raw `TypeError` escape closed,
README/changeset examples corrected to use a `Ref` not a tracking number, integration-test env vars
documented and a timezone bug fixed in the test helper itself, missing per-item-`Errors` and
empty-request-array test coverage added, and a latent cross-format sort-order defect in
`addToTodaysScanSheet`'s tie-break fixed and pinned with a deterministic regression test).
