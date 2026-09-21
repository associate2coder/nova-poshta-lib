import { describe, expect, it } from "vitest";
import type { InternetDocumentModule } from "../../../src/modules/internet-document/index.js";
import type {
  SaveDoorsToDoorsPayload,
  SaveDoorsToWarehousePayload,
  SaveInternetDocumentPayload,
  SaveWarehouseToDoorsPayload,
  SaveWarehouseToWarehousePayload,
  UpdateDoorsToDoorsPayload,
  UpdateDoorsToWarehousePayload,
  UpdateWarehouseToDoorsPayload,
  UpdateWarehouseToWarehousePayload,
} from "../../../src/types/internet-document.js";

// F2 (round-7 review, 2026-09-22): every case above types a payload against a *named* variant
// (SaveDoorsToWarehousePayload, etc.), never against what InternetDocumentModule["save"]/["update"]
// actually accept. Deriving the argument type from the interface itself, instead of from
// SaveInternetDocumentPayload directly, means a future loosening of the module's own public
// signature (spec.md §6 "Save/update discriminant guard" NFR: "100% of calls to save/update fail to
// compile...") breaks this test even if SaveInternetDocumentPayload itself is untouched.
type SaveCallArgument = Parameters<InternetDocumentModule["save"]>[0];
type UpdateCallArgument = Parameters<InternetDocumentModule["update"]>[0];

const saveCommon = {
  PayerType: "Sender",
  PaymentMethod: "Cash",
  DateTime: "21.09.2026",
  Weight: 1,
  SeatsAmount: 1,
  Description: "Books",
  Cost: 500,
  CitySender: "city-sender-1",
  Sender: "sender-1",
  ContactSender: "contact-sender-1",
  SendersPhone: "380500000000",
  CityRecipient: "city-recipient-1",
  Recipient: "recipient-1",
  ContactRecipient: "contact-recipient-1",
  RecipientsPhone: "380500000001",
} as const;

describe("internet-document domain types (T1, AC-02)", () => {
  it("save: each of the 4 ServiceType legs requires exactly its own sender+recipient location fields", () => {
    const warehouseWarehouse: SaveWarehouseToWarehousePayload = {
      ...saveCommon,
      ServiceType: "WarehouseWarehouse",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      RecipientAddress: "recipient-warehouse-ref",
    };

    const warehouseDoors: SaveWarehouseToDoorsPayload = {
      ...saveCommon,
      ServiceType: "WarehouseDoors",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      RecipientCityName: "Kyiv",
      RecipientArea: "Kyivska",
      RecipientAddressName: "Khreshchatyk",
      RecipientHouse: "1",
    };

    const doorsWarehouse: SaveDoorsToWarehousePayload = {
      ...saveCommon,
      ServiceType: "DoorsWarehouse",
      CargoType: "Parcel",
      SenderCityName: "Lviv",
      SenderArea: "Lvivska",
      SenderAddressName: "Rynok",
      SenderHouse: "1",
      RecipientAddress: "recipient-warehouse-ref",
    };

    const doorsDoors: SaveDoorsToDoorsPayload = {
      ...saveCommon,
      ServiceType: "DoorsDoors",
      CargoType: "Parcel",
      SenderCityName: "Lviv",
      SenderArea: "Lvivska",
      SenderAddressName: "Rynok",
      SenderHouse: "1",
      RecipientCityName: "Kyiv",
      RecipientArea: "Kyivska",
      RecipientAddressName: "Khreshchatyk",
      RecipientHouse: "1",
    };

    // DoorsWarehouse's sender leg needs SenderCityName/.../SenderHouse, not the warehouse-only
    // SenderAddress ref (AC-02: the sender leg, not just the recipient leg, must be discriminated
    // by ServiceType).
    const wrongSenderLeg: SaveDoorsToWarehousePayload = {
      ...saveCommon,
      ServiceType: "DoorsWarehouse",
      CargoType: "Parcel",
      // @ts-expect-error — SenderAddress belongs to the Warehouse sender leg, not Doors.
      SenderAddress: "sender-warehouse-ref",
      RecipientAddress: "recipient-warehouse-ref",
    };

    // WarehouseWarehouse's sender leg needs the warehouse-only SenderAddress ref, not the door
    // fields belonging to the Doors sender leg.
    const wrongSenderLeg2: SaveWarehouseToWarehousePayload = {
      ...saveCommon,
      ServiceType: "WarehouseWarehouse",
      CargoType: "Parcel",
      // @ts-expect-error — SenderCityName belongs to the Doors sender leg, not Warehouse.
      SenderCityName: "Lviv",
      SenderArea: "Lvivska",
      SenderAddressName: "Rynok",
      SenderHouse: "1",
      RecipientAddress: "recipient-warehouse-ref",
    };

    // WarehouseDoors's recipient leg needs the door fields, not the warehouse-only
    // RecipientAddress ref (AC-02: the recipient leg, not just the sender leg, must be
    // discriminated by ServiceType).
    const wrongRecipientLeg: SaveWarehouseToDoorsPayload = {
      ...saveCommon,
      ServiceType: "WarehouseDoors",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      // @ts-expect-error — RecipientAddress belongs to the Warehouse recipient leg, not Doors.
      RecipientAddress: "recipient-warehouse-ref",
    };

    // WarehouseWarehouse's recipient leg needs the warehouse-only RecipientAddress ref, not the
    // door fields belonging to the Doors recipient leg.
    const wrongRecipientLeg2: SaveWarehouseToWarehousePayload = {
      ...saveCommon,
      ServiceType: "WarehouseWarehouse",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      // @ts-expect-error — RecipientCityName belongs to the Doors recipient leg, not Warehouse.
      RecipientCityName: "Kyiv",
      RecipientArea: "Kyivska",
      RecipientAddressName: "Khreshchatyk",
      RecipientHouse: "1",
    };

    // AC-02: omitting a required leg field entirely (not just mixing legs) must also fail to
    // compile — TypeScript's excess-property check would otherwise mask this, since it short-
    // circuits before reporting missing properties whenever an object literal also has an
    // out-of-union field.
    // @ts-expect-error — RecipientAddress is required for WarehouseWarehouse and was omitted.
    const missingRequiredField: SaveWarehouseToWarehousePayload = {
      ...saveCommon,
      ServiceType: "WarehouseWarehouse",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
    };

    const union: SaveInternetDocumentPayload[] = [warehouseWarehouse, warehouseDoors, doorsWarehouse, doorsDoors];

    expect(union).toHaveLength(4);
    expect(wrongSenderLeg.ServiceType).toBe("DoorsWarehouse");
    expect(wrongSenderLeg2.ServiceType).toBe("WarehouseWarehouse");
    expect(wrongRecipientLeg.ServiceType).toBe("WarehouseDoors");
    expect(wrongRecipientLeg2.ServiceType).toBe("WarehouseWarehouse");
    expect(missingRequiredField.ServiceType).toBe("WarehouseWarehouse");
  });

  it("save: the discriminant guard holds at InternetDocumentModule's actual call-site type, not just the named payload types (AC-02, F2)", () => {
    const valid: SaveCallArgument = {
      ...saveCommon,
      ServiceType: "WarehouseWarehouse",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      RecipientAddress: "recipient-warehouse-ref",
    };

    const mixedLegs: SaveCallArgument = {
      ...saveCommon,
      ServiceType: "DoorsWarehouse",
      CargoType: "Parcel",
      // @ts-expect-error — SenderAddress belongs to the Warehouse sender leg, not Doors, even when
      // typed as InternetDocumentModule["save"]'s own parameter rather than a named variant.
      SenderAddress: "sender-warehouse-ref",
      RecipientAddress: "recipient-warehouse-ref",
    };

    // @ts-expect-error — RecipientAddress is required for WarehouseWarehouse and was omitted, at
    // the same call-site type.
    const missingField: SaveCallArgument = {
      ...saveCommon,
      ServiceType: "WarehouseWarehouse",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
    };

    expect(valid.ServiceType).toBe("WarehouseWarehouse");
    expect(mixedLegs.ServiceType).toBe("DoorsWarehouse");
    expect(missingField.ServiceType).toBe("WarehouseWarehouse");
  });

  it("update: the sender leg is discriminated the same way as save (AC-02, AC-06)", () => {
    const warehouseWarehouse: UpdateWarehouseToWarehousePayload = {
      ...saveCommon,
      Ref: "waybill-1",
      ServiceType: "WarehouseWarehouse",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      RecipientAddress: "recipient-warehouse-ref",
    };

    const doorsWarehouse: UpdateDoorsToWarehousePayload = {
      ...saveCommon,
      Ref: "waybill-1",
      ServiceType: "DoorsWarehouse",
      CargoType: "Parcel",
      SenderCityName: "Lviv",
      SenderArea: "Lvivska",
      SenderAddressName: "Rynok",
      SenderHouse: "1",
      RecipientAddress: "recipient-warehouse-ref",
    };

    const warehouseDoors: UpdateWarehouseToDoorsPayload = {
      ...saveCommon,
      Ref: "waybill-1",
      ServiceType: "WarehouseDoors",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      RecipientCityName: "Kyiv",
      RecipientArea: "Kyivska",
      RecipientAddressName: "Khreshchatyk",
      RecipientHouse: "1",
    };

    const doorsDoors: UpdateDoorsToDoorsPayload = {
      ...saveCommon,
      Ref: "waybill-1",
      ServiceType: "DoorsDoors",
      CargoType: "Parcel",
      SenderCityName: "Lviv",
      SenderArea: "Lvivska",
      SenderAddressName: "Rynok",
      SenderHouse: "1",
      RecipientCityName: "Kyiv",
      RecipientArea: "Kyivska",
      RecipientAddressName: "Khreshchatyk",
      RecipientHouse: "1",
    };

    // DoorsWarehouse's update sender leg needs the door fields, not the warehouse-only
    // SenderAddress ref.
    const wrongSenderLeg: UpdateDoorsToWarehousePayload = {
      ...saveCommon,
      Ref: "waybill-1",
      ServiceType: "DoorsWarehouse",
      CargoType: "Parcel",
      // @ts-expect-error — SenderAddress belongs to the Warehouse sender leg, not Doors.
      SenderAddress: "sender-warehouse-ref",
      RecipientAddress: "recipient-warehouse-ref",
    };

    // WarehouseDoors's update recipient leg needs the door fields, not the warehouse-only
    // RecipientAddress ref.
    const wrongRecipientLeg: UpdateWarehouseToDoorsPayload = {
      ...saveCommon,
      Ref: "waybill-1",
      ServiceType: "WarehouseDoors",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      // @ts-expect-error — RecipientAddress belongs to the Warehouse recipient leg, not Doors.
      RecipientAddress: "recipient-warehouse-ref",
    };

    expect(warehouseWarehouse.Ref).toBe("waybill-1");
    expect(doorsWarehouse.SenderHouse).toBe("1");
    expect(warehouseDoors.RecipientHouse).toBe("1");
    expect(doorsDoors.SenderCityName).toBe("Lviv");
    expect(wrongSenderLeg.ServiceType).toBe("DoorsWarehouse");
    expect(wrongRecipientLeg.ServiceType).toBe("WarehouseDoors");
  });

  it("update: the discriminant guard holds at InternetDocumentModule's actual call-site type, not just the named payload types (AC-02, F2)", () => {
    const valid: UpdateCallArgument = {
      ...saveCommon,
      Ref: "waybill-1",
      ServiceType: "WarehouseWarehouse",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      RecipientAddress: "recipient-warehouse-ref",
    };

    const mixedLegs: UpdateCallArgument = {
      ...saveCommon,
      Ref: "waybill-1",
      ServiceType: "WarehouseDoors",
      CargoType: "Parcel",
      SenderAddress: "sender-warehouse-ref",
      // @ts-expect-error — RecipientAddress belongs to the Warehouse recipient leg, not Doors, even
      // when typed as InternetDocumentModule["update"]'s own parameter rather than a named variant.
      RecipientAddress: "recipient-warehouse-ref",
    };

    expect(valid.ServiceType).toBe("WarehouseWarehouse");
    expect(mixedLegs.ServiceType).toBe("WarehouseDoors");
  });
});
