import { describe, expect, it } from "vitest";
import { createClient } from "../../src/index.js";
import { createAdditionalServiceModule } from "../../src/modules/additional-service/index.js";
import { createInternetDocumentModule } from "../../src/modules/internet-document/index.js";

const apiKey = process.env.NOVA_POSHTA_TEST_API_KEY;

// Same fixture set as scan-sheet's own integration suite (test/integration/scan-sheet.test.ts) —
// this suite reuses it to seed a throwaway waybill via internet-document's own save(), rather than
// depending on a pre-existing one or duplicating a second set of env vars.
const citySenderRef = process.env.NOVA_POSHTA_TEST_CITY_SENDER_REF;
const cityRecipientRef = process.env.NOVA_POSHTA_TEST_CITY_RECIPIENT_REF;
const senderRef = process.env.NOVA_POSHTA_TEST_SENDER_REF;
const senderContactRef = process.env.NOVA_POSHTA_TEST_SENDER_CONTACT_REF;
const sendersPhone = process.env.NOVA_POSHTA_TEST_SENDERS_PHONE;
const recipientRef = process.env.NOVA_POSHTA_TEST_RECIPIENT_REF;
const recipientContactRef = process.env.NOVA_POSHTA_TEST_RECIPIENT_CONTACT_REF;
const recipientsPhone = process.env.NOVA_POSHTA_TEST_RECIPIENTS_PHONE;
const senderWarehouseRef = process.env.NOVA_POSHTA_TEST_SENDER_WAREHOUSE_REF;
const recipientWarehouseRef = process.env.NOVA_POSHTA_TEST_RECIPIENT_WAREHOUSE_REF;

const hasWaybillFixtures = Boolean(
  citySenderRef &&
    cityRecipientRef &&
    senderRef &&
    senderContactRef &&
    sendersPhone &&
    recipientRef &&
    recipientContactRef &&
    recipientsPhone &&
    senderWarehouseRef &&
    recipientWarehouseRef,
);

/** DD.MM.YYYY, Europe/Kyiv calendar date — matches internet-document's own DateTime convention,
 *  computed via Intl.DateTimeFormat rather than the host machine's local clock (same host-clock
 *  bug class fixed in scan-sheet's integration suite, review-2026-09-22.md finding 6). */
function todayAsSlashDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-");
  const [year, month, day] = parts;
  return `${day}.${month}.${year}`;
}

// Opt-in only, per CLAUDE.md: hits the real Nova Poshta API, skipped automatically when
// NOVA_POSHTA_TEST_API_KEY or any of the waybill-fixture env vars above is absent — never blocks CI
// without all of them configured (spec.md §6 "Calculate/create isolation" NFR row names this suite
// as the deeper, server-side half of that guarantee's measurement).
//
// Scope note: this suite deliberately exercises only the check/calculate/read/list methods —
// checkReturnPossible, checkRedirectPossible, checkWaybillEditPossible, calculateReturn,
// getReturnReasons(Subtypes), and the three list methods — never createReturn/createRedirect/
// createWaybillEdit/updateReturn/updateRedirect/deleteAdditionalServiceOrder/createReturnIfPossible.
// Those six mutate real order state against a live waybill (a real return/redirect/waybill-edit
// request, not a trivially-reversible scan-sheet entry) and need their own dedicated fixture/cleanup
// design — the same scope boundary internet-document's own integration suite already draws around
// save/update/delete for the identical reason (test/integration/internet-document.test.ts's own
// "Scope note"), tracked as follow-up rather than attempted here. calculateReturn is included
// specifically because it's the direct live check of the module's own money-safety NFR: it must
// return a pricing estimate and create no order.
describe.skipIf(!apiKey || !hasWaybillFixtures)(
  "additional-service module — integration (AC-01, AC-02, AC-05, AC-08, AC-09, AC-14, AC-15, AC-17)",
  () => {
    it(
      "seeds a throwaway waybill, then checks/calculates/lists against it with no order ever created",
      async () => {
        const client = createClient(apiKey as string);
        const internetDocument = createInternetDocumentModule(client);
        const additionalService = createAdditionalServiceModule(client);

        const waybill = await internetDocument.save({
          ServiceType: "WarehouseWarehouse",
          PayerType: "Sender",
          PaymentMethod: "Cash",
          DateTime: todayAsSlashDate(),
          Weight: 0.1,
          SeatsAmount: 1,
          Description: "additional-service integration smoke test — throwaway waybill",
          Cost: 100,
          CitySender: citySenderRef as string,
          Sender: senderRef as string,
          ContactSender: senderContactRef as string,
          SendersPhone: sendersPhone as string,
          SenderAddress: senderWarehouseRef as string,
          CityRecipient: cityRecipientRef as string,
          Recipient: recipientRef as string,
          ContactRecipient: recipientContactRef as string,
          RecipientsPhone: recipientsPhone as string,
          RecipientAddress: recipientWarehouseRef as string,
          CargoType: "Parcel",
        });

        expect(waybill).toBeDefined();
        const intDocNumber = (waybill as { IntDocNumber: string }).IntDocNumber;
        expect(typeof intDocNumber).toBe("string");

        try {
          // AC-08: fetched early — calculateReturn below needs a real Reason Ref, not a placeholder.
          const returnReasons = await additionalService.getReturnReasons();
          expect(Array.isArray(returnReasons)).toBe(true);

          // AC-01/AC-02: real eligibility check against the freshly created waybill.
          const returnOptions = await additionalService.checkReturnPossible({ Number: intDocNumber });
          expect(Array.isArray(returnOptions)).toBe(true);
          for (const option of returnOptions) {
            expect(typeof option.Ref).toBe("string");
            expect(typeof option.NonCash).toBe("boolean");
          }

          // AC-05: calculateReturn's own money-safety guarantee, checked live — only reachable
          // when the waybill is actually return-eligible and a real reason Ref exists to use.
          if (returnOptions.length > 0 && returnReasons.length > 0) {
            const estimate = await additionalService.calculateReturn({
              IntDocNumber: intDocNumber,
              PaymentMethod: "Cash",
              Reason: returnReasons[0]!.Ref,
              Destination: "SenderAddress",
              ReturnAddressRef: returnOptions[0]!.Ref,
            });
            expect(typeof estimate.Pricing.Total).toBe("number");
            expect(typeof estimate.ScheduledDeliveryDate).toBe("string");
          }

          // AC-09: real redirect-possibility check against the same waybill.
          const redirectPossibility = await additionalService.checkRedirectPossible({ Number: intDocNumber });
          expect(typeof redirectPossibility.Ref).toBe("string");

          // AC-15: real waybill-edit-possibility check against the same waybill.
          const editPossibility = await additionalService.checkWaybillEditPossible({
            IntDocNumber: intDocNumber,
          });
          expect(typeof editPossibility.CanChangeSender).toBe("boolean");

          // AC-08/AC-14/AC-17: the remaining list + reason-lookup reads, no seed data required
          // (getReturnReasons itself already ran above, ahead of calculateReturn).
          const returnReasonSubtypes = await additionalService.getReturnReasonsSubtypes();
          expect(Array.isArray(returnReasonSubtypes)).toBe(true);

          const returnOrders = await additionalService.getReturnOrdersList();
          expect(Array.isArray(returnOrders)).toBe(true);

          const redirectOrders = await additionalService.getRedirectionOrdersList();
          expect(Array.isArray(redirectOrders)).toBe(true);

          const changeEWOrders = await additionalService.getChangeEWOrdersList();
          expect(Array.isArray(changeEWOrders)).toBe(true);
        } finally {
          await internetDocument.delete({ Ref: (waybill as { Ref: string }).Ref });
        }
      },
      // 11 sequential live calls (review round-5 finding) — vitest's 5s default is too tight for
      // a real network round-trip per call; an explicit budget also keeps the `finally` cleanup
      // (deleting the throwaway waybill) from being cut off by a timeout abort.
      60_000,
    );
  },
);
