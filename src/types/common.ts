export type OpenEnum<Known extends string> = Known | (string & {});

interface ReferenceRecordBase {
  Ref?: string;
  Description?: string;
}

export type CargoType = ReferenceRecordBase;

export type CargoDescription = ReferenceRecordBase;
export interface CargoDescriptionFilters {
  FindByString?: string;
}

export type DocumentStatus = ReferenceRecordBase;

export interface OwnershipForm extends ReferenceRecordBase {
  FullName?: string;
}

export type Pallet = ReferenceRecordBase;

export interface PaymentForm {
  Ref?: OpenEnum<never>;
  Description?: string;
}

export type ServiceType = ReferenceRecordBase;

export interface TimeInterval {
  Number?: string;
  Start?: string;
  End?: string;
}
export interface TimeIntervalFilters {
  RecipientCityRef: string;
  DateTime?: string;
}

export type TireWheel = ReferenceRecordBase;

export type Tray = ReferenceRecordBase;

export type AlternativePayerType = ReferenceRecordBase;

export interface PayerType {
  Ref?: OpenEnum<never>;
  Description?: string;
}

export type PayerTypeForRedelivery = ReferenceRecordBase;

export interface CounterpartyType {
  Ref?: OpenEnum<never>;
  Description?: string;
}
