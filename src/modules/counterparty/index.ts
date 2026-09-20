import type { NovaPoshtaClient } from "../../client.js";
import type { SavedAddress } from "../../types/address.js";
import type {
  Counterparty,
  CounterpartyOptions,
  ContactPerson,
  DeleteCounterpartyPayload,
  DeletedCounterparty,
  GetCounterpartiesCatalogFilters,
  GetCounterpartiesFilters,
  GetCounterpartyAddressesFilters,
  GetCounterpartyContactPersonsFilters,
  GetCounterpartyOptionsFilters,
  SaveCounterpartyPayload,
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
}

async function firstOrUndefined<T>(
  client: NovaPoshtaClient,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
): Promise<T | undefined> {
  const records = await client.request<T>("Counterparty", calledMethod, methodProperties);
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
      firstOrUndefined<Counterparty>(client, "save", payload as unknown as Record<string, unknown>),
    update: (payload: UpdateCounterpartyPayload) =>
      firstOrUndefined<Counterparty>(client, "update", payload as unknown as Record<string, unknown>),
    delete: (payload: DeleteCounterpartyPayload) =>
      firstOrUndefined<DeletedCounterparty>(client, "delete", payload as unknown as Record<string, unknown>),
  };
  return module;
}
