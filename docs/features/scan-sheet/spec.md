---
status: Draft
owner: "associate2coder"
reviewers: []
updated_at: "2026-09-22"
feature_size: "S"
---

# Spec — scan-sheet

> **Glossary:** [CONTEXT](../../../CONTEXT.md) (includes a new "scan sheet" entry added while drafting this spec — see §1)
> **Reference module / docs / channels used:** `docs/architecture-map.md`, `docs/roadmap.md`; `src/modules/internet-document` + its spec (closest precedent — this module's waybill references use the same `Ref: string` shape) and `docs/features/tracking-document/spec.md` (closest S-sized, raw-plus-convenience structural precedent); Nova Poshta's official developer portal — blocked (`developers.novaposhta.ua` returns HTTP 403, `devcenter.novaposhta.ua` fails TLS on a direct fetch, the same blocker every shipped spec in this repo has already hit); cross-checked instead against four independent, actively-maintained community SDKs — `platx/go-nova-poshta`'s `api/scansheet` package (Go, quoted below), `maddsua/NovaPoshtaREST`'s `lib/models/ScanSheet.ts` (TypeScript, quoted below), `semolex/novaposhta-python-client`'s `novaposhta/models/scan_sheet.py` (Python, quoted below), and `serj1chen/nova-poshta-sdk-php`'s `ScanSheet.php` + `MethodParameters/ScanSheet_*.php` (PHP, quoted below) — three of the four (Go/TypeScript/Python) agree field-for-field on the 5-method CRUD surface; the PHP source additionally reveals a `printScanSheet` method none of the other three implement (single-sourced only — see §1 Decision override, §8 OQ); no ticket/Confluence/knowledge-base channel available.

## 1. Context

Consuming developers who create shipments through `internet-document` (or hold waybills from elsewhere) have no typed way to batch several waybills into the manifest a courier scans once at pickup, instead of scanning every parcel individually — today they'd hand-roll or maintain their own types for Nova Poshta's `ScanSheet` API, the same gap `common`, `address`, `counterparty`, `internet-document`, and `tracking-document` already closed for their own slices of the API.

This module is next on the roadmap (wave 3), unblocked now that both of its dependencies have shipped: `internet-document` for the waybill `Ref`s a scan sheet batches, and `counterparty` for the `CounterpartyRef` `getScanSheet` scopes by. It's the second-to-last domain module before the library's full 7-domain target closes with `additional-service`.

The committed approach is to ship one typed method for each of Nova Poshta's 5 confirmed `ScanSheet` API methods (`insertDocuments`, `getScanSheet`, `getScanSheetList`, `deleteScanSheet`, `removeDocuments`), passing each request straight through, plus one convenience method (`addToTodaysScanSheet`) for the common case of batching into today's still-open sheet — the same raw-plus-convenience shape `address`, `counterparty`, and `tracking-document` already established.

Traceability: module boundaries follow the same convention every prior module set (one folder per Nova Poshta model, dual ESM+CJS build, factory over the shared core client); the error contract reuses `NovaPoshtaApiError` unchanged.

**Decision override — `printScanSheet` excluded from the confirmed method surface:** only 1 of the 4 cross-checked sources (`serj1chen/nova-poshta-sdk-php`) implements a print-link method for a scan sheet; the other three (Go, TypeScript, Python) don't have it at all. Per this project's API-contract sourcing policy (CLAUDE.md), a method needs ≥2 independent agreeing sources before it becomes part of a module's confirmed surface — one source is below that bar. `printScanSheet` is therefore **not** one of this spec's 6 methods; it's tracked as an open question (§8) rather than shipped as an AC, the same treatment `internet-document`'s own print methods eventually needed after a widened source pool found them contested (ADR-0005).

**Decision override — `DocumentRefs` uses the same `Ref: string` shape `internet-document` already uses for a waybill:** all three agreeing sources type a scan sheet's document references as a UUID array (`types.UUID` in Go, `string[]` — matching a UUID shape — in TypeScript and Python). **Correction (critic pass, 2026-09-22):** `internet-document` does not export a shared `Ref` type alias to import — every module in this codebase (`src/types/internet-document.ts`, `address.ts`, `counterparty.ts`) inlines `Ref: string` directly on each field rather than declaring one shared type. This module follows that same inlining convention (`DocumentRefs: string[]`) rather than importing a type that doesn't exist; the dependency the roadmap's graph draws (`internet-document → scan-sheet: "InsertDocuments/RemoveDocuments need waybill Refs"`) is about *values* (a Ref must come from a real waybill), not a shared TypeScript type.

**Decision override — `insertDocuments`'s `Ref` field means "add to this existing sheet," and an empty string means "create a new one":** `serj1chen`'s PHP source explicitly sets `$this->Ref = null;` immediately before calling `insertDocuments` for a fresh sheet (its `save()` method), and calls the identical endpoint with a populated `Ref` for `update()` — the same method serving both create and add-to-existing depending on whether `Ref` is present. None of the three typed sources declare `Ref` optional on the TypeScript/Python side, so this module models it as an always-present string field sent as an empty string to mean "create new" — never omitted from the request object — following the same shape `tracking-document`'s AC-02 already established for its own optional-in-practice `Phone` field, rather than inventing a separate `create`/`update` method pair.

**Decision override — `removeDocuments`'s `Ref` field is required:** 2 of 3 typed sources (`platx`'s Go — a non-pointer `types.UUID` field — and `semolex`'s Python — a required positional parameter with no default) type it as required; only `maddsua`'s TypeScript marks it optional (`Ref?: string`). Per policy, the 2-source-agreeing side wins: this module types `Ref` as required on `removeDocuments`.

**Decision override — `getScanSheet`'s `CounterpartyRef` field is included:** all 3 typed sources (Go, TypeScript, Python) declare `Ref` and `CounterpartyRef` side by side on the request. The 4th source's (PHP) parameter wrapper class (`ScanSheet_getScanSheet.php`) only exposes a `Ref` setter — read as an incomplete convenience wrapper (the same repo's `ScanSheet.php` has no parameter class at all for 3 of its 6 methods, building payloads from dynamic properties instead), not a real contradiction, since it never declares `CounterpartyRef` doesn't exist. 3-source agreement clears the bar.

**Decision override — `addToTodaysScanSheet` convenience method:** added after review — the raw `insertDocuments` method only auto-creates a *new* sheet when its `Ref` is omitted; adding to an already-open sheet from a separate call otherwise requires the caller to first call `getScanSheetList` to find its `Ref`, then pass that into `insertDocuments`. This wraps that lookup-then-insert chain into one call: find today's still-unprinted scan sheet via `getScanSheetList`, insert into it if one exists, or create a new one if none does — the same class of repeated-chained-call friction `findCityByName` (`address`) and `findCounterparty` (`counterparty`) already exist to remove.

### In-scope ScanSheet API methods (as of 2026-09-22)

1. `insertDocuments` — add one or more waybill `Ref`s to a scan sheet; creates a new sheet when its own `Ref` is an empty string, or adds to the existing sheet identified by that `Ref`.
2. `getScanSheet` — retrieve scan sheet detail (sender identity/address, waybill count), returned as an array either way: by a specific sheet's own `Ref` (typically one matching item), or by `CounterpartyRef` to scope to a specific counterparty's sheets (potentially several).
3. `getScanSheetList` — list every scan sheet the caller's API key can see, each with its `Ref`, `Number`, creation `DateTime`, and whether it's been printed.
4. `deleteScanSheet` — delete one or more scan sheets entirely, by their own `Ref`s.
5. `removeDocuments` — remove one or more waybill `Ref`s from a specific scan sheet, identified by its `Ref`.

Convenience (additive on top of the 5 above, not a replacement — per §2):

6. `addToTodaysScanSheet` — takes a set of waybill `Ref`s directly; internally calls `getScanSheetList`, finds today's still-unprinted sheet if one exists, calls `insertDocuments` against it (or with no `Ref` to create a new one if none exists), and returns the result.

**Quoted source** (3 of the 4 independent, agreeing confirmations of the 5-method request/response shape):

```go
// platx/go-nova-poshta, api/scansheet/model.go — the interface's 5 methods, each linking Nova Poshta's own doc page:
type Model interface {
	api.Model
	// GetScanSheetList https://developers.novaposhta.ua/view/model/a46fc4f4-8512-11ec-8ced-005056b2dbe1/method/a4d93a89-8512-11ec-8ced-005056b2dbe1
	GetScanSheetList() (GetScanSheetListRes, error)
	// GetScanSheet https://developers.novaposhta.ua/view/model/a46fc4f4-8512-11ec-8ced-005056b2dbe1/method/a4abdd36-8512-11ec-8ced-005056b2dbe1
	GetScanSheet(GetScanSheetReq) (GetScanSheetRes, error)
	// InsertDocuments https://developers.novaposhta.ua/view/model/a46fc4f4-8512-11ec-8ced-005056b2dbe1/method/a482293c-8512-11ec-8ced-005056b2dbe1
	InsertDocuments(InsertDocumentsReq) (InsertDocumentsRes, error)
	// RemoveDocuments https://developers.novaposhta.ua/view/model/a46fc4f4-8512-11ec-8ced-005056b2dbe1/method/a53dea8a-8512-11ec-8ced-005056b2dbe1
	RemoveDocuments(RemoveDocumentsReq) (RemoveDocumentsRes, error)
	// DeleteScanSheet https://developers.novaposhta.ua/view/model/a46fc4f4-8512-11ec-8ced-005056b2dbe1/method/a50e049b-8512-11ec-8ced-005056b2dbe1
	DeleteScanSheet(DeleteScanSheetReq) (DeleteScanSheetRes, error)
}

// api/scansheet/request.go
type InsertDocumentsReq struct {
	DocumentRefs []types.UUID     `json:"DocumentRefs"`
	Ref          types.UUID       `json:"Ref"`
	Date         types.CustomDate `json:"Date"`
}
type GetScanSheetReq struct {
	Ref             types.UUID `json:"Ref"`
	CounterpartyRef types.UUID `json:"CounterpartyRef"`
}
type DeleteScanSheetReq struct {
	ScanSheetRefs []types.UUID `json:"ScanSheetRefs"`
}
type RemoveDocumentsReq struct {
	DocumentRefs []types.UUID `json:"DocumentRefs"`
	Ref          types.UUID   `json:"Ref"`
}

// api/scansheet/response.go
type InsertDocumentsItem struct {
	Ref types.UUID `json:"Ref"`; Number string `json:"Number"`; Date types.CustomDate `json:"Date"`; Errors types.Messages[string] `json:"Errors"`
}
type GetScanSheetItem struct {
	Ref types.UUID `json:"Ref"`; Number string `json:"Number"`; DateTime time.Time `json:"DateTime"`; Count types.IntString `json:"Count"`
	CitySenderRef types.UUID `json:"CitySenderRef"`; CitySender string `json:"CitySender"`
	SenderAddressRef types.UUID `json:"SenderAddressRef"`; SenderAddress string `json:"SenderAddress"`
	SenderRef types.UUID `json:"SenderRef"`; Sender string `json:"Sender"`
}
type GetScanSheetListItem struct {
	Ref types.UUID `json:"Ref"`; Number string `json:"Number"`; DateTime time.Time `json:"DateTime"`; Printed types.IntString `json:"Printed"`
}
type DeleteScanSheetItem struct { Ref types.UUID `json:"Ref"`; Number string `json:"Number"`; Error string `json:"Error"` }
type RemoveDocumentsItem struct { Ref types.UUID `json:"Ref"`; Number string `json:"Number"`; Error string `json:"Error"` }
```

```typescript
// maddsua/NovaPoshtaREST, lib/models/ScanSheet.ts — request shapes for all 5 methods, agreeing field-for-field with the Go source above:
export const insertDocuments = async (apiToken: string, props: {
	DocumentRefs: string[]; Ref: string; Date: string;
}) => /* calledMethod: 'insertDocuments' */;

export const getScanSheet = async (apiToken: string, props: {
	Ref: string; CounterpartyRef: string;
}) => /* calledMethod: 'getScanSheet' */;

export const getScanSheetList = async (apiToken: string) => /* calledMethod: 'getScanSheetList', methodProperties: {} */;

export const deleteScanSheet = async (apiToken: string, props: {
	ScanSheetRefs: string[];
}) => /* calledMethod: 'deleteScanSheet' */;

export const removeDocuments = async (apiToken: string, props: {
	DocumentRefs: string[]; Ref?: string; // the lone dissenting source on Ref's optionality — see Decision override above
}) => /* calledMethod: 'removeDocuments' */;
```

```python
# semolex/novaposhta-python-client, novaposhta/models/scan_sheet.py — third independent confirmation, same 5 methods + identical field names:
class ScanSheet(BaseModel):
    name = "ScanSheet"

    @api_method("insertDocuments")
    def insert_documents(self, document_refs: List[str], ref: str, date: str): ...

    @api_method("getScanSheet")
    def get_scan_sheet(self, ref: str, counterparty_ref: str): ...

    @api_method("getScanSheetList")
    def get_scan_sheet_list(self): ...

    @api_method("deleteScanSheet")
    def delete_scan_sheet(self, scan_sheet_refs: List[str]): ...

    @api_method("removeDocuments")
    def remove_documents(self, document_refs: List[str], ref: str): ...
```

All three agree, field-for-field, on the 5-method surface, its request shape, and its response field set. `serj1chen/nova-poshta-sdk-php`'s `ScanSheet.php` independently confirms the same 5 method names exist (`insertDocuments` via its `save()`/`update()`, `deleteScanSheet` via `delete()`, plus direct `getScanSheet()`/`getScanSheetList()`/`removeDocuments()` calls) and additionally implements a 6th, single-sourced method:

```php
// serj1chen/nova-poshta-sdk-php, lib/NovaPoshta/ApiModels/ScanSheet.php — printScanSheet(), the single-source print-link method (§1 Decision override, §8 OQ):
public static function printScanSheet(MethodParameters $data = null)
{
    $refs = isset($data->DocumentRefs) ? $data->DocumentRefs : null;
    if (empty($refs)) { return ''; }

    $link = Config::getUrlMyNovaPoshta() . '/scanSheet/printScanSheet';
    foreach ($refs as $ref) { $link .= '/refs[]/' . $ref; }
    if (isset($data->Type)) { $link .= '/type/' . $data->Type; }
    $link .= '/apiKey/' . Config::getApiKey();

    return $link;
}
```

Structurally this mirrors `internet-document`'s own `printDocument`/`printMarkings` URL construction (a plain hosted link, `type` + trailing `apiKey` segments) closely enough to be plausible — and `getScanSheetList`'s `Printed` field (present in all 3 agreeing sources) confirms printing is a real, tracked state on a scan sheet — but the exact URL shape above comes from one source only. Given this project's own `internet-document` postmortem (ADR-0005: a single/under-cross-checked source shipped, then needed a dedicated post-ship fix), `printScanSheet` is excluded from this spec's confirmed surface rather than shipped provisionally.

## 2. Goals

- Give consuming developers a typed, discoverable way to batch waybills into a scan sheet for courier handoff, closing the same hand-rolled-call gap every other shipped module already closed for its own slice of the API.
- Remove the `getScanSheetList`-then-`insertDocuments` chained-call friction for the common "add to today's batch" case via one convenience method (`addToTodaysScanSheet`).

## 3. Non-goals

- Printing a scan sheet (`printScanSheet`). Reason: single-sourced only (§1 Decision override), below this project's 2-source policy bar — tracked as an open question (§8), not shipped.
- Any client-side cap, split, or reordering of `DocumentRefs`/`ScanSheetRefs` batch arrays. Reason: matches the library's existing pass-through convention (`tracking-document`'s AC-03/AC-05 precedent) — Nova Poshta's own limits, if any, are not this library's to enforce.
- Reconciling a scan sheet's `Printed` state with any print action of this library's own. Reason: no confirmed print method exists in this module's scope (§1); `Printed` is surfaced as returned data only.
- Caching results, deduplicating repeated waybill `Ref`s across calls, or adding client-side rate limiting. Reason: matches the library's existing stateless, no-caching convention shared by every prior module.

## 4. User stories

### US-01: Add waybills to a scan sheet

**As a** consuming developer
**I want** to add one or more waybill `Ref`s to a scan sheet, creating a new one or adding to an existing one
**So that** I can build up a courier-handoff batch across one or more calls

### US-02: Add to today's batch without looking up its Ref

**As a** consuming developer
**I want** a convenience method that adds waybills to today's still-open scan sheet directly
**So that** I don't have to call `getScanSheetList` myself first just to find which sheet is still open

### US-03: Retrieve one scan sheet's detail

**As a** consuming developer
**I want** to look up a specific scan sheet's detail by its own `Ref`, or by the counterparty it belongs to
**So that** I can confirm what a given handoff batch contains before or after a courier picks it up

### US-04: List every scan sheet

**As a** consuming developer
**I want** to list every scan sheet visible to my API key, including whether each has been printed
**So that** I can find an open, not-yet-handed-off batch without knowing its `Ref` in advance

### US-05: Remove waybills from a scan sheet

**As a** consuming developer
**I want** to remove specific waybill `Ref`s from an existing scan sheet
**So that** I can correct a batch before handoff without discarding the whole sheet

### US-06: Delete a scan sheet entirely

**As a** consuming developer
**I want** to delete one or more scan sheets outright
**So that** I can discard a batch I no longer need, without it lingering in `getScanSheetList`

### US-07: Get a clear error on failure

**As a** consuming developer
**I want** a scan-sheet request that fails outright — a bad key, a decline, or a network failure — to raise the library's standard error
**So that** I can handle it the same way I handle every other error from this library, without special-casing scan-sheet

## 5. Acceptance criteria

> Every "standard error" referenced below is `NovaPoshtaApiError` (per CLAUDE.md), reused unchanged from every sibling module's convention.

### AC-01 (US-01) — happy path

**Given** a consuming developer holds a valid API key and one or more waybill `Ref`s, with no existing scan sheet `Ref` to add them to
**When** they call `insertDocuments` with those waybill `Ref`s and an empty-string scan-sheet `Ref`
**Then** the system creates a new scan sheet containing those waybills and returns its `Ref`, `Number`, and creation date as typed data

### AC-02 (US-01) — happy path

**Given** a consuming developer holds a valid API key, an existing scan sheet's own `Ref`, and one or more additional waybill `Ref`s
**When** they call `insertDocuments` with both
**Then** the system adds those waybills to the existing scan sheet rather than creating a new one, and returns the same typed result shape as AC-01

### AC-03 (US-02) — happy path

**Given** a consuming developer holds a valid API key and one or more waybill `Ref`s to batch
**When** they call the `addToTodaysScanSheet` convenience method with those `Ref`s
**Then** the system finds today's scan sheet that hasn't been printed yet (if one exists) and adds the waybills to it, or creates a new scan sheet if no such sheet exists yet today — either way returning the same typed result shape `insertDocuments` returns, without the caller having made a separate `getScanSheetList` call themselves

### AC-04 (US-03) — happy path

**Given** a consuming developer holds a valid API key and an existing scan sheet's own `Ref`
**When** they call `getScanSheet` with that `Ref`
**Then** the system returns that scan sheet's typed detail as a single-item array — its sender identity and address, and how many waybills it currently contains

### AC-05 (US-03) — cross-context

**Given** a consuming developer holds a valid API key and a counterparty's own `Ref` (obtained from `counterparty`, a separate bounded context this module doesn't manage)
**When** they call `getScanSheet` with that `CounterpartyRef` instead of a specific scan-sheet `Ref`
**Then** the system returns an array of every scan sheet Nova Poshta associates with that counterparty (zero, one, or several) — scan-sheet itself performs no ownership check of its own; it passes the `CounterpartyRef` through and returns whatever Nova Poshta scopes the result to, the same cross-context trust boundary `internet-document`'s sender/recipient `Ref`s already rely on

### AC-06 (US-04) — happy path

**Given** a consuming developer holds a valid API key
**When** they call `getScanSheetList`
**Then** the system returns every scan sheet visible to that key as typed data, each with its `Ref`, `Number`, creation date, and whether it has been printed yet

### AC-07 (US-05) — happy path

**Given** a consuming developer holds a valid API key, an existing scan sheet's own `Ref`, and one or more waybill `Ref`s currently included in it
**When** they call `removeDocuments` with the scan sheet's `Ref` and those waybill `Ref`s
**Then** the system removes those waybills from that scan sheet and returns typed per-waybill confirmation (or a per-waybill error if one couldn't be removed), leaving the rest of the sheet's contents untouched

### AC-08 (US-05) — domain invariant

**Given** a consuming developer removes waybills from a scan sheet via `removeDocuments`
**When** the removal completes
**Then** the waybills themselves are not deleted, cancelled, or otherwise invalidated — they remain valid, trackable shipments via `tracking-document`/`internet-document`; only their membership in that specific scan sheet is undone, matching the CONTEXT glossary's distinction that a scan sheet batches waybills without being or controlling them

### AC-09 (US-06) — happy path

**Given** a consuming developer holds a valid API key and one or more existing scan sheets' own `Ref`s
**When** they call `deleteScanSheet` with those `Ref`s
**Then** the system deletes those scan sheets entirely and returns typed per-sheet confirmation (or a per-sheet error if one couldn't be deleted); a subsequent `getScanSheetList` call no longer includes a successfully deleted sheet

### AC-10 (US-06) — domain invariant

**Given** a consuming developer deletes a scan sheet via `deleteScanSheet` that contained one or more waybills
**When** the deletion completes
**Then** the waybills that had been batched inside it are not deleted, cancelled, or otherwise invalidated — they remain valid, trackable shipments; deleting a scan sheet undoes the batching relationship only, the same invariant AC-08 establishes for `removeDocuments`

### AC-11 (US-07) — error

**Given** a consuming developer calls any of this module's methods
**When** Nova Poshta declines the request outright, or the response it returns isn't a navigable list of records at all — not an array, missing its data field, or otherwise unreadable as a list
**Then** the system raises the library's standard error containing Nova Poshta's own explanation, rather than returning an empty or partial result that looks like a valid outcome, matching every sibling module's precedent

### AC-12 (US-07) — authorization

**Given** a consuming developer calls any of this module's methods
**When** the request reaches Nova Poshta carrying the caller's API key the same way every other module's request does
**Then** if Nova Poshta denies the call over the key, the system raises the library's standard error with Nova Poshta's own message, exactly like every sibling module; the library performs no independent key-validity check of its own

### AC-13 (US-07) — error

**Given** a consuming developer calls any of this module's methods
**When** the network call to Nova Poshta fails before a response is received (a timeout, a dropped connection, or a response that isn't valid JSON)
**Then** the system raises the library's standard error rather than letting the failure propagate unhandled or returning an empty result that looks like a valid response

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Type-safety coverage | 100% of in-scope methods (5 raw + 1 convenience) have zero `any` in public signatures | static check in CI |
| Error-contract coverage | 100% of in-scope methods throw the standard error on a declined, non-list, or network-failed response | unit test suite (`test/unit/modules/scan-sheet`) |
| Method-surface completeness | 100% of the 5 raw methods + 1 convenience method have a corresponding typed method | unit test suite asserts all 6 are exported and callable |
| Batch pass-through | 100% of `DocumentRefs`/`ScanSheetRefs` arrays reach Nova Poshta unmodified — no client-side split, cap, or reorder | unit test suite, dedicated fixture with a multi-item batch (AC-01, AC-07, AC-09) |
| Library-added overhead per call | Median ≤ 5ms beyond the underlying network round-trip (no client-side caching, retries, or heavy parsing) | median across ≥30 repeated single-item calls, `fetch` stubbed to near-zero latency, always runs in CI |

## 6.1 Security / privacy

- **Data classification:** confidential — a `getScanSheet` response carries sender identity and address fields (`Sender`, `SenderAddress`, `CitySender`, per the quoted source structs in §1), similar in sensitivity to `address`'s saved-address data and `tracking-document`'s sender/recipient fields.
- **Personal data touched:** yes — the sender fields above qualify as personal/business data whenever the underlying counterparty is a `PrivatePerson` (per the CONTEXT glossary).
- **AuthZ/AuthN impact:** the library sends the caller's API key on every call the same way every module does (AC-12) and performs no independent key-validity check. `getScanSheet`'s `CounterpartyRef` scoping (AC-05) is enforced by Nova Poshta itself, not by this library — scan-sheet has no ownership check of its own, matching `tracking-document`'s precedent of trusting Nova Poshta's own authorization boundary rather than duplicating it client-side.
- **Abuse cases:**
  - Enumerating scan-sheet or counterparty `Ref`s to fish for another party's sender address/detail: accepted risk by design, matching `tracking-document`'s AC-09 stance — this library adds no rate-limiting or ownership check of its own for any method.
  - Calling `deleteScanSheet`/`removeDocuments` against a `Ref` the caller doesn't actually own: Nova Poshta's own authorization is the only control; this library performs no client-side ownership check (matches every write-capable module's existing non-goal).
  - Malformed or spoofed batch arrays (`DocumentRefs`/`ScanSheetRefs`): no injection risk — every request is a typed JSON envelope through the shared core client, never raw SQL/HTML/shell content.
- **Logging:** the library performs no logging of its own (matching its existing stateless design); a thrown `NovaPoshtaApiError`'s message carries only Nova Poshta's own `errors[]`/`warnings[]` text, never response-body PII.
- **Security review:** Required — this module returns sender PII (`Sender`, `SenderAddress`) from a call whose only scoping (`CounterpartyRef`) is enforced entirely by Nova Poshta, not this library, the same class of first-time risk `tracking-document`'s review flagged for its own recipient/sender fields.

## 7. Metrics / KPIs

- **Type-safety completeness** — baseline: 0% (module doesn't exist yet), target: 100% of in-scope methods carry no `any` in their public signature, verified in the first release containing this feature.
- **Zero silent failures** — baseline: N/A (feature doesn't exist), target: 100% of unit tests confirming a declined or network-failed call throws `NovaPoshtaApiError`, passing before merge.
- **Method-surface completeness** — baseline: 0 of 6 (5 raw + 1 convenience) exposed, target: all 6 shipped with a corresponding typed method before this feature is marked done.
- **Convenience-method correctness** — baseline: N/A (feature doesn't exist), target: 0 GitHub issues within 90 days of release reporting `addToTodaysScanSheet` adding to the wrong scan sheet or missing an already-open one.

## 8. Open questions

- [ ] Does Nova Poshta's `ScanSheet` model expose a real print-link method (`printScanSheet`)? Default now: excluded from this module's confirmed 6-method surface — only 1 of 4 cross-checked sources (`serj1chen/nova-poshta-sdk-php`) implements it (§1 Decision override); tracked here rather than shipped as an AC. Genuinely still open — no second source to resolve it either way. — owner: Tech Lead, due: before next release touching scan-sheet print behavior, or once a 2nd agreeing source / the official docs are reachable
- [x] Is `getScanSheet`'s `CounterpartyRef` field genuinely part of the wire request? **Resolved during drafting (2026-09-22):** yes — 3 of 4 sources (Go, TypeScript, Python) agree field-for-field; the 4th (PHP) is an incomplete convenience wrapper that only exposes a `Ref` setter (that same repo has no parameter class at all for 3 of its other methods either), not a contradiction — see §1 Decision override. Shipped as part of the confirmed request shape (AC-05); this row tracks confidence, not an undecided design. — owner: Tech Lead, due: next official-docs re-verification pass
- [x] Is `removeDocuments`'s `Ref` field required or optional? **Resolved during drafting (2026-09-22):** required — 2 of 3 typed sources agree (`platx`/Go: non-pointer field; `semolex`/Python: required positional parameter); only `maddsua`/TypeScript marks it optional — see §1 Decision override. Shipped as required (AC-07); this row tracks confidence, not an undecided design. — owner: Tech Lead, due: next official-docs re-verification pass
- [ ] What is `getScanSheetList`'s `Printed` field's exact wire type — a boolean, or a numeric/string flag (`platx` types it `types.IntString`, `maddsua` types it a plain `string`)? This affects `addToTodaysScanSheet`'s "still unprinted" filter at implementation time. Default now: treat any falsy/zero value as "not yet printed." Genuinely still open — no source pins the exact wire representation. — owner: Tech Lead, due: before `sdd:tasks` breaks this module down
- [ ] Who performs the §6.1 security review this module requires, and what does it block? Default now: Tech Lead, during `sdd:review`, matching `tracking-document`'s precedent — no code change expected unless the review finds one. — owner: Tech Lead, due: before `sdd:ship`
- [ ] Re-verify the 5-raw-method `ScanSheet` surface and `insertDocuments`'s "empty-string `Ref` creates a new sheet" semantics against Nova Poshta's live/official documentation once the portal is reachable by automated tooling — the 3-SDK cross-check agrees field-for-field, but is still a third-party source, the same caveat every shipped spec in this repo already carries. — owner: Tech Lead, due: next live-API verification pass

## Test plan

> Size S / route `quick` — plan kept inline per the size matrix, not a separate `test-plan.md`.
> Levels used: **unit** (mocked `fetch`, no real network — covers all 13 ACs) and **integration**
> (one opt-in real-API smoke test against a throwaway scan sheet, gated by
> `NOVA_POSHTA_TEST_API_KEY`, matching the existing `test/integration/` convention — never blocks
> CI without a key configured). No **e2e**, **load-as-throughput**, **component**,
> **visual-regression**, **contract**, or **e2e-through-UI** tiers apply — no UI surface; this
> module ships only 6 methods, covered directly by the unit suite's method-surface assertions.

### AC coverage

| AC (spec.md §5) | Test name (intent-based) | Level | Expected outcome |
|---|---|---|---|
| AC-01 insertDocuments creates new sheet | inserting waybills with no scan-sheet Ref creates a new sheet | unit + integration | typed result with a new `Ref`/`Number`/`Date` |
| AC-02 insertDocuments adds to existing sheet | inserting waybills with an existing scan-sheet Ref adds to it | unit | request body carries the given `Ref`; no new sheet created |
| AC-03 addToTodaysScanSheet convenience | convenience method finds today's unprinted sheet and inserts, or creates one if none exists | unit | `getScanSheetList` called once, then `insertDocuments` called with the matched (or empty-string) `Ref` |
| AC-04 getScanSheet by Ref | retrieving a sheet by its own Ref returns its typed detail | unit + integration | typed record with sender identity/address + waybill count |
| AC-05 getScanSheet by CounterpartyRef | retrieving sheets scoped by counterparty passes the CounterpartyRef through unmodified | unit | request body carries `CounterpartyRef`; response returned as-is |
| AC-06 getScanSheetList happy path | listing sheets returns every visible sheet with its printed flag | unit + integration | typed array with `Ref`/`Number`/`DateTime`/`Printed` per item |
| AC-07 removeDocuments happy path | removing waybills from an existing sheet returns per-waybill confirmation | unit | typed per-item result; unrelated waybills on the sheet untouched |
| AC-08 removeDocuments doesn't invalidate waybills | removing a waybill from a sheet leaves the waybill itself trackable | unit | no call made to any waybill-invalidating endpoint; fixture asserts scope is scan-sheet-only |
| AC-09 deleteScanSheet happy path | deleting one or more sheets removes them from a subsequent list call | unit + integration | typed per-item confirmation; deleted sheet absent from a following `getScanSheetList` fixture |
| AC-10 deleteScanSheet doesn't invalidate waybills | deleting a sheet leaves its batched waybills trackable | unit | no call made to any waybill-invalidating endpoint; same assertion shape as AC-08 |
| AC-11 declined / non-list response | a decline or a non-list response throws the standard error | unit | standard error thrown, carrying Nova Poshta's own explanation |
| AC-12 authorization / bad key | an invalid or expired API key is denied with the standard error | unit | standard error thrown with Nova Poshta's message; no ownership check performed client-side |
| AC-13 network/transport failure | a timeout, dropped connection, or non-JSON response throws the standard error | unit | standard error thrown; the call never resolves as if it had succeeded |

### Edge cases / error paths

- A scan-sheet response comes back successful but `data` isn't array-shaped → standard error thrown (the array-shape check, inherited unchanged from `common`; same code path as AC-11, listed separately since it's a distinct trigger condition).
- `addToTodaysScanSheet` is called when `getScanSheetList` itself fails → the convenience method surfaces the same standard error `getScanSheetList` would raise directly, rather than swallowing it and falling through to create a new sheet.
- An empty `DocumentRefs`/`ScanSheetRefs` array is supplied to any method → passed through to Nova Poshta as-is (no client-side validation, matching the library's pass-through convention); whatever Nova Poshta does with it is surfaced per AC-11 as applicable.

### Test data

- Seed strategy: none — `scan-sheet` holds no local entities (no schema change); unit tests build request/response fixtures inline, shaped like the response fields confirmed in §1's quoted sources.
- Integration dependency: **corrected (critic pass, 2026-09-22)** — `insertDocuments`/`removeDocuments` take a waybill's `Ref` (UUID), not its printed waybill number, so a `tracking-document`-style number env var doesn't fit here. Instead, the opt-in smoke tests (AC-01, AC-04, AC-06, AC-09) first create a throwaway waybill via `internet-document`'s `save()` to obtain a real `Ref`, use it to exercise `insertDocuments`/`getScanSheet`/`getScanSheetList`/`deleteScanSheet`, then delete both the scan sheet (this module's own `deleteScanSheet`) and the waybill (`internet-document`'s `delete`) as cleanup. Gated by `NOVA_POSHTA_TEST_API_KEY`, same as every other integration test; no separate waybill-number env var is needed since the test creates its own waybill rather than depending on a pre-existing one.
- Cleanup boundary: any scan sheet created by an integration test is deleted via `deleteScanSheet`, and any waybill created to feed it is deleted via `internet-document`'s `delete`, both at the end of the same test run — so neither lingers in the caller's account.

### NFR validation (load)

- `spec.md` §6 NFR row 5 — library-added overhead per call, median ≤5ms beyond the network round trip → scenario: 30+ repeated single-item calls (one waybill `Ref` per `insertDocuments` call), `fetch` stubbed to near-zero latency, timing the typed method call end-to-end and asserting the median added overhead ≤5ms. Runs in the project's existing test runner.
- No other §6 NFR row carries a number implying sustained rate/duration load — the remaining rows (type-safety coverage, error-contract coverage, method-surface completeness, batch pass-through) are static/CI or dedicated-fixture checks already captured in the AC coverage table above.

### CI placement

- Every PR: all unit tests (all 13 ACs) — fast, fully deterministic, no live API key required.
- Opt-in only, never blocking CI: the real-API integration smoke tests — run manually or on a schedule wherever `NOVA_POSHTA_TEST_API_KEY` is configured.
