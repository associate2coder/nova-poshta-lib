# nova-poshta-lib

Typed TypeScript client for the [Nova Poshta API](https://developers.novaposhta.ua/documentation).

## Install

```sh
npm install nova-poshta-lib
```

## Usage

```ts
import { createClient } from "nova-poshta-lib";

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);

// Example: call a domain module method once one is implemented, e.g.
// const cities = await client.request("Address", "getCities");
```

> This is a scaffolded skeleton — domain modules (address, counterparty, internet-document, …)
> are added incrementally under `src/modules/`.

## Development

```sh
npm install
npm run build   # tsup — dual ESM+CJS build to dist/
npm test        # vitest run
npm run lint    # eslint
```

Integration tests under `test/integration/` hit the real Nova Poshta API and are skipped
automatically unless `NOVA_POSHTA_TEST_API_KEY` is set.
