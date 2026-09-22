import { describe, expect, it } from "vitest";
import { createClient } from "../../src/index.js";
import { createInternetDocumentModule } from "../../src/modules/internet-document/index.js";
import { createScanSheetModule } from "../../src/modules/scan-sheet/index.js";

const apiKey = process.env.NOVA_POSHTA_TEST_API_KEY;

// internet-document's own save() needs a full sender/recipient/warehouse fixture set that its own
// integration suite doesn't seed (test/integration/internet-document.test.ts, "Scope note"); this
// module's spec.md "Test data" section requires exactly that save() call to obtain a throwaway
// waybill Ref, so this suite brings its own env vars for it rather than fabricating Refs.
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

/** DD.MM.YYYY — matches internet-document's own DateTime convention (test/unit/modules/internet-
 *  document.test.ts), not scan-sheet's own YYYY-MM-DD Date field below. */
function todayAsSlashDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${now.getFullYear()}`;
}

/** YYYY-MM-DD, Europe/Kyiv calendar date — matches scan-sheet's own insertDocuments Date
 *  convention (src/modules/scan-sheet/index.ts's kyivTodayDateString, and its unit-test
 *  fixtures); computed via Intl.DateTimeFormat, not the host machine's local clock, so this test
 *  agrees with the module under test regardless of which timezone CI runs in
 *  (review-2026-09-22.md finding 6). */
function todayAsIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Opt-in only, per CLAUDE.md: hits the real Nova Poshta API, skipped automatically when
// NOVA_POSHTA_TEST_API_KEY or any of the waybill-fixture env vars above is absent — never blocks CI
// without all of them configured (spec.md §5 AC-01/AC-04/AC-06/AC-09, "Test data" — creates its own
// throwaway waybill via internet-document's save() rather than depending on a pre-existing one).
describe.skipIf(!apiKey || !hasWaybillFixtures)(
  "scan-sheet module — integration (AC-01, AC-04, AC-06, AC-09)",
  () => {
    it(
      "inserts a throwaway waybill into a new scan sheet, reads it back by Ref, lists it, then " +
        "cleans up both the scan sheet and the waybill",
      async () => {
        const client = createClient(apiKey as string);
        const internetDocument = createInternetDocumentModule(client);
        const scanSheet = createScanSheetModule(client);

        const waybill = await internetDocument.save({
          ServiceType: "WarehouseWarehouse",
          PayerType: "Sender",
          PaymentMethod: "Cash",
          DateTime: todayAsSlashDate(),
          Weight: 0.1,
          SeatsAmount: 1,
          Description: "scan-sheet integration smoke test — throwaway waybill",
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
        const waybillRef = (waybill as { Ref: string }).Ref;
        expect(typeof waybillRef).toBe("string");

        let scanSheetRef = "";
        try {
          // AC-01: no existing scan-sheet Ref supplied — Nova Poshta creates a new sheet.
          const inserted = await scanSheet.insertDocuments({
            DocumentRefs: [waybillRef],
            Date: todayAsIsoDate(),
          });
          expect(Array.isArray(inserted)).toBe(true);
          const [insertedItem] = inserted;
          expect(insertedItem).toBeDefined();
          scanSheetRef = (insertedItem as { Ref: string }).Ref;
          expect(typeof scanSheetRef).toBe("string");
          expect(scanSheetRef.length).toBeGreaterThan(0);

          // AC-04: retrieve the same sheet's typed detail by its own Ref.
          const detail = await scanSheet.getScanSheet({ Ref: scanSheetRef, CounterpartyRef: "" });
          expect(Array.isArray(detail)).toBe(true);
          for (const record of detail) {
            expect(typeof record.Ref).toBe("string");
            expect(typeof record.Sender).toBe("string");
            expect(typeof record.SenderAddress).toBe("string");
          }

          // AC-06: the newly created sheet shows up in the full list.
          const list = await scanSheet.getScanSheetList();
          expect(Array.isArray(list)).toBe(true);
          expect(list.some((item) => item.Ref === scanSheetRef)).toBe(true);
        } finally {
          // Cleanup boundary (spec.md "Test data"): this module's own deleteScanSheet, plus
          // internet-document's delete for the throwaway waybill — both at the end of this run.
          if (scanSheetRef) {
            // AC-09: deleteScanSheet against the Ref this test created.
            await scanSheet.deleteScanSheet({ ScanSheetRefs: [scanSheetRef] });
          }
          await internetDocument.delete({ Ref: waybillRef });
        }
      },
    );
  },
);
