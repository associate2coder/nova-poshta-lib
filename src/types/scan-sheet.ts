/** spec.md §1 Decision override — `Ref` is optional in the caller-facing signature (empty/omitted
 *  means "create a new sheet"); the module fills in `""` internally before sending the request
 *  either way, so the wire shape sent to Nova Poshta is unchanged. `Date` is required — all three
 *  agreeing sources (Go/TypeScript/Python, spec.md §1) declare it alongside DocumentRefs/Ref, none
 *  marking it optional. */
export interface InsertDocumentsPayload {
  DocumentRefs: string[];
  Ref?: string;
  Date: string;
}

/** One outcome from `ScanSheet.insertDocuments` — the sheet a document was inserted into. */
export interface InsertDocumentsItem {
  Ref: string;
  Number: string;
  Date: string;
  Errors: string[];
}

/** spec.md §1 Decision override — both `Ref` and `CounterpartyRef` are sent as plain strings, empty
 *  when not used for that lookup; the module performs no client-side validation of the combination
 *  (both non-empty, or both empty). */
export interface GetScanSheetPayload {
  Ref: string;
  CounterpartyRef: string;
}

/** A scan sheet's full detail, as returned by `ScanSheet.getScanSheet`. */
export interface ScanSheetDetail {
  Ref: string;
  Number: string;
  DateTime: string;
  Count: string;
  CitySenderRef: string;
  CitySender: string;
  SenderAddressRef: string;
  SenderAddress: string;
  SenderRef: string;
  Sender: string;
}

/** One scan sheet summary from `ScanSheet.getScanSheetList`. */
export interface ScanSheetListItem {
  Ref: string;
  Number: string;
  DateTime: string;
  Printed: string;
}

/** Identifies the scan sheets `ScanSheet.deleteScanSheet` removes. */
export interface DeleteScanSheetPayload {
  ScanSheetRefs: string[];
}

/** One outcome from `ScanSheet.deleteScanSheet` — `Error` is `""` for a successful item. */
export interface DeleteScanSheetItem {
  Ref: string;
  Number: string;
  Error: string;
}

/** spec.md §1 Decision override — `Ref` is required: 2 of 3 typed sources (Go's non-pointer
 *  `types.UUID` field, Python's required positional parameter) agree; only the TypeScript source
 *  marks it optional, below this project's 2-source policy bar. */
export interface RemoveDocumentsPayload {
  DocumentRefs: string[];
  Ref: string;
}

/** One outcome from `ScanSheet.removeDocuments` — `Error` is `""` for a successful item. */
export interface RemoveDocumentsItem {
  Ref: string;
  Number: string;
  Error: string;
}
