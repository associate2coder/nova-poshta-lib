import type { OpenEnum } from "./common.js";

/** @internal Base shape extended by the public address types — never itself a standalone public
 * signature. */
export interface AddressReferenceRecordBase {
  Ref?: string;
  Description?: string;
}

/** AC-03: the wrapper searchSettlements / searchSettlementStreets return verbatim — never unwrapped
 *  to just `Addresses`. `T` is the per-method match record shape. */
export interface SearchWrapper<T> {
  TotalCount?: number;
  Addresses?: T[];
}

/** Narrows `Address.getCities` to a specific city `Ref`, a search string, or a page/limit slice. */
export interface GetCitiesFilters {
  Ref?: string;
  FindByString?: string;
  Page?: number;
  Limit?: number;
}
/** A Nova Poshta city record, as returned by `Address.getCities`. */
export interface City extends AddressReferenceRecordBase {
  DescriptionRu?: string;
  Area?: string;
  SettlementType?: string;
  IsBranch?: OpenEnum<"0" | "1">;
  CityID?: string;
}

/** Narrows `Address.getSettlements` to an area, a specific settlement `Ref`, warehouse
 *  availability, a search string, or a page/limit slice. */
export interface GetSettlementsFilters {
  AreaRef?: string;
  Ref?: string;
  Warehouse?: OpenEnum<"0" | "1">;
  FindByString?: string;
  Page?: number;
  Limit?: number;
}
/** A Nova Poshta settlement record, as returned by `Address.getSettlements` — broader than
 *  {@link City}, covering villages and other populated places. */
export interface Settlement extends AddressReferenceRecordBase {
  DescriptionRu?: string;
  Area?: string;
  RegionsDescription?: string;
  SettlementTypeDescription?: string;
}

/** Scopes `Address.searchSettlements` to settlements matching a city name. */
export interface SearchSettlementsParams {
  CityName: string;
  Limit?: number;
}
/** One settlement match from `Address.searchSettlements`, wrapped in {@link SearchWrapper}. */
export interface SettlementAddress extends AddressReferenceRecordBase {
  DeliveryCity?: string;
  StreetsAvailability?: boolean;
  ParentRegionTypeDescription?: string;
  ParentRegionCode?: string;
  RegionTypeDescription?: string;
  SettlementTypeCode?: string;
  Present?: string;
}

/** A Nova Poshta area (oblast-level region) record, as returned by `Address.getAreas`. */
export type Area = AddressReferenceRecordBase;

/** Scopes `Address.getStreet` to a city and, optionally, a search string or page/limit slice. */
export interface GetStreetParams {
  CityRef: string;
  FindByString?: string;
  Page?: number;
  Limit?: number;
}
/** A Nova Poshta street record, as returned by `Address.getStreet`. */
export interface Street extends AddressReferenceRecordBase {
  StreetsType?: string;
  StreetsTypeDescription?: string;
  Location?: { lat?: string; lon?: string };
}

/** Scopes `Address.searchSettlementStreets` to a street name within a specific settlement. */
export interface SearchSettlementStreetsParams {
  StreetName: string;
  SettlementRef: string;
  Limit?: number;
}
/** One street match from `Address.searchSettlementStreets`, wrapped in {@link SearchWrapper}. */
export interface StreetAddress extends AddressReferenceRecordBase {
  SettlementRef?: string;
  SettlementStreetRef?: string;
  Location?: { lat?: string; lon?: string };
  StreetsTypeDescription?: string;
  Present?: string;
}

/** Narrows `Address.getWarehouses` by city, warehouse type, a search string, or a page/limit
 *  slice; `Language` selects the response's language. */
export interface GetWarehousesFilters {
  CityName?: string;
  CityRef?: string;
  Page?: number;
  Limit?: number;
  Language?: string;
  TypeOfWarehouseRef?: string;
  WarehouseId?: string;
  FindByString?: string;
}
/** A Nova Poshta warehouse (branch/locker) record, as returned by `Address.getWarehouses`. */
export interface Warehouse extends AddressReferenceRecordBase {
  Number?: string;
  CityRef?: string;
  CityDescription?: string;
  SettlementRef?: string;
  ShortAddress?: string;
  Phone?: string;
  TypeOfWarehouse?: string;
  WarehouseStatus?: string;
  Schedule?: Record<string, string>;
}

/** A Nova Poshta warehouse-type record, as returned by `Address.getWarehouseTypes`. */
export type WarehouseType = AddressReferenceRecordBase;

/** Creates a saved address for a counterparty. Every field is required by the wire method
 *  (`Address.save`); there is no partial-create variant. */
export interface SaveAddressPayload {
  CounterpartyRef: string;
  StreetRef: string;
  BuildingNumber: string;
  Flat?: string;
  Note?: string;
}
/** The address record `Address.save`/`update` resolve to. */
export interface SavedAddress {
  Ref: string;
  Description?: string;
  CounterpartyRef?: string;
  StreetRef?: string;
  BuildingNumber?: string;
  Flat?: string;
  Note?: string;
}

/** AC-05: every field `save` accepts is mandatory here — an omitted key is never "leave unchanged".
 *  Derived from SaveAddressPayload via a utility type so the two can't drift apart (sad.md §4-7). */
export type UpdateAddressPayload = Required<Omit<SaveAddressPayload, "CounterpartyRef">> & {
  Ref: string;
  CounterpartyRef: string;
};

/** Identifies the saved address `Address.delete` removes. */
export interface DeleteAddressPayload {
  Ref: string;
}
/** Confirms which saved address `Address.delete` removed. */
export interface DeletedAddress {
  Ref: string;
}
