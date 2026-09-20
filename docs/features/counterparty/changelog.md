# Changelog — counterparty

## counterparty — typed access to Nova Poshta's Counterparty and ContactPerson domains

**What:** Consuming developers now get a fully typed `counterparty` module: all 11 documented
Nova Poshta Counterparty + ContactPerson API methods (5 read-only lookups + 6 writes — 3 on
counterparties, 3 on their contact persons), plus one convenience method (`findCounterparty`) over
the highest-friction lookup. A saved counterparty resolves to a discriminated `PrivatePerson` /
`Organization` / `ThirdParty` shape, never a single loose type where every type-specific field is
merely optional. Exported from the package root alongside `common` and `address`.

**Why:** A future shipment-creation module needs a sender counterparty `Ref`, a recipient
counterparty `Ref`, and often a contact-person `Ref`, the same way it needs the city/street/
warehouse `Ref`s `address` already resolves. Without this module, consuming developers had to
hand-roll untyped calls against Nova Poshta's Counterparty API. See [spec.md](spec.md) §1/§2. Key
decision: the `update` full-replace guard is three hand-written per-variant payload types rather
than one generic mapped type derived from the discriminated union, so it can't collapse
`PrivatePerson`/`Organization`/`ThirdParty` to their shared fields only — see
[ADR-0001](adr/0001-three-hand-written-per-variant-update-types.md).

**How to use:**

```ts
import { createClient, createCounterpartyModule } from "nova-poshta-lib";

const client = createClient("<apiKey>");
const counterparty = createCounterpartyModule(client);

const matches = await counterparty.findCounterparty("Ivanenko", "Recipient"); // Counterparty[]
const saved = await counterparty.save({
  CounterpartyType: "PrivatePerson",
  FirstName: "Ivan",
  LastName: "Ivanenko",
  Phone: "380001112233",
}); // Counterparty | undefined, discriminated by CounterpartyType
```

**Operational notes:**
- Migration: none — no schema change (`counterparty` holds no local entities).
- Feature flag / config: none.
- Rollback: revert the merge commit; no persisted state to unwind (the library holds no state of
  its own).
- Known limitation carried forward from spec.md §1 decision override: the shared core client
  still doesn't expose Nova Poshta's pagination metadata or success-path warnings, and
  `getCounterparties` is a growing transactional list (not a semi-static reference list like most
  of `address`'s lookups), so silent truncation at one page is a more realistic risk here. Tracked
  as an open question, not fixed in this feature.
- **Still-open item at ship time (spec.md §8 OQ-2):** the wire method name
  `getCounterpartiesCatalog` and the assumption that Nova Poshta's lookup responses carry a real,
  runtime-checkable `CounterpartyType` discriminant are both verified only against the
  `platx/go-nova-poshta` SDK and secondary community sources — Nova Poshta's own documentation
  portal has blocked every automated fetch attempted through spec, design, and this ship pass. No
  `NOVA_POSHTA_TEST_API_KEY` was available in this environment to confirm against a live response.
  Owner: Tech Lead — confirm with one live API call before/at the next release touching this
  method, and update this note + spec.md §8 once done.

**Acceptance criteria delivered:** AC-01 … AC-17 — see [spec.md](spec.md) §5 and the
[review record](_review/review-2026-09-20.md) (PASS, all 7 findings fixed or explicitly deferred
pre-merge).
