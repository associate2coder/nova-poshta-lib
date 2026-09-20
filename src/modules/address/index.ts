import type { NovaPoshtaClient } from "../../client.js";
import type {
  Area,
  City,
  GetCitiesFilters,
  GetSettlementsFilters,
  GetStreetParams,
  GetWarehousesFilters,
  Settlement,
  Street,
  Warehouse,
  WarehouseType,
} from "../../types/address.js";

export interface AddressModule {
  getCities(filters?: GetCitiesFilters): Promise<City[]>;
  getSettlements(filters?: GetSettlementsFilters): Promise<Settlement[]>;
  getAreas(): Promise<Area[]>;
  getStreet(params: GetStreetParams): Promise<Street[]>;
  getWarehouses(filters?: GetWarehousesFilters): Promise<Warehouse[]>;
  getWarehouseTypes(): Promise<WarehouseType[]>;
}

export function createAddressModule(client: NovaPoshtaClient): AddressModule {
  return {
    getCities: (filters?: GetCitiesFilters) =>
      client.request<City>("Address", "getCities", filters as Record<string, unknown>),
    getSettlements: (filters?: GetSettlementsFilters) =>
      client.request<Settlement>("Address", "getSettlements", filters as Record<string, unknown>),
    getAreas: () => client.request<Area>("Address", "getAreas"),
    getStreet: (params: GetStreetParams) =>
      client.request<Street>("Address", "getStreet", params as unknown as Record<string, unknown>),
    getWarehouses: (filters?: GetWarehousesFilters) =>
      client.request<Warehouse>("Address", "getWarehouses", filters as Record<string, unknown>),
    getWarehouseTypes: () => client.request<WarehouseType>("Address", "getWarehouseTypes"),
  };
}
