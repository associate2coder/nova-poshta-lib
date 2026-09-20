# Changelog — address

## address — typed access to Nova Poshta's Address domain

**What:** Consuming developers now get a fully typed `address` module: all 11 documented Nova
Poshta Address API methods (8 read-only lookups + 3 saved-address writes), plus one convenience
method (`findCityByName`) over the highest-friction lookup. Exported from the package root
alongside `common`.

**Why:** Every future domain module that creates or manages something location-bound (a shipment,
a counterparty's registered address) needs `Ref` values — city, street, warehouse — that only
`address`'s lookups can resolve from human-readable input. Without this module, consuming
developers had to hand-roll untyped calls or hardcode `Ref`s. See
[spec.md](spec.md) §1/§2. Key decision: write methods return `T | undefined` rather than throwing
when Nova Poshta reports success with an empty result — see
[ADR-0001](adr/0001-return-undefined-on-empty-write-response.md).

**How to use:**

```ts
import { createClient, createAddressModule } from "nova-poshta-lib";

const client = createClient("<apiKey>");
const address = createAddressModule(client);

const cities = await address.findCityByName("Kyiv"); // City[]
const saved = await address.save({
  CounterpartyRef: "<ref>",
  StreetRef: "<ref>",
  BuildingNumber: "12",
}); // SavedAddress | undefined
```

**Operational notes:**
- Migration: none — no schema change (`data-model.md`: legitimate no-schema-change).
- Feature flag / config: none.
- Rollback: revert the merge commit; no persisted state to unwind (the library holds no state of
  its own).
- Known limitation carried forward from spec.md §1 Decision override: the shared core client
  (`src/client.ts`) still doesn't expose Nova Poshta's pagination metadata or success-path
  warnings — large lookup results can silently truncate at one page, and a `save`/`update`
  warning (e.g. a normalized building number) isn't surfaced. Tracked as an open question, not
  fixed in this feature.

**Acceptance criteria delivered:** AC-01 … AC-13 — see [spec.md](spec.md) §5 and the
[review record](_review/review-2026-09-20.md) (PASS, all stage-1 findings fixed pre-merge).
