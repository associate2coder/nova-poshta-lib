import type { NovaPoshtaClient } from "../../client.js";
import type {
  Counterparty,
  ContactPerson,
  GetCounterpartiesCatalogFilters,
  GetCounterpartiesFilters,
  GetCounterpartyContactPersonsFilters,
} from "../../types/counterparty.js";

export interface CounterpartyModule {
  getCounterparties(filters?: GetCounterpartiesFilters): Promise<Counterparty[]>;
  getCounterpartiesCatalog(filters: GetCounterpartiesCatalogFilters): Promise<Counterparty[]>;
  getCounterpartyContactPersons(filters: GetCounterpartyContactPersonsFilters): Promise<ContactPerson[]>;
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
  };
  return module;
}
