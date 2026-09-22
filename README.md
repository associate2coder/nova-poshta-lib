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
  createTrackingDocumentModule,
} from "nova-poshta-lib";

const client = createClient(process.env.NOVA_POSHTA_API_KEY!);
const address = createAddressModule(client);
const counterparty = createCounterpartyModule(client);
const internetDocument = createInternetDocumentModule(client);
const trackingDocument = createTrackingDocumentModule(client);

const cities = await address.getCities({ FindByString: "Київ" });

const recipient = await counterparty.save({
  CounterpartyType: "PrivatePerson",
  CounterpartyProperty: "Recipient",
  FirstName: "Іван",
  LastName: "Франко",
  Phone: "380501234567",
});

// save() can resolve undefined, or a record with no Ref, when Nova Poshta reports success with no
// record (AC-05) — always check before using the result, rather than asserting it's present.
if (!recipient?.Ref) {
  throw new Error("Nova Poshta reported success but returned no counterparty record");
}

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
  Recipient: recipient.Ref,
  ContactRecipient: "<recipient contact person ref>",
  RecipientsPhone: "380501234567",
  RecipientAddress: "<recipient warehouse ref>",
});

// save() can resolve undefined when Nova Poshta reports success with no record (AC-05) — always
// check before using the result, rather than asserting it's present.
if (waybill) {
  // printDocument/printMarkings return a print-ready link that embeds your own API key —
  // treat it exactly like the key itself (never log, email, or render it on a public page).
  // This library performs no redaction, scoping, or expiry of that link. PROVISIONAL: the
  // exact URL-construction mechanism is contested across sources — see PrintLinkPayload's
  // doc comment before relying on this in production.
  const printLink = await internetDocument.printDocument({ Documents: [waybill.Ref] });
}

// delete() removes exactly one waybill per call; deleteBatch() loops over several client-side —
// it is not a single Nova Poshta batch call (see DeleteInternetDocumentPayload's doc comment).
await internetDocument.delete({ Ref: "<waybill ref>" });
await internetDocument.deleteBatch({ Documents: ["<waybill ref 1>", "<waybill ref 2>"] });

// tracking-document works for any waybill number — one this library created, one imported from
// Nova Poshta's own portal, or one a third party shipped — with no dependency on internet-document.
const status = await trackingDocument.getDocumentStatus("20400048799000");

// A "not found" or "removed" waybill (StatusCode 2 or 3) resolves as a normal status record, not
// an error (AC-06) — check StatusCode yourself rather than wrapping this call in try/catch to
// detect it. getDocumentStatus resolves undefined only when zero returned records match the
// requested waybill number, which is distinct from AC-06's "not found" status.
if (status) {
  console.log(status.Status, status.StatusCode);
}
```

> `common`, `address`, `counterparty`, `internet-document`, and `tracking-document` are the domain
> modules shipped so far — more are added incrementally under `src/modules/`.

## Development

```sh
npm install
npm run build   # tsup — dual ESM+CJS build to dist/
npm test        # vitest run
npm run lint    # eslint
```

Integration tests under `test/integration/` hit the real Nova Poshta API and are skipped
automatically unless `NOVA_POSHTA_TEST_API_KEY` is set.
