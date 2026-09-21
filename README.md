# nova-poshta-lib

Typed TypeScript client for the [Nova Poshta API](https://developers.novaposhta.ua/documentation).

## Install

```sh
npm install nova-poshta-lib
```

## Usage

```ts
import {
  createClient,
  createAddressModule,
  createCounterpartyModule,
  createInternetDocumentModule,
} from "nova-poshta-lib";

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
const address = createAddressModule(client);
const counterparty = createCounterpartyModule(client);
const internetDocument = createInternetDocumentModule(client);

const cities = await address.getCities({ FindByString: "Київ" });

const recipient = await counterparty.save({
  CounterpartyType: "PrivatePerson",
  CounterpartyProperty: "Recipient",
  FirstName: "Іван",
  LastName: "Франко",
  Phone: "380501234567",
});

const waybill = await internetDocument.save({
  ServiceType: "WarehouseWarehouse",
  CargoType: "Parcel",
  PayerType: "Sender",
  PaymentMethod: "Cash",
  DateTime: "21.09.2026",
  Weight: 1,
  SeatsAmount: 1,
  Description: "Books",
  Cost: 500,
  CitySender: "<city ref>",
  Sender: "<sender counterparty ref>",
  SenderAddress: "<sender warehouse ref>",
  ContactSender: "<contact person ref>",
  SendersPhone: "380501234567",
  CityRecipient: "<city ref>",
  Recipient: recipient!.Ref!,
  ContactRecipient: "<recipient contact person ref>",
  RecipientsPhone: "380501234567",
  RecipientAddress: "<recipient warehouse ref>",
});

// printDocument/printMarkings return a print-ready link that embeds your own API key —
// treat it exactly like the key itself (never log, email, or render it on a public page).
// This library performs no redaction, scoping, or expiry of that link.
const printLink = await internetDocument.printDocument({ Documents: [waybill!.Ref] });
```

> `common`, `address`, `counterparty`, and `internet-document` are the domain modules shipped so
> far — more are added incrementally under `src/modules/`.

## Development

```sh
npm install
npm run build   # tsup — dual ESM+CJS build to dist/
npm test        # vitest run
npm run lint    # eslint
```

Integration tests under `test/integration/` hit the real Nova Poshta API and are skipped
automatically unless `NOVA_POSHTA_TEST_API_KEY` is set.
