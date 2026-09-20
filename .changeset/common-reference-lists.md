---
"nova-poshta-lib": minor
---

Add the `common` domain module — typed access to all 15 Nova Poshta reference/lookup lists
(payment forms, cargo types, ownership forms, pallets, time intervals, counterparty types, and
more), each exposed as its own discoverable method via `createCommonModule`.

**Why:** every consuming developer building requests against other parts of the Nova Poshta API
needs valid values for these shared reference fields (e.g. `PayerType`, `OwnershipForm`); previously
the only options were hardcoding values from Nova Poshta's raw docs or an untyped call through the
core client. `common` is the first domain module built specifically so later modules (address,
counterparty, internet-document) have a single authoritative source for these values instead of
each inventing its own handling — see
[spec](../docs/features/common/spec.md) and
[ADR-0002](../docs/adr/0002-modular-domain-layout-dual-build.md).

**How to use:**

```ts
import { createClient, createCommonModule } from "nova-poshta-lib";

const client = createClient({ apiKey: "..." });
const common = createCommonModule(client);

const paymentForms = await common.getPaymentForms();
const cargoDescriptions = await common.getCargoDescriptionList({ FindByString: "документ" });
```

Every documented field on a reference-list record is typed as optional — Nova Poshta's real-world
responses are inconsistent at the per-record level, and this is represented honestly rather than
promising data that isn't really there. A response that isn't a navigable list at all (not
array-shaped), an unreachable network, or a declined request all raise the library's standard
`NovaPoshtaApiError` — never a silent empty/partial result.

**Operational notes:** no migration, no new config/flags. Pure additive surface — `createCommonModule`
and its 15 methods, plus their request/response types, are newly exported from the package root.
