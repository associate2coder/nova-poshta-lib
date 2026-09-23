---
id: T2
title: "Audit and mark all internal-only exports @internal"
layer: "docs"
deps: []
acs: ["AC-03"]
files_hint: ["src/index.ts", "src/types", "src/modules"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T2 — Audit and mark all internal-only exports @internal

## Why

Closes the open architectural decision in [sad §11](../sad.md) — the definitive, fully-audited
list of `@internal`-marked exports — and satisfies [AC-03](../spec.md): an internal-only symbol
must be excluded from both the generated site and the CI comment requirement.

## What

Scan the full `src/index.ts` re-export surface (~150 symbols across 8 `src/types/*.ts` files + 7
domain-module factories + the core client). For every symbol that is internal-only plumbing, add a
`/** @internal */` TSDoc tag directly above its declaration.

**Resolution (2026-09-23):** the full scan found exactly 3 symbols that are used only as an
`extends` base or nested inside another exported type's fields, never as a standalone public
signature — `AddressReferenceRecordBase`, `CounterpartyRecordBase`, `OpenEnum` — and marked them
`@internal`. spec §1 ¶4's example list also named `SearchWrapper` and `TRACKING_STATUS_CODES`, but
source inspection showed both are genuinely public: `SearchWrapper` is the literal return type of
`searchSettlements`/`searchSettlementStreets`, and `TRACKING_STATUS_CODES`'s own source comment
says it "exists only as a documentation reference for consuming developers." Both were left
public, and spec.md/sad.md were corrected to match. See `test/unit/internal-audit.test.ts` for the
regression guard.

## Definition of Done

- [x] Every exported symbol in `src/index.ts`'s surface has been classified public or internal.
- [x] Every internal symbol carries `@internal`.
- [x] `npm run docs:build` (from T1) excludes every `@internal` symbol from its output.
- [x] lint + typecheck clean.

## Notes

T3–T6 depend on this task's output — they need the audited internal list to know which exports to
fully document vs. tag-and-skip.
