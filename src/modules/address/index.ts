import type { NovaPoshtaClient } from "../../client.js";
import type {
  Area,
  City,
  DeleteAddressPayload,
  DeletedAddress,
  GetCitiesFilters,
  GetSettlementsFilters,
  GetStreetParams,
  GetWarehousesFilters,
  SaveAddressPayload,
  SavedAddress,
  SearchSettlementsParams,
  SearchSettlementStreetsParams,
  SearchWrapper,
  Settlement,
  SettlementAddress,
  Street,
  StreetAddress,
  UpdateAddressPayload,
  Warehouse,
  WarehouseType,
} from "../../types/address.js";

/** Nova Poshta's address-reference and saved-address methods: city/settlement/street/warehouse
 *  lookups, plus create/update/delete for a counterparty's saved addresses. */
export interface AddressModule {
  /** Lists cities, optionally narrowed by {@link GetCitiesFilters}. */
  getCities(filters?: GetCitiesFilters): Promise<City[]>;
  /** Lists settlements, optionally narrowed by {@link GetSettlementsFilters}. */
  getSettlements(filters?: GetSettlementsFilters): Promise<Settlement[]>;
  /** Searches settlements by city name; resolves `undefined` when nothing matches. */
  searchSettlements(params: SearchSettlementsParams): Promise<SearchWrapper<SettlementAddress> | undefined>;
  /** Lists all areas (oblast-level regions). */
  getAreas(): Promise<Area[]>;
  /** Lists streets within a city, optionally narrowed by a search string. */
  getStreet(params: GetStreetParams): Promise<Street[]>;
  /** Searches streets within a settlement by name; resolves `undefined` when nothing matches. */
  searchSettlementStreets(
    params: SearchSettlementStreetsParams,
  ): Promise<SearchWrapper<StreetAddress> | undefined>;
  /** Lists warehouses, optionally narrowed by {@link GetWarehousesFilters}. */
  getWarehouses(filters?: GetWarehousesFilters): Promise<Warehouse[]>;
  /** Lists the warehouse types warehouses can be categorized under. */
  getWarehouseTypes(): Promise<WarehouseType[]>;
  /** Saves a new address for a counterparty. */
  save(payload: SaveAddressPayload): Promise<SavedAddress | undefined>;
  /**
   * Full-replace: every field on `payload` is mandatory (AC-05). An omitted key is never treated
   * as "leave unchanged" — supply the complete, current set of fields to avoid silently wiping one.
   */
  update(payload: UpdateAddressPayload): Promise<SavedAddress | undefined>;
  /** Deletes a saved address. */
  delete(payload: DeleteAddressPayload): Promise<DeletedAddress | undefined>;
  /** Narrows `getCities` by `FindByString` — one call, same shape `getCities` returns, no
   *  post-call re-filtering or reshaping of the result (AC-11 / `contracts/public-api.md` §6). */
  findCityByName(name: string): Promise<City[]>;
}

async function firstOrUndefined<T>(
  client: NovaPoshtaClient,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
): Promise<T | undefined> {
  const records = await client.request<T>("Address", calledMethod, methodProperties);
  return records[0];
}

/** Creates the {@link AddressModule} bound to the given {@link NovaPoshtaClient}. */
export function createAddressModule(client: NovaPoshtaClient): AddressModule {
  const module: AddressModule = {
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
    save: (payload: SaveAddressPayload) =>
      firstOrUndefined<SavedAddress>(client, "save", payload as unknown as Record<string, unknown>),
    update: (payload: UpdateAddressPayload) =>
      firstOrUndefined<SavedAddress>(client, "update", payload as unknown as Record<string, unknown>),
    delete: (payload: DeleteAddressPayload) =>
      firstOrUndefined<DeletedAddress>(client, "delete", payload as unknown as Record<string, unknown>),
    findCityByName: (name: string) => module.getCities({ FindByString: name }),
  };
  return module;
}
