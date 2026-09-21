# Data-model audit — internet-document — 2026-09-21

## Outcome

**No schema change.** `internet-document` is a stateless pass-through module (`sad.md` §2,
`CLAUDE.md` "No persistence") — Nova Poshta's API is the sole backing store for every entity the
8 in-scope methods touch (waybills, price/delivery-date estimates, print-ready links). No local
entity, no local migration.

## Staged migrations

None. No `docs/features/internet-document/migrations/` directory was created — there is nothing
to stage.

## Promote-time convention hint

N/A — no migration to promote. (For reference, `architecture-map.md` §Migrations records the
repo has no migration tool at all: "N/A — no schema, no database.")

## Convention deviations

None — nothing was imposed; the repo's own "no datastore" convention was followed exactly,
matching `address`'s and `counterparty`'s identical outcome.

## Drift findings

None run. Drift detection (step 11) maps domain-layer fields to DB columns; with no DB and no
staged schema, there is nothing to diff against.

## Self-check (step 12)

| Check | Result |
|---|---|
| Naming matches repo convention | N/A — no migration files |
| Down reversibility (every CREATE has a DROP, etc.) | N/A — no migration files |
| FK indexes (every FK has an index) | N/A — no FKs |
| Convention adherence | Pass — followed the repo's documented "no datastore" convention |

## Open items / TBD

None new. `spec.md` §8's five open questions (method-surface re-verification, pagination
metadata, discriminant mechanism, print-link warning strength, batch-delete distinguishability)
are inherited unchanged — none of them is a data-model question.

## Next stage

`/sdd:api internet-document` — **not** skipped, despite the no-schema-change outcome here. `api`'s
own N/A condition is "no contract change" (no new/changed endpoint, event, or public signature),
which does not hold for `internet-document`: it adds 8 new typed public methods, including the two
print methods' non-JSON response shape and the batch-delete per-Ref outcome array. `api` derives
the contract from `sad.md §6` + `spec.md §5` directly, not from this data model.
