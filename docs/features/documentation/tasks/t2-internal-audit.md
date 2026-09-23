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
domain-module factories + the core client). For every symbol that is internal-only plumbing (the
known examples from spec §1 ¶4 — `AddressReferenceRecordBase`, `CounterpartyRecordBase`,
`SearchWrapper`, `OpenEnum`, `TRACKING_STATUS_CODES` — plus any others the full scan turns up), add
a `/** @internal */` TSDoc tag directly above its declaration. Record the complete audited list in
this task's PR description so it's reviewable as one decision, not scattered across later PRs.

## Definition of Done

- [ ] Every exported symbol in `src/index.ts`'s surface has been classified public or internal.
- [ ] Every internal symbol carries `@internal`.
- [ ] `npm run docs:build` (from T1) excludes every `@internal` symbol from its output.
- [ ] lint + typecheck clean.

## Notes

T3–T6 depend on this task's output — they need the audited internal list to know which exports to
fully document vs. tag-and-skip.
