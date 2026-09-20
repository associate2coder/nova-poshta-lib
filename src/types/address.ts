import type { OpenEnum } from "./common.js";

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

export interface GetCitiesFilters {
  Ref?: string;
  FindByString?: string;
  Page?: number;
  Limit?: number;
}
export interface City extends AddressReferenceRecordBase {
  DescriptionRu?: string;
  Area?: string;
  SettlementType?: string;
  IsBranch?: OpenEnum<"0" | "1">;
  CityID?: string;
}

export interface GetSettlementsFilters {
  AreaRef?: string;
  Ref?: string;
  Warehouse?: OpenEnum<"0" | "1">;
  FindByString?: string;
  Page?: number;
  Limit?: number;
}
export interface Settlement extends AddressReferenceRecordBase {
  DescriptionRu?: string;
  Area?: string;
  RegionsDescription?: string;
  SettlementTypeDescription?: string;
}

export interface SearchSettlementsParams {
  CityName: string;
  Limit?: number;
}
export interface SettlementAddress extends AddressReferenceRecordBase {
  DeliveryCity?: string;
  StreetsAvailability?: boolean;
  ParentRegionTypeDescription?: string;
  ParentRegionCode?: string;
  RegionTypeDescription?: string;
  SettlementTypeCode?: string;
  Present?: string;
}

export type Area = AddressReferenceRecordBase;

export interface GetStreetParams {
  CityRef: string;
  FindByString?: string;
  Page?: number;
  Limit?: number;
}
export interface Street extends AddressReferenceRecordBase {
  StreetsType?: string;
  StreetsTypeDescription?: string;
  Location?: { lat?: string; lon?: string };
}

export interface SearchSettlementStreetsParams {
  StreetName: string;
  SettlementRef: string;
  Limit?: number;
}
export interface StreetAddress extends AddressReferenceRecordBase {
  SettlementRef?: string;
  SettlementStreetRef?: string;
  Location?: { lat?: string; lon?: string };
  StreetsTypeDescription?: string;
  Present?: string;
}

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

export type WarehouseType = AddressReferenceRecordBase;

export interface SaveAddressPayload {
  CounterpartyRef: string;
  StreetRef: string;
  BuildingNumber: string;
  Flat?: string;
  Note?: string;
}
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

export interface DeleteAddressPayload {
  Ref: string;
}
export interface DeletedAddress {
  Ref: string;
}
