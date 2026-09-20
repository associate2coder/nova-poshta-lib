# API sync report — `common`

Interface kind: **library-sdk** → `contracts/public-api.md` (no OpenAPI; no HTTP surface exists).
No async flows in `sad.md` §6 → no `events.md` produced.

## Gate

`data-model.md` is **absent**. Evaluated as a legal fast-lane skip, not a hard refuse:
`sad.md` §5 names no new persistent building blocks, no `docs/features/common/migrations/` is
staged, and `spec.md` §3 non-goals explicitly rule out persistence ("the library is stateless").
`architecture-map.md` records "Datastores: none" for this repo. → **proceeded**, deriving field
shapes from the existing-schema equivalent for a library-sdk surface: `src/types/common.ts`'s
current envelope shape + the Nova Poshta `Common` model's documented per-method fields (per
`spec.md` §1, cross-checked via community SDK sources, not yet the live API or official docs).

## Field-origins table

| Path | Origin | Confidence |
|---|---|---|
| `CommonModule.*` (15 methods) | `spec.md` §1 in-scope list | high |
| `*.Ref`, `*.Description` (most records) | Nova Poshta `Common` model docs, cross-checked via community SDK (`spec.md` §1) | medium |
| `OwnershipForm.FullName` | Nova Poshta `Common` model docs (community SDK cross-check) | medium |
| `TimeInterval.Number/Start/End` | Nova Poshta `Common` model docs (community SDK cross-check) | medium |
| `TimeIntervalFilters.RecipientCityRef` (required) | `spec.md` §1 method description ("accepts a recipient city + optional date filter") | high |
| `TimeIntervalFilters.DateTime` (optional) | Nova Poshta `Common` model docs (community SDK cross-check) | medium |
| `CargoDescriptionFilters.FindByString` | `spec.md` §1 method description ("accepts a search-string filter") | high |
| `PaymentForm.Ref` / `PayerType.Ref` / `CounterpartyType.Ref` as `OpenEnum` | `sad.md` §4 decision 5 + ADR-0002 | high (pattern); literal set N/A until implementation |
| Error contract (4 branches → `NovaPoshtaApiError`) | `sad.md` §6 Flow 1 `alt` branches | high |
| AC-03 tolerated-noise list | `spec.md` AC-03 | high |

No field in the contract lacks an origin in `spec.md`/`sad.md`/existing code. The one deliberately
open item is the `Known` literal set inside `OpenEnum<Known>` — left `never` (compiles as plain
`string`) rather than invented, per the anti-pattern "inventing a field/value with no origin."
Filling it is explicitly deferred to `implement`, sourced from live-API captures, matching
`spec.md` §8's open question and the standing `sad.md` §11 risk.

## Drift checklist

**Forward (contract derived correctly):**

1. ✅ **Method ↔ spec.** All 15 `spec.md` §1 methods appear as `CommonModule` methods, 1:1, no
   extra, none missing.
2. ✅ **Error contract ↔ repo convention.** Single `NovaPoshtaApiError` (CLAUDE.md), no
   method-specific subclass — matches `sad.md` §8 crosscutting "Error handling" row.
3. ✅ **Field optionality ↔ ADR-0001.** Every documented field is optional; no field is required
   on a response record (only request-side filters have a required field, `RecipientCityRef`,
   which is a filter input, not response data).
4. ✅ **Contract ↔ sequence.** The 4 error branches in `contracts/public-api.md` §4 map 1:1 to
   `sad.md` §6 Flow 1's 4 `alt` branches (network/transport, key-rejected, other-decline,
   non-array-shaped) — no branch invented, none dropped.

**Back-feed (coverage cross-check):**

5. ✅ **Every `spec.md` §5 AC ↔ ≥1 method/behavior.** AC-01/02 → happy-path methods; AC-03 →
   error contract row 4 (enforced in the core client, not per-method, per `sad.md` §5); AC-04/05/08
   → error contract rows 1–3; AC-06 → §7 traceability note (non-runtime, `CommonModule`'s output
   itself is the mechanism); AC-07 → module-shape re-export note (§1); no AC left unmapped.
6. ✅ **Every method ↔ a §4 user story + ≥1 AC.** See §3/§7 tables in `public-api.md`.
7. ✅ **Every `sad.md` §6 `alt`-branch ↔ a response.** All 4 branches covered (see item 4). No
   sequence gap found — no Save-as-OQ needed for this feature.

**Result:** 4/4 forward + 3/3 back-feed ✓, 0 flags. No pause triggered (no core finding failed,
fewer than 3 flags total). Nothing routed to Save-as-OQ.

## Known open items (inherited, not introduced by this pass)

These are pre-existing `spec.md` §8 / `sad.md` §11 open questions this contract does not resolve
— it depends on them being resolved before the dates already fixed there, and is written to
tolerate either outcome:

- Whether Nova Poshta rejects an invalid filter explicitly or silently ignores it (owner Tech
  Lead, due before `sdd:implement common`) — `public-api.md` §4 AC-05 row holds regardless.
- The live `Known` literal sets for `OpenEnum` fields (owner: `implement`, sourced from the
  integration suite) — `public-api.md` §2/§3 fix the pattern, not the literals.
- Multi-language field exposure, tier-gated list handling — do not change this contract's shape
  (pass-through verbatim either way); tracked at their existing owners/dates.

## Handoff

- **What I did:** Derived `contracts/public-api.md` (the library-sdk contract form — 15 typed
  methods, request/response types, the `OpenEnum` pattern per ADR-0002, the 4-branch error
  contract per ADR-0001/`sad.md` §6) and this drift report, from `spec.md` §1/§4/§5 and `sad.md`
  §4/§5/§6 + both Accepted ADRs. `data-model.md` was legally absent (no schema change) —
  documented via the existing-schema-equivalent path.
- **Review:** `docs/features/common/contracts/public-api.md`,
  `docs/features/common/contracts/api-sync-report.md`.
- **Run next:** size `S`, route `quick` → `target_surfaces` declares no UI surface
  (`library-sdk` only), so `screens` is N/A (auto-skipped, not offered). On `quick` this also
  auto-skips straight past `tasks` unless you want the task breakdown anyway — run
  `/sdd:tasks common` if you want the atomic task list; otherwise this feature is ready for
  `/sdd:implement common` once `tasks.json` exists, or hand-implemented directly per `sad.md` §5
  given its size.
