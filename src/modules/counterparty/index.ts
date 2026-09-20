import type { NovaPoshtaClient } from "../../client.js";
import type { SavedAddress } from "../../types/address.js";
import type {
  Counterparty,
  CounterpartyOptions,
  ContactPerson,
  DeleteContactPersonPayload,
  DeleteCounterpartyPayload,
  DeletedContactPerson,
  DeletedCounterparty,
  GetCounterpartiesCatalogFilters,
  GetCounterpartiesFilters,
  GetCounterpartyAddressesFilters,
  GetCounterpartyContactPersonsFilters,
  GetCounterpartyOptionsFilters,
  SaveContactPersonPayload,
  SaveCounterpartyPayload,
  UpdateContactPersonPayload,
  UpdateCounterpartyPayload,
} from "../../types/counterparty.js";

export interface CounterpartyModule {
  getCounterparties(filters?: GetCounterpartiesFilters): Promise<Counterparty[]>;
  getCounterpartiesCatalog(filters: GetCounterpartiesCatalogFilters): Promise<Counterparty[]>;
  getCounterpartyContactPersons(filters: GetCounterpartyContactPersonsFilters): Promise<ContactPerson[]>;
  getCounterpartyAddresses(filters: GetCounterpartyAddressesFilters): Promise<SavedAddress[]>;
  getCounterpartyOptions(filters: GetCounterpartyOptionsFilters): Promise<CounterpartyOptions[]>;
  save(payload: SaveCounterpartyPayload): Promise<Counterparty | undefined>;
  /**
   * Full-replace + discriminant guard (AC-05): every field the payload's own variant requires is
   * mandatory, and the type checker rejects a payload mixing fields from more than one counterparty
   * type. An omitted key is never treated as "leave unchanged".
   */
  update(payload: UpdateCounterpartyPayload): Promise<Counterparty | undefined>;
  delete(payload: DeleteCounterpartyPayload): Promise<DeletedCounterparty | undefined>;
  saveContactPerson(payload: SaveContactPersonPayload): Promise<ContactPerson | undefined>;
  /** AC-09: every field ContactPerson documents, required and optional alike (incl. MiddleName), is
   *  mandatory — no partial update, no "leave unchanged". */
  updateContactPerson(payload: UpdateContactPersonPayload): Promise<ContactPerson | undefined>;
  deleteContactPerson(payload: DeleteContactPersonPayload): Promise<DeletedContactPerson | undefined>;
}

async function firstOrUndefined<T>(
  client: NovaPoshtaClient,
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
): Promise<T | undefined> {
  const records = await client.request<T>(modelName, calledMethod, methodProperties);
  return records[0];
}

export function createCounterpartyModule(client: NovaPoshtaClient): CounterpartyModule {
  const module: CounterpartyModule = {
    getCounterparties: (filters?: GetCounterpartiesFilters) =>
      client.request<Counterparty>("Counterparty", "getCounterparties", filters as Record<string, unknown>),
    getCounterpartiesCatalog: (filters: GetCounterpartiesCatalogFilters) =>
      client.request<Counterparty>(
        "Counterparty",
        "getCounterpartiesCatalog",
        filters as unknown as Record<string, unknown>,
      ),
    getCounterpartyContactPersons: (filters: GetCounterpartyContactPersonsFilters) =>
      client.request<ContactPerson>(
        "Counterparty",
        "getCounterpartyContactPersons",
        filters as unknown as Record<string, unknown>,
      ),
    getCounterpartyAddresses: (filters: GetCounterpartyAddressesFilters) =>
      client.request<SavedAddress>(
        "Counterparty",
        "getCounterpartyAddresses",
        filters as unknown as Record<string, unknown>,
      ),
    getCounterpartyOptions: (filters: GetCounterpartyOptionsFilters) =>
      client.request<CounterpartyOptions>(
        "Counterparty",
        "getCounterpartyOptions",
        filters as unknown as Record<string, unknown>,
      ),
    save: (payload: SaveCounterpartyPayload) =>
      firstOrUndefined<Counterparty>(client, "Counterparty", "save", payload as unknown as Record<string, unknown>),
    update: (payload: UpdateCounterpartyPayload) =>
      firstOrUndefined<Counterparty>(
        client,
        "Counterparty",
        "update",
        payload as unknown as Record<string, unknown>,
      ),
    delete: (payload: DeleteCounterpartyPayload) =>
      firstOrUndefined<DeletedCounterparty>(
        client,
        "Counterparty",
        "delete",
        payload as unknown as Record<string, unknown>,
      ),
    saveContactPerson: (payload: SaveContactPersonPayload) =>
      firstOrUndefined<ContactPerson>(
        client,
        "ContactPerson",
        "save",
        payload as unknown as Record<string, unknown>,
      ),
    updateContactPerson: (payload: UpdateContactPersonPayload) =>
      firstOrUndefined<ContactPerson>(
        client,
        "ContactPerson",
        "update",
        payload as unknown as Record<string, unknown>,
      ),
    deleteContactPerson: (payload: DeleteContactPersonPayload) =>
      firstOrUndefined<DeletedContactPerson>(
        client,
        "ContactPerson",
        "delete",
        payload as unknown as Record<string, unknown>,
      ),
  };
  return module;
}
