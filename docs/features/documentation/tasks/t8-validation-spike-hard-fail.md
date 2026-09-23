---
id: T8
title: "Run the validation spike, then flip to hard-fail"
layer: "tests"
deps: ["T3", "T4", "T5", "T6", "T7"]
acs: ["AC-02", "AC-04", "AC-06"]
files_hint: [".github/workflows/ci.yml", "typedoc.json"]
owner: "associate2coder"
estimate: "M"
status: "todo"
---

# T8 — Run the validation spike, then flip to hard-fail

## Why

Closes [AC-04](../spec.md) (zero missing across the whole surface) and [AC-06](../spec.md) (the
report-only run must confirm zero false positives before the hard-fail rule starts blocking PRs),
then proves [AC-02](../spec.md) (CI fails and names exactly the missing symbol) actually works.

## What

1. Run T7's report-only step against the codebase after T3–T6 land; confirm it reports zero
   missing comments (AC-04, AC-06's rollout-safety gate).
2. Flip `typedoc.json`'s `validation.notDocumented` + `ci.yml`'s `treatWarningsAsErrors` to hard
   mode.
3. Verify AC-02 directly: temporarily add an exported function with no TSDoc comment, confirm the
   CI step fails and names exactly that symbol, then revert the temporary addition before merging.

## Definition of Done

- [ ] Report-only run shows 0 missing comments (AC-04, AC-06).
- [ ] Hard-fail rule (`treatWarningsAsErrors`) is enabled.
- [ ] A temporarily-added undocumented export was confirmed to fail CI, naming exactly that
      symbol (AC-02), then reverted.
- [ ] lint + typecheck clean.

## Notes

Do not enable the hard-fail rule before step 1's zero-missing confirmation — enabling it first
risks blocking unrelated PRs on a false positive (the exact risk AC-06 exists to catch).
