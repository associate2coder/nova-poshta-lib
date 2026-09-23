import { describe, expect, it } from "vitest";
import type {
  ChangeEWOrderListItem,
  CheckRedirectEditPossiblePayload,
  CheckRedirectPossiblePayload,
  CheckReturnEditPossiblePayload,
  CheckReturnEditPossibleResult,
  CheckReturnPossiblePayload,
  CheckWaybillEditPossiblePayload,
  CreateRedirectPayload,
  CreateReturnIfPossiblePayload,
  CreateReturnPayload,
  CreateReturnToNewAddressPayload,
  CreateReturnToNewWarehousePayload,
  CreateReturnToSenderAddressPayload,
  CreateWaybillEditPayload,
  DeleteAdditionalServiceOrderPayload,
  DeletedAdditionalServiceOrder,
  OrderListFilters,
  OrderPricingEstimate,
  PaymentMethod,
  RedirectOrderListItem,
  RedirectPossibility,
  ReturnDestination,
  ReturnEditInfo,
  ReturnEditOption,
  ReturnOrderListItem,
  ReturnReason,
  ReturnReasonSubtype,
  ReturnReasonSubtypeFilters,
  SavedRedirectOrder,
  SavedReturnOrder,
  SavedWaybillEditOrder,
  UpdateRedirectPayload,
  UpdateReturnPayload,
  WaybillEditPossibility,
} from "../../../src/types/additional-service.js";

// T1 (domain layer, AC-04, AC-16): src/types/additional-service.ts doesn't exist yet. This is a
// type-level / compile check, following scan-sheet.test.ts / internet-document.test.ts's precedent
// of constructing fixture objects typed against each exported interface — a missing export or a
// wrong field name fails to compile/run, and `// @ts-expect-error` lines assert the inverse: that a
// specific mistake is *rejected* at compile time. Field sets are copied field-for-field from
// docs/features/additional-service/contracts/public-api.md §2/§3. `@ts-expect-error` lines only bite
// under `npm run typecheck` (`tsc --noEmit`) — vitest itself (esbuild-transpiled, no type-checking)
// only proves these fixtures exist and hold their runtime values.

const returnCommon = {
  IntDocNumber: "waybill-1",
  PaymentMethod: "Cash" as PaymentMethod,
  Reason: "reason-ref-1",
} as const;

describe("additional-service domain types (T1)", () => {
  describe("AC-04: CreateReturnPayload is a 3-variant Destination-discriminated union", () => {
    it("each variant accepts only its own destination fields as a fresh object literal", () => {
      const senderAddress: CreateReturnToSenderAddressPayload = {
        ...returnCommon,
        Destination: "SenderAddress",
        ReturnAddressRef: "return-address-ref-1",
      };
      const newAddress: CreateReturnToNewAddressPayload = {
        ...returnCommon,
        Destination: "NewAddress",
        RecipientSettlement: "settlement-1",
        RecipientSettlementStreet: "street-1",
        BuildingNumber: "10",
      };
      const newWarehouse: CreateReturnToNewWarehousePayload = {
        ...returnCommon,
        Destination: "NewWarehouse",
        RecipientWarehouse: "warehouse-ref-1",
      };

      const wrongSender: CreateReturnToSenderAddressPayload = {
        ...returnCommon,
        Destination: "SenderAddress",
        ReturnAddressRef: "return-address-ref-2",
        // @ts-expect-error — RecipientSettlement belongs to the NewAddress variant, not SenderAddress.
        RecipientSettlement: "settlement-2",
      };

      const wrongWarehouse: CreateReturnToNewWarehousePayload = {
        ...returnCommon,
        Destination: "NewWarehouse",
        RecipientWarehouse: "warehouse-ref-2",
        // @ts-expect-error — ReturnAddressRef belongs to the SenderAddress variant, not NewWarehouse.
        ReturnAddressRef: "return-address-ref-3",
      };

      // AC-04: omitting a required field for the tagged variant is also a compile-time error, not
      // just mixing in a foreign field (mirrors internet-document.test.ts's "missingRequiredField"
      // case, which guards against TS's excess-property check masking a missing-property error).
      // @ts-expect-error — RecipientSettlementStreet/BuildingNumber are required for NewAddress and
      // were omitted.
      const missingRequired: CreateReturnToNewAddressPayload = {
        ...returnCommon,
        Destination: "NewAddress",
        RecipientSettlement: "settlement-3",
      };

      const union: CreateReturnPayload[] = [senderAddress, newAddress, newWarehouse];

      expect(union).toHaveLength(3);
      expect(wrongSender.Destination).toBe("SenderAddress");
      expect(wrongWarehouse.Destination).toBe("NewWarehouse");
      expect(missingRequired.Destination).toBe("NewAddress");
    });

    it("rejects mixing variants when assembled field-by-field in a variable, not just as a fresh object literal (AC-04, hard case)", () => {
      const senderAddress: CreateReturnToSenderAddressPayload = {
        ...returnCommon,
        Destination: "SenderAddress",
        ReturnAddressRef: "return-address-ref-4",
      };
      // Optional common fields set field-by-field, after construction — proves the variant stays
      // narrow even once it's a plain mutable variable, not a fresh literal.
      senderAddress.Note = "customer note";
      senderAddress.SubtypeReason = "subtype-ref-1";

      // @ts-expect-error — RecipientSettlement belongs to the NewAddress variant; assigning it onto
      // an already-constructed SenderAddress-typed variable (not inside a fresh object literal) must
      // still fail to compile.
      senderAddress.RecipientSettlement = "settlement-4";

      const newAddress: CreateReturnToNewAddressPayload = {
        ...returnCommon,
        Destination: "NewAddress",
        RecipientSettlement: "settlement-5",
        RecipientSettlementStreet: "street-5",
        BuildingNumber: "11",
      };
      // @ts-expect-error — ReturnAddressRef belongs to the SenderAddress variant, not NewAddress,
      // even assigned field-by-field post-construction.
      newAddress.ReturnAddressRef = "return-address-ref-5";
      // @ts-expect-error — RecipientWarehouse belongs to the NewWarehouse variant, not NewAddress.
      newAddress.RecipientWarehouse = "warehouse-ref-3";

      const newWarehouse: CreateReturnToNewWarehousePayload = {
        ...returnCommon,
        Destination: "NewWarehouse",
        RecipientWarehouse: "warehouse-ref-4",
      };
      // @ts-expect-error — RecipientSettlementStreet belongs to the NewAddress variant, not
      // NewWarehouse, even assigned field-by-field post-construction.
      newWarehouse.RecipientSettlementStreet = "street-6";

      expect(senderAddress.Destination).toBe("SenderAddress");
      expect(newAddress.Destination).toBe("NewAddress");
      expect(newWarehouse.Destination).toBe("NewWarehouse");
    });

    it("the union type itself (CreateReturnPayload) rejects a wrong-variant field inside a Destination-narrowed branch, mirroring internet-document's F2 call-site guard (AC-04)", () => {
      function buildReturn(destination: ReturnDestination): CreateReturnPayload {
        if (destination === "NewAddress") {
          // @ts-expect-error — RecipientWarehouse belongs to the NewWarehouse variant; mixing it into
          // a NewAddress-tagged object literal fails to compile even when the declared type is the
          // union (CreateReturnPayload), not the named variant alone — the whole literal satisfies no
          // variant once RecipientWarehouse is `never` on NewAddress (review round-3 finding).
          const payload: CreateReturnPayload = {
            ...returnCommon,
            Destination: "NewAddress",
            RecipientSettlement: "settlement-6",
            RecipientSettlementStreet: "street-7",
            BuildingNumber: "12",
            RecipientWarehouse: "warehouse-ref-5",
          };
          return payload;
        }
        if (destination === "NewWarehouse") {
          const payload: CreateReturnPayload = {
            ...returnCommon,
            Destination: "NewWarehouse",
            RecipientWarehouse: "warehouse-ref-6",
          };
          return payload;
        }
        const payload: CreateReturnPayload = {
          ...returnCommon,
          Destination: "SenderAddress",
          ReturnAddressRef: "return-address-ref-6",
        };
        return payload;
      }

      expect(buildReturn("SenderAddress").Destination).toBe("SenderAddress");
      expect(buildReturn("NewWarehouse").Destination).toBe("NewWarehouse");
    });

    it("SavedReturnOrder matches createReturn's confirmed response shape", () => {
      const saved: SavedReturnOrder = { Number: "1234567", Ref: "return-order-ref-1" };
      expect(saved.Number).toBe("1234567");
    });
  });

  describe("AC-16: WaybillEditPossibility carries all 11 named Can... flags, informational only", () => {
    it("has all 11 Can... boolean flags plus the accompanying context fields", () => {
      const possibility: WaybillEditPossibility = {
        CanChangeSender: true,
        CanChangeRecipient: true,
        CanChangePayerTypeOrPaymentMethod: false,
        CanChangeBackwardDeliveryDocuments: false,
        CanChangeBackwardDeliveryMoney: false,
        CanChangeCash2Card: false,
        CanChangeBackwardDeliveryOther: false,
        CanChangeAfterpaymentType: false,
        CanChangeLiftingOnFloor: false,
        CanChangeLiftingOnFloorWithElevator: false,
        CanChangeFillingWarranty: false,
        SenderCounterparty: "sender-counterparty-ref-1",
        ContactPersonSender: "contact-sender-ref-1",
        SenderPhone: "380500000000",
        RecipientCounterparty: "recipient-counterparty-ref-1",
        ContactPersonRecipient: "contact-recipient-ref-1",
        RecipientPhone: "380500000001",
        PayerType: "Sender",
        PaymentMethod: "Cash",
      };

      const flagNames: (keyof WaybillEditPossibility)[] = [
        "CanChangeSender",
        "CanChangeRecipient",
        "CanChangePayerTypeOrPaymentMethod",
        "CanChangeBackwardDeliveryDocuments",
        "CanChangeBackwardDeliveryMoney",
        "CanChangeCash2Card",
        "CanChangeBackwardDeliveryOther",
        "CanChangeAfterpaymentType",
        "CanChangeLiftingOnFloor",
        "CanChangeLiftingOnFloorWithElevator",
        "CanChangeFillingWarranty",
      ];

      expect(flagNames).toHaveLength(11);
      for (const flagName of flagNames) {
        expect(typeof possibility[flagName]).toBe("boolean");
      }
      expect(possibility.CanChangeSender).toBe(true);
    });

    it("CheckWaybillEditPossiblePayload/CreateWaybillEditPayload/SavedWaybillEditOrder/ChangeEWOrderListItem match spec.md §1 rows 15-17", () => {
      const checkPayload: CheckWaybillEditPossiblePayload = { IntDocNumber: "waybill-9" };
      const createPayload: CreateWaybillEditPayload = {
        IntDocNumber: "waybill-9",
        PaymentMethod: "Cash",
        SenderContactName: "Sender Contact",
        SenderPhone: "380500000002",
        Recipient: "recipient-counterparty-ref-2",
        RecipientContactName: "Recipient Contact",
        RecipientPhone: "380500000003",
        PayerType: "Sender",
      };
      const saved: SavedWaybillEditOrder = { Number: "1234568", Ref: "waybill-edit-ref-1" };
      const listItem: ChangeEWOrderListItem = {
        OrderRef: "waybill-edit-ref-1",
        OrderNumber: "1234568",
        OrderStatus: "Прийнято",
        DocumentNumber: "waybill-9",
        DateTime: "22.09.2026 10:00:00",
        BeforeChangeSenderCounterparty: "old-sender-counterparty-ref",
        AfterChangeChangeSenderCounterparty: "new-sender-counterparty-ref",
        Cost: "0",
        BeforeChangeSenderPhone: "380500000000",
        AfterChangeSenderPhone: "380500000002",
      };

      expect(checkPayload.IntDocNumber).toBe("waybill-9");
      expect(createPayload.PayerType).toBe("Sender");
      expect(saved.Ref).toBe("waybill-edit-ref-1");
      // wire's own (misspelled) field name — not a typo in this test, see public-api.md §3.3.
      expect(listItem.AfterChangeChangeSenderCounterparty).toBe("new-sender-counterparty-ref");
    });
  });

  describe("public-api.md §10's items — resolved by the 2026-09-23 official-docs capture (review round 1), except item 5", () => {
    it("1. ReturnAddressOption.Ref and CreateReturnToSenderAddressPayload.ReturnAddressRef are both plain, independently-typed strings — mapping now confirmed by official docs, but no shared branding is introduced", () => {
      const option: CheckReturnPossiblePayload = { Number: "waybill-10" };
      const senderAddress: CreateReturnToSenderAddressPayload = {
        IntDocNumber: "waybill-10",
        PaymentMethod: "Cash",
        Reason: "reason-ref-2",
        Destination: "SenderAddress",
        ReturnAddressRef: "return-address-ref-7",
      };

      expect(option.Number).toBe("waybill-10");
      expect(typeof senderAddress.ReturnAddressRef).toBe("string");
    });

    it("2. CheckReturnEditPossiblePayload.Address is a plain string (confirmed by official docs, spec.md §1, 2026-09-23) — was typed unknown before this round's fix", () => {
      const payload: CheckReturnEditPossiblePayload = {
        Ref: "return-order-ref-2",
        Address: "м. Київ, площа Харківська, 10",
      };

      const withObjectAddress: CheckReturnEditPossiblePayload = {
        Ref: "return-order-ref-2",
        // @ts-expect-error — Address no longer accepts a structured object now that it's confirmed a string.
        Address: { City: "Kyiv", Street: "Khreshchatyk" },
      };

      expect(payload.Ref).toBe("return-order-ref-2");
      expect(payload.Address).toBe("м. Київ, площа Харківська, 10");
      expect(withObjectAddress.Ref).toBe("return-order-ref-2");

      const result: CheckReturnEditPossibleResult = {
        options: [
          {
            Type: "CustomReturnAddress",
            NonCash: false,
            City: "Kyiv",
            Counterparty: "ACME LLC",
            ContactPerson: "Jane Doe",
            Address: "1 Khreshchatyk St",
            Phone: "380500000000",
            Ref: "return-edit-option-ref-1",
          },
          {
            Type: "OrderReturn",
            NonCash: false,
            City: "Kyiv",
            Counterparty: "ACME LLC",
            ContactPerson: "Jane Doe",
            Address: "1 Khreshchatyk St",
            Phone: "380500000000",
            Ref: "return-edit-option-ref-2",
          },
        ],
        info: { PayerTypeDefault: "Sender", Number: "1234569" } as ReturnEditInfo,
      };
      expect(result.options).toHaveLength(2);

      // ReturnEditOption.Type is widened to `string`, not a closed 2-member union (review round-4
      // finding: the docs only ever showed these two values together in one example, with nothing
      // confirming that's the complete set) — a value the docs have never shown must still compile,
      // proving this isn't still the old closed union in disguise.
      const futureType: ReturnEditOption["Type"] = "SomeFutureValueNotYetSeenInDocs";
      expect(futureType).toBe("SomeFutureValueNotYetSeenInDocs");

      // info is optional — official docs wrap it in a single-element array, unwrapped by the module;
      // an envelope that omits it resolves undefined rather than a forced cast (review 2026-09-23 finding 4)
      const resultWithoutInfo: CheckReturnEditPossibleResult = { options: [] };
      expect(resultWithoutInfo.info).toBeUndefined();
    });

    it("3. CheckRedirectEditPossiblePayload's full field list is confirmed by official docs (spec.md §1, 2026-09-23) — was an index signature before this round's fix", () => {
      const payload: CheckRedirectEditPossiblePayload = {
        OrderRef: "redirect-order-ref-1",
        CityRecipient: "Kyiv",
        WarehouseRef: "warehouse-ref-1",
      };

      const withUnconfirmedField: CheckRedirectEditPossiblePayload = {
        OrderRef: "redirect-order-ref-1",
        // @ts-expect-error — an unconfirmed field name is no longer accepted now that the field list
        // is fully typed instead of passing through an index signature.
        SomeFieldNotYetConfirmedByAnySource: 123,
      };

      expect(payload.OrderRef).toBe("redirect-order-ref-1");
      expect(withUnconfirmedField.OrderRef).toBe("redirect-order-ref-1");
    });

    it("4. UpdateReturnPayload/UpdateRedirectPayload use Ref (confirmed by official docs, spec.md §1, 2026-09-23) and keep every other field optional, since update's exact response shape is genuinely variable", () => {
      const updateReturn: UpdateReturnPayload = {
        Ref: "return-order-ref-3",
        Reason: "reason-ref-3",
      };
      const updateRedirect: UpdateRedirectPayload = {
        Ref: "redirect-order-ref-2",
        NoteAddressRecipient: "corrected note",
      };

      expect(updateReturn.Ref).toBe("return-order-ref-3");
      expect(updateRedirect.Ref).toBe("redirect-order-ref-2");
    });

    it("5. CreateRedirectPayload.ServiceType is the confirmed 4-value enum (review round-4: the redirect-calculate page's own field table enumerates all four values explicitly)", () => {
      const payload: CreateRedirectPayload = {
        IntDocNumber: "waybill-11",
        PaymentMethod: "Cash",
        Recipient: "recipient-counterparty-ref-3",
        RecipientContactName: "Recipient Contact",
        RecipientPhone: "380500000004",
        PayerType: "Sender",
        ServiceType: "DoorsDoors",
      };

      expect(payload.ServiceType).toBe("DoorsDoors");
      // @ts-expect-error — no longer a plain string; an unconfirmed value is now a compile-time error
      const rejected: CreateRedirectPayload["ServiceType"] = "NotACrossCheckedEnumValue";
      void rejected;
    });
  });

  describe("remaining shared/list/reason types round out the module's contract surface", () => {
    it("OrderPricingEstimate, OrderListFilters, and the three *OrdersList item shapes compile", () => {
      const pricing: OrderPricingEstimate = {
        Pricing: { Services: [{ Service: "Return", Cost: 0 }], Total: 100, FirstDayStorage: "0000-00-00 00:00:00" },
        ScheduledDeliveryDate: "25.09.2026",
      };
      expect(pricing.Pricing.Total).toBe(100);
      // Pricing.Total is `number`, not `number | string` (review round-5 finding: the prior
      // `number | string` widening rested on a "5.52"-quoted-string example that never actually
      // existed in spec.md; both genuine calculate examples show a plain JSON number).
      // @ts-expect-error — a quoted string is no longer accepted now that Total is `number` only.
      const rejectedTotal: OrderPricingEstimate["Pricing"]["Total"] = "5.52";
      void rejectedTotal;
      // Page/Limit are string on the wire — official docs' own list examples send "1"/"50" quoted
      // (spec.md §1, 2026-09-23), corrected from the original `number` typing (review round-3 finding).
      const filters: OrderListFilters = { Number: "waybill-12", Page: "1", Limit: "20" };
      const returnItem: ReturnOrderListItem = {
        OrderRef: "return-order-ref-4",
        OrderNumber: "1234570",
        OrderStatus: "Прийнято",
        DocumentNumber: "waybill-12",
        CounterpartyRecipient: "counterparty-1",
        ContactPersonRecipient: "contact-1",
        AddressRecipient: "address-1",
        DeliveryCost: "50",
        EstimatedDeliveryDate: "26.09.2026",
        ExpressWaybillNumber: "1234571",
        ExpressWaybillStatus: "Отримано",
      };
      const redirectItem: RedirectOrderListItem = {
        OrderRef: "redirect-order-ref-3",
        OrderNumber: "1234572",
        DateTime: "22.09.2026 10:00:00",
        DocumentNumber: "waybill-13",
        Note: "",
        CityRecipient: "city-1",
        RecipientAddress: "address-2",
        CounterpartyRecipient: "counterparty-2",
        RecipientName: "Recipient Name",
        PhoneRecipient: "380500000005",
        PayerType: "Sender",
        DeliveryCost: "60",
        EstimatedDeliveryDate: "27.09.2026",
        ExpressWaybillNumber: "1234573",
        ExpressWaybillStatus: "В дорозі",
      };

      expect(pricing.Pricing.Total).toBe(100);
      expect(filters.Limit).toBe("20");
      expect(returnItem.OrderStatus).toBe("Прийнято");
      expect(redirectItem.PayerType).toBe("Sender");
    });

    it("ReturnReason/ReturnReasonSubtype(Filters), CheckRedirectPossiblePayload/RedirectPossibility, DeleteAdditionalServiceOrderPayload/DeletedAdditionalServiceOrder, and CreateReturnIfPossiblePayload compile", () => {
      const reason: ReturnReason = { Ref: "reason-ref-4", Description: "Damaged" };
      const subtypeFilters: ReturnReasonSubtypeFilters = { ReasonRef: "reason-ref-4" };
      const subtype: ReturnReasonSubtype = {
        Ref: "subtype-ref-2",
        Description: "Box damaged",
        ReasonRef: "reason-ref-4",
      };
      const checkRedirect: CheckRedirectPossiblePayload = { Number: "waybill-13" };
      const redirectPossibility: RedirectPossibility = {
        Ref: "redirect-order-ref-4",
        Number: "waybill-13",
        PayerType: "Sender",
        PaymentMethod: "Cash",
        WarehouseRef: "warehouse-ref-7",
        WarehouseDescription: "Warehouse #1",
        AddressDescription: "",
        StreetDescription: "",
        BuildingNumber: "",
        CityRecipient: "city-ref-1",
        CityRecipientDescription: "Kyiv",
        SettlementRecipient: "settlement-ref-1",
        SettlementRecipientDescription: "Kyiv",
        SettlementType: "місто",
        CounterpartyRecipientRef: "recipient-counterparty-ref-4",
        CounterpartyRecipientDescription: "Recipient LLC",
        RecipientName: "Recipient Name",
        PhoneSender: "380500000006",
        PhoneRecipient: "380500000007",
        DocumentWeight: "1.5",
      };
      const createRedirect: SavedRedirectOrder = { Number: "1234574", Ref: "redirect-order-ref-5" };
      const deletePayload: DeleteAdditionalServiceOrderPayload = { Ref: "return-order-ref-5" };
      const deleted: DeletedAdditionalServiceOrder = { Number: "1234575" };
      const createReturnIfPossible: CreateReturnIfPossiblePayload = {
        IntDocNumber: "waybill-14",
        PaymentMethod: "Cash",
        Reason: "reason-ref-5",
      };

      // AC-04/§3.5: CreateReturnIfPossiblePayload omits Destination and ReturnAddressRef — both are
      // filled in internally by the convenience method, never caller-settable.
      // @ts-expect-error — Destination is omitted from CreateReturnIfPossiblePayload by design.
      createReturnIfPossible.Destination = "SenderAddress";
      // @ts-expect-error — ReturnAddressRef is omitted from CreateReturnIfPossiblePayload by design.
      createReturnIfPossible.ReturnAddressRef = "return-address-ref-8";

      expect(reason.Description).toBe("Damaged");
      expect(subtypeFilters.ReasonRef).toBe("reason-ref-4");
      expect(subtype.ReasonRef).toBe("reason-ref-4");
      expect(checkRedirect.Number).toBe("waybill-13");
      expect(redirectPossibility.PayerType).toBe("Sender");
      expect(createRedirect.Ref).toBe("redirect-order-ref-5");
      expect(deletePayload.Ref).toBe("return-order-ref-5");
      expect(deleted.Number).toBe("1234575");
      expect(createReturnIfPossible.IntDocNumber).toBe("waybill-14");
    });
  });
});
