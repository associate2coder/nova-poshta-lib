import type { NovaPoshtaClient } from "../../client.js";
import type {
  Area,
  City,
  GetCitiesFilters,
  GetSettlementsFilters,
  GetStreetParams,
  GetWarehousesFilters,
  SearchSettlementsParams,
  SearchSettlementStreetsParams,
  SearchWrapper,
  Settlement,
  SettlementAddress,
  Street,
  StreetAddress,
  Warehouse,
  WarehouseType,
} from "../../types/address.js";

export interface AddressModule {
  getCities(filters?: GetCitiesFilters): Promise<City[]>;
  getSettlements(filters?: GetSettlementsFilters): Promise<Settlement[]>;
  searchSettlements(params: SearchSettlementsParams): Promise<SearchWrapper<SettlementAddress> | undefined>;
  getAreas(): Promise<Area[]>;
  getStreet(params: GetStreetParams): Promise<Street[]>;
  searchSettlementStreets(
    params: SearchSettlementStreetsParams,
  ): Promise<SearchWrapper<StreetAddress> | undefined>;
  getWarehouses(filters?: GetWarehousesFilters): Promise<Warehouse[]>;
  getWarehouseTypes(): Promise<WarehouseType[]>;
}

async function firstOrUndefined<T>(
  client: NovaPoshtaClient,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
): Promise<T | undefined> {
  const records = await client.request<T>("Address", calledMethod, methodProperties);
  return records[0];
}

export function createAddressModule(client: NovaPoshtaClient): AddressModule {
  return {
    getCities: (filters?: GetCitiesFilters) =>
      client.request<City>("Address", "getCities", filters as Record<string, unknown>),
    getSettlements: (filters?: GetSettlementsFilters) =>
      client.request<Settlement>("Address", "getSettlements", filters as Record<string, unknown>),
    searchSettlements: (params: SearchSettlementsParams) =>
      firstOrUndefined<SearchWrapper<SettlementAddress>>(
        client,
        "searchSettlements",
        params as unknown as Record<string, unknown>,
      ),
    getAreas: () => client.request<Area>("Address", "getAreas"),
    getStreet: (params: GetStreetParams) =>
      client.request<Street>("Address", "getStreet", params as unknown as Record<string, unknown>),
    searchSettlementStreets: (params: SearchSettlementStreetsParams) =>
      firstOrUndefined<SearchWrapper<StreetAddress>>(
        client,
        "searchSettlementStreets",
        params as unknown as Record<string, unknown>,
      ),
    getWarehouses: (filters?: GetWarehousesFilters) =>
      client.request<Warehouse>("Address", "getWarehouses", filters as Record<string, unknown>),
    getWarehouseTypes: () => client.request<WarehouseType>("Address", "getWarehouseTypes"),
  };
}
