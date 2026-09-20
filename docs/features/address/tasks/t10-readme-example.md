---
id: T10
title: "Update README usage example"
layer: "docs"
deps: ["T7"]
acs: ["AC-13"]
files_hint: ["README.md"]
owner: "associate2coder"
estimate: "S"
status: "todo"
---

# T10 — Update README usage example

## Why

`README.md`'s current usage example is a placeholder comment ("call a domain module method once
one is implemented, e.g. `client.request(\"Address\", \"getCities\")`") — now that `address` ships,
it should demonstrate the real typed import (US-09 discoverability, the doc-facing half of AC-13).

## What

Replace the placeholder block in `README.md`'s Usage section with:

```ts
import { createClient, createAddressModule } from "nova-poshta-lib";

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
const address = createAddressModule(client);

const cities = await address.getCities({ FindByString: "Київ" });
```

Drop the "scaffolded skeleton" callout line about domain modules being added incrementally, or
adjust it to reflect `common` + `address` as the two now-shipped modules.

## Definition of Done

- [ ] README's Usage section shows a real, type-checked `address` call — no placeholder comment.
- [ ] The example compiles if pasted into a scratch `.ts` file against the built package (spot-check,
      not a CI-enforced test).

## Notes

Small, docs-only — no code changes. Safe to run in parallel with T8/T9 once T7 lands.
