# nova-poshta-lib

Typed TypeScript client for the [Nova Poshta API](https://developers.novaposhta.ua/documentation).

## Install

```sh
npm install nova-poshta-lib
```

## Usage

```ts
import { createClient, createAddressModule, createCounterpartyModule } from "nova-poshta-lib";

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
const address = createAddressModule(client);
const counterparty = createCounterpartyModule(client);

const cities = await address.getCities({ FindByString: "Київ" });

const recipient = await counterparty.save({
  CounterpartyType: "PrivatePerson",
  CounterpartyProperty: "Recipient",
  FirstName: "Іван",
  LastName: "Франко",
  Phone: "380501234567",
});
```

> `common`, `address`, and `counterparty` are the domain modules shipped so far — more
> (internet-document, …) are added incrementally under `src/modules/`.

## Development

```sh
npm install
npm run build   # tsup — dual ESM+CJS build to dist/
npm test        # vitest run
npm run lint    # eslint
```

Integration tests under `test/integration/` hit the real Nova Poshta API and are skipped
automatically unless `NOVA_POSHTA_TEST_API_KEY` is set.
