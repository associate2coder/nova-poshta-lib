---
id: T7
title: "Add documentation-coverage step to ci.yml, report-only"
layer: "wiring"
deps: ["T1"]
acs: ["AC-06"]
files_hint: [".github/workflows/ci.yml"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T7 — Add documentation-coverage step to ci.yml, report-only

## Why

Wires the check [AC-06](../spec.md) requires to be validated in report-only mode first, before it
starts blocking pull requests — [sad §4 pillar 4](../sad.md): the check is added to the existing
`ci.yml`, not a new workflow.

## What

Add a step to `.github/workflows/ci.yml`'s existing `build-test-lint` job that runs TypeDoc's
validation (`npx typedoc --emit none` or equivalent) and prints its coverage report, without
failing the build on missing comments yet (`treatWarningsAsErrors` stays off, matching T1).

## Definition of Done

- [ ] The step runs on every PR and push to `main`, same runner class as the rest of `ci.yml`.
- [ ] The step's own output reports missing-comment warnings without failing the job.
- [ ] Step duration is ≤ 30s added to the pipeline (spec §6 NFR, observed budget).

## Notes

T8 depends on this — it's the mechanism T8 flips from report-only to hard-fail once T3–T6 close
the coverage gap.
