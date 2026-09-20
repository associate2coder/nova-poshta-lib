import { describe, expect, it } from "vitest";
import type {
  Counterparty,
  DeleteContactPersonPayload,
  GetCounterpartyAddressesFilters,
  OrganizationCounterparty,
  PrivatePersonCounterparty,
  SaveContactPersonPayload,
  SaveCounterpartyPayload,
  SavePrivatePersonPayload,
  ThirdPartyCounterparty,
  UpdateContactPersonPayload,
  UpdateCounterpartyPayload,
  UpdateOrganizationPayload,
  UpdatePrivatePersonPayload,
} from "../../../src/types/counterparty.js";
import type { SavedAddress } from "../../../src/types/address.js";
import type { CounterpartyModule } from "../../../src/modules/counterparty/index.js";

describe("counterparty domain types (T1)", () => {
  it("Counterparty discriminates on CounterpartyType — a mismatched field access fails to compile (AC-03)", () => {
    const person: PrivatePersonCounterparty = {
      Ref: "cp-1",
      CounterpartyType: "PrivatePerson",
      FirstName: "Ivan",
      LastName: "Franko",
    };
    const org: OrganizationCounterparty = {
      Ref: "cp-2",
      CounterpartyType: "Organization",
      EDRPOU: "12345678",
    };
    const third: ThirdPartyCounterparty = {
      Ref: "cp-3",
      CounterpartyType: "ThirdParty",
      EDRPOU: "87654321",
    };

    const counterparties: Counterparty[] = [person, org, third];

    function readEdrpou(counterparty: Counterparty): string | undefined {
      if (counterparty.CounterpartyType === "PrivatePerson") {
        // @ts-expect-error — EDRPOU does not exist on PrivatePersonCounterparty (AC-03).
        return counterparty.EDRPOU;
      }
      return counterparty.EDRPOU;
    }

    expect(counterparties).toHaveLength(3);
    expect(readEdrpou(org)).toBe("12345678");
  });

  it("SaveCounterpartyPayload rejects a payload mixing fields from more than one variant (AC-04)", () => {
    const validPrivatePerson: SavePrivatePersonPayload = {
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
      FirstName: "Ivan",
      LastName: "Franko",
      Phone: "380500000000",
    };

    const mixed: SaveCounterpartyPayload = {
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
      FirstName: "Ivan",
      LastName: "Franko",
      Phone: "380500000000",
      // @ts-expect-error — EDRPOU belongs to Organization/ThirdParty, not PrivatePerson.
      EDRPOU: "12345678",
    };

    expect(validPrivatePerson.CounterpartyType).toBe("PrivatePerson");
    expect(mixed.CounterpartyType).toBe("PrivatePerson");
  });

  it("UpdateCounterpartyPayload requires every field its own variant's Save payload declares (AC-05)", () => {
    const validUpdate: UpdatePrivatePersonPayload = {
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
      FirstName: "Ivan",
      MiddleName: "Stepanovych",
      LastName: "Franko",
      Phone: "380500000000",
      Email: "ivan@example.com",
      Ref: "cp-1",
    };

    // @ts-expect-error — MiddleName/Email are optional on SavePrivatePersonPayload but mandatory here.
    const incompleteUpdate: UpdatePrivatePersonPayload = {
      CounterpartyType: "PrivatePerson",
      CounterpartyProperty: "Recipient",
      FirstName: "Ivan",
      LastName: "Franko",
      Phone: "380500000000",
      Ref: "cp-1",
    };

    const organizationUpdate: UpdateOrganizationPayload = {
      CounterpartyType: "Organization",
      CounterpartyProperty: "Recipient",
      EDRPOU: "12345678",
      Ref: "cp-1",
    };

    // @ts-expect-error — a well-formed Organization update is not assignable to the PrivatePerson variant.
    const wrongVariant: UpdatePrivatePersonPayload = organizationUpdate;

    const union: UpdateCounterpartyPayload = validUpdate;

    expect(validUpdate.Ref).toBe("cp-1");
    expect(incompleteUpdate.Ref).toBe("cp-1");
    expect(wrongVariant.CounterpartyType).toBe("Organization");
    expect(union.Ref).toBe("cp-1");
  });

  it("UpdateContactPersonPayload is derived from SaveContactPersonPayload — Ref replaces CounterpartyRef, every other field mandatory (AC-09)", () => {
    const save: SaveContactPersonPayload = {
      CounterpartyRef: "cp-1",
      FirstName: "Petro",
      LastName: "Ivanenko",
      Phone: "380500000001",
    };

    const validUpdate: UpdateContactPersonPayload = {
      Ref: "contact-1",
      FirstName: "Petro",
      MiddleName: "Petrovych",
      LastName: "Ivanenko",
      Phone: "380500000001",
    };

    // @ts-expect-error — MiddleName is optional on SaveContactPersonPayload but mandatory on the update.
    const incompleteUpdate: UpdateContactPersonPayload = {
      Ref: "contact-1",
      FirstName: "Petro",
      LastName: "Ivanenko",
      Phone: "380500000001",
    };

    const deletePayload: DeleteContactPersonPayload = { Ref: "contact-1" };

    expect(save.CounterpartyRef).toBe("cp-1");
    expect(validUpdate.MiddleName).toBe("Petrovych");
    expect(incompleteUpdate.Ref).toBe("contact-1");
    expect(deletePayload.Ref).toBe("contact-1");
  });

  it("getCounterpartyAddresses's response type is address's own SavedAddress, not a local redefinition", () => {
    // Unlike a bare `SavedAddress[]` value assertion (which any structurally matching shape would
    // satisfy), this pins the actual method signature: if getCounterpartyAddresses's return type
    // ever diverges in shape from address's own SavedAddress (wrong/renamed/extra fields), this
    // assignment stops compiling.
    const getCounterpartyAddresses: (filters: GetCounterpartyAddressesFilters) => Promise<SavedAddress[]> =
      undefined as unknown as CounterpartyModule["getCounterpartyAddresses"];

    expect(getCounterpartyAddresses).toBeUndefined();
  });
});
