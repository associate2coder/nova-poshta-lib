---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-23"
feature_size: "S"
---

# Data model — documentation

## ER diagram

<!-- N/A: this feature introduces no persistent entity. -->

## Entities

<!-- N/A: no schema change. Traced through every upstream source: -->

- `architecture-map.md` — `migration_tool: ""` ("N/A — no database, the API is the only backing
  store"); Persistence/DB access: "none — the library is stateless; the Nova Poshta API is the only
  backing store"; Migrations: "N/A — no schema, no database."
- `spec.md` §5 acceptance criteria name no entity to persist — AC-01/AC-04/AC-06 describe a
  generated static site and a CI coverage report, not stored rows; AC-05 describes an npm-publish
  trigger, not a write.
- `sad.md` §5 building blocks add no new module and no data-store container (`library-sdk` +
  a build/publish "Docs pipeline" container only). §6 sequence diagrams carry no
  `writes/reads <entity>` persist note across any of the 4 flows — every step is either a
  source-file read, a CI check result, or a static-site build/deploy. §8 crosscutting table marks
  ID strategy explicitly `N/A — no persistent identifiers introduced`.
- `CLAUDE.md` — "No persistence: the library holds no state and no IDs of its own — it passes
  through whatever the Nova Poshta API returns."

This feature adds TSDoc comments, a `typedoc.json` config, and two CI workflow steps — no table,
no column, no index, no migration.

## Indexes

<!-- N/A: no entity, no query against a data store. -->

## Test fixtures

<!-- N/A: no entity to build a fixture for. Test coverage for this feature (typedoc config
validity, CI step behavior) is handled at the tooling/CI level, not via data fixtures. -->
