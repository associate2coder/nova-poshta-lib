---
"nova-poshta-lib": patch
---

Fix two `scan-sheet` defects found by testing against the live Nova Poshta API:

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
