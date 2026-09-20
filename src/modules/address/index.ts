import type { NovaPoshtaClient } from "../../client.js";
import type {
  Area,
  City,
  GetCitiesFilters,
  GetSettlementsFilters,
  Settlement,
  WarehouseType,
} from "../../types/address.js";

export interface AddressModule {
  getCities(filters?: GetCitiesFilters): Promise<City[]>;
  getSettlements(filters?: GetSettlementsFilters): Promise<Settlement[]>;
  getAreas(): Promise<Area[]>;
  getWarehouseTypes(): Promise<WarehouseType[]>;
}

export function createAddressModule(client: NovaPoshtaClient): AddressModule {
  return {
    getCities: (filters?: GetCitiesFilters) =>
      client.request<City>("Address", "getCities", filters as Record<string, unknown>),
    getSettlements: (filters?: GetSettlementsFilters) =>
      client.request<Settlement>("Address", "getSettlements", filters as Record<string, unknown>),
    getAreas: () => client.request<Area>("Address", "getAreas"),
    getWarehouseTypes: () => client.request<WarehouseType>("Address", "getWarehouseTypes"),
  };
}
