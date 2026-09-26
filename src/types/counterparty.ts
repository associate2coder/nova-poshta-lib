import type { OpenEnum } from "./common.js";

/** Which role a counterparty plays on a shipment: sender, recipient, or a third party. */
export type CounterpartyProperty = OpenEnum<"Sender" | "Recipient" | "ThirdParty">;

/** @internal Base shape extended by the public counterparty types — never itself a standalone
 * public signature. */
export interface CounterpartyRecordBase {
  Ref?: string;
  Description?: string;
  CounterpartyProperty?: CounterpartyProperty;
}

/** Narrows `Counterparty.getCounterparties` by role, a search string, or a page. */
export interface GetCounterpartiesFilters {
  CounterpartyProperty?: CounterpartyProperty;
  FindByString?: string;
  Page?: number;
}

/** Narrows `Counterparty.getCounterpartiesCatalog` by phone, last name, or a page. */
export interface GetCounterpartiesCatalogFilters {
  Phone?: string;
  LastName?: string;
  Page?: number;
}

/** Scopes `Counterparty.getCounterpartyContactPersons` to one counterparty, optionally paged. */
export interface GetCounterpartyContactPersonsFilters {
  Ref: string;
  Page?: number;
}

/** Scopes `Counterparty.getCounterpartyAddresses` to one counterparty and, optionally, one role. */
export interface GetCounterpartyAddressesFilters {
  Ref: string;
  CounterpartyProperty?: CounterpartyProperty;
}

/** Identifies the counterparty `Counterparty.getCounterpartyOptions` looks up. */
export interface GetCounterpartyOptionsFilters {
  Ref: string;
}

/** Shape undocumented in every source this feature could cross-check — kept as an open dictionary
 *  rather than inventing fields with no origin (contracts/public-api.md §3.5). */
export type CounterpartyOptions = Record<string, unknown>;

/** An individual counterparty — one variant of the {@link Counterparty} union. */
export interface PrivatePersonCounterparty extends CounterpartyRecordBase {
  CounterpartyType: "PrivatePerson";
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

/** A legal-entity counterparty — one variant of the {@link Counterparty} union. */
export interface OrganizationCounterparty extends CounterpartyRecordBase {
  CounterpartyType: "Organization";
  EDRPOU?: string;
  OwnershipForm?: string;
  OwnershipFormDescription?: string;
}

/** A third-party (payer-only) counterparty — one variant of the {@link Counterparty} union. */
export interface ThirdPartyCounterparty extends CounterpartyRecordBase {
  CounterpartyType: "ThirdParty";
  EDRPOU?: string;
  CityRef?: string;
}

/** AC-03: a discriminated union on the literal CounterpartyType field — never one shared loose shape
 *  where every type-specific field is merely optional (sad.md §4 decision 6, ADR-0001). */
export type Counterparty = PrivatePersonCounterparty | OrganizationCounterparty | ThirdPartyCounterparty;

/** A contact person attached to a counterparty. */
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

/** Creates a `PrivatePerson` counterparty — one variant of {@link SaveCounterpartyPayload}. */
export interface SavePrivatePersonPayload {
  CounterpartyType: "PrivatePerson";
  CounterpartyProperty: CounterpartyProperty;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  Phone: string;
  Email?: string;
}

/** Creates an `Organization` counterparty — one variant of {@link SaveCounterpartyPayload}. */
export interface SaveOrganizationPayload {
  CounterpartyType: "Organization";
  CounterpartyProperty: CounterpartyProperty;
  EDRPOU: string;
}

/** Creates a `ThirdParty` counterparty — one variant of {@link SaveCounterpartyPayload}. */
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
/** Full-replace update for a `PrivatePerson` counterparty — every {@link SavePrivatePersonPayload}
 *  field becomes mandatory. */
export type UpdatePrivatePersonPayload = Required<SavePrivatePersonPayload> & { Ref: string };
/** Full-replace update for an `Organization` counterparty — every {@link SaveOrganizationPayload}
 *  field becomes mandatory. */
export type UpdateOrganizationPayload = Required<SaveOrganizationPayload> & { Ref: string };
/** Full-replace update for a `ThirdParty` counterparty — every {@link SaveThirdPartyPayload}
 *  field becomes mandatory. */
export type UpdateThirdPartyPayload = Required<SaveThirdPartyPayload> & { Ref: string };

/** The discriminated-union payload `Counterparty.update` accepts — see
 *  {@link UpdatePrivatePersonPayload}/{@link UpdateOrganizationPayload}/
 *  {@link UpdateThirdPartyPayload} for the three variants. */
export type UpdateCounterpartyPayload =
  | UpdatePrivatePersonPayload
  | UpdateOrganizationPayload
  | UpdateThirdPartyPayload;

/** Identifies the counterparty `Counterparty.delete` removes. */
export interface DeleteCounterpartyPayload {
  Ref: string;
}
/** Confirms which counterparty `Counterparty.delete` removed. */
export interface DeletedCounterparty {
  Ref: string;
}

/** Creates a contact person on a counterparty. */
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

/** Identifies the contact person `Counterparty.deleteContactPerson` removes. */
export interface DeleteContactPersonPayload {
  Ref: string;
}
/** Confirms which contact person `Counterparty.deleteContactPerson` removed. */
export interface DeletedContactPerson {
  Ref: string;
}
