import type { NovaPoshtaClient } from "../../client.js";
import type { SavedAddress } from "../../types/address.js";
import type {
  Counterparty,
  CounterpartyOptions,
  ContactPerson,
  GetCounterpartiesCatalogFilters,
  GetCounterpartiesFilters,
  GetCounterpartyAddressesFilters,
  GetCounterpartyContactPersonsFilters,
  GetCounterpartyOptionsFilters,
} from "../../types/counterparty.js";

export interface CounterpartyModule {
  getCounterparties(filters?: GetCounterpartiesFilters): Promise<Counterparty[]>;
  getCounterpartiesCatalog(filters: GetCounterpartiesCatalogFilters): Promise<Counterparty[]>;
  getCounterpartyContactPersons(filters: GetCounterpartyContactPersonsFilters): Promise<ContactPerson[]>;
  getCounterpartyAddresses(filters: GetCounterpartyAddressesFilters): Promise<SavedAddress[]>;
  getCounterpartyOptions(filters: GetCounterpartyOptionsFilters): Promise<CounterpartyOptions[]>;
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
  };
  return module;
}
