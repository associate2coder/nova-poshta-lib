import type { OpenEnum } from "./common.js";

export type CounterpartyProperty = OpenEnum<"Sender" | "Recipient" | "ThirdParty">;

export interface CounterpartyRecordBase {
  Ref?: string;
  Description?: string;
  CounterpartyProperty?: CounterpartyProperty;
}

export interface GetCounterpartiesFilters {
  CounterpartyProperty?: CounterpartyProperty;
  FindByString?: string;
  Page?: number;
}

export interface GetCounterpartiesCatalogFilters {
  Phone?: string;
  LastName?: string;
  Page?: number;
}

export interface GetCounterpartyContactPersonsFilters {
  Ref: string;
  Page?: number;
}

export interface GetCounterpartyAddressesFilters {
  Ref: string;
  CounterpartyProperty?: CounterpartyProperty;
}

export interface GetCounterpartyOptionsFilters {
  Ref: string;
}

/** Shape undocumented in every source this feature could cross-check — kept as an open dictionary
 *  rather than inventing fields with no origin (contracts/public-api.md §3.5). */
export type CounterpartyOptions = Record<string, unknown>;

export interface PrivatePersonCounterparty extends CounterpartyRecordBase {
  CounterpartyType: "PrivatePerson";
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

export interface OrganizationCounterparty extends CounterpartyRecordBase {
  CounterpartyType: "Organization";
  EDRPOU?: string;
  OwnershipForm?: string;
  OwnershipFormDescription?: string;
}

export interface ThirdPartyCounterparty extends CounterpartyRecordBase {
  CounterpartyType: "ThirdParty";
  EDRPOU?: string;
  CityRef?: string;
}

/** AC-03: a discriminated union on the literal CounterpartyType field — never one shared loose shape
 *  where every type-specific field is merely optional (sad.md §4 decision 6, ADR-0001). */
export type Counterparty = PrivatePersonCounterparty | OrganizationCounterparty | ThirdPartyCounterparty;

export interface ContactPerson {
  Ref?: string;
  Description?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  Phones?: string;
  AdditionalPhone?: string;
  Email?: string;
}

export interface SavePrivatePersonPayload {
  CounterpartyType: "PrivatePerson";
  CounterpartyProperty: CounterpartyProperty;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  Phone: string;
  Email?: string;
}

export interface SaveOrganizationPayload {
  CounterpartyType: "Organization";
  CounterpartyProperty: CounterpartyProperty;
  EDRPOU: string;
}

export interface SaveThirdPartyPayload {
  CounterpartyType: "ThirdParty";
  CounterpartyProperty: CounterpartyProperty;
  EDRPOU: string;
  CityRef: string;
}

/** AC-04: the type checker rejects a payload mixing fields from more than one variant — three
 *  hand-written interfaces unioned, never collapsed to their shared fields (ADR-0001). */
export type SaveCounterpartyPayload = SavePrivatePersonPayload | SaveOrganizationPayload | SaveThirdPartyPayload;

/** AC-05: every field its own variant's Save payload declares becomes mandatory here — an omitted
 *  key is never "leave unchanged" — while the discriminant (CounterpartyType) is preserved per
 *  variant, never collapsed to the three types' shared fields (ADR-0001, three hand-written types,
 *  chosen over a single distributive-conditional type for readability). */
export type UpdatePrivatePersonPayload = Required<SavePrivatePersonPayload> & { Ref: string };
export type UpdateOrganizationPayload = Required<SaveOrganizationPayload> & { Ref: string };
export type UpdateThirdPartyPayload = Required<SaveThirdPartyPayload> & { Ref: string };

export type UpdateCounterpartyPayload =
  | UpdatePrivatePersonPayload
  | UpdateOrganizationPayload
  | UpdateThirdPartyPayload;

export interface DeleteCounterpartyPayload {
  Ref: string;
}
export interface DeletedCounterparty {
  Ref: string;
}

export interface SaveContactPersonPayload {
  CounterpartyRef: string;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  Phone: string;
}

/** AC-09: every field ContactPerson documents, required and optional alike (incl. MiddleName),
 *  becomes mandatory here — no partial update, no "leave unchanged". Single flat shape, no
 *  discriminant to preserve (sad.md §4 decision 7). */
export type UpdateContactPersonPayload = Required<Omit<SaveContactPersonPayload, "CounterpartyRef">> & {
  Ref: string;
};

export interface DeleteContactPersonPayload {
  Ref: string;
}
export interface DeletedContactPerson {
  Ref: string;
}
