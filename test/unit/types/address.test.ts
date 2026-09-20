import { describe, expect, it } from "vitest";
import type { SaveAddressPayload, UpdateAddressPayload } from "../../../src/types/address.js";

describe("address domain types (T1)", () => {
  it("UpdateAddressPayload requires every SaveAddressPayload field plus Ref (AC-05)", () => {
    const complete: UpdateAddressPayload = {
      Ref: "address-ref-1",
      CounterpartyRef: "counterparty-ref-1",
      StreetRef: "street-ref-1",
      BuildingNumber: "12",
      Flat: "3",
      Note: "gate code 4321",
    };

    // @ts-expect-error — Flat is optional on SaveAddressPayload but must be mandatory on UpdateAddressPayload.
    const missingFlat: UpdateAddressPayload = {
      Ref: "address-ref-1",
      CounterpartyRef: "counterparty-ref-1",
      StreetRef: "street-ref-1",
      BuildingNumber: "12",
      Note: "gate code 4321",
    };

    const save: SaveAddressPayload = {
      CounterpartyRef: "counterparty-ref-1",
      StreetRef: "street-ref-1",
      BuildingNumber: "12",
    };

    expect(complete.Ref).toBe("address-ref-1");
    expect(missingFlat.CounterpartyRef).toBe("counterparty-ref-1");
    expect(save.BuildingNumber).toBe("12");
  });
});
