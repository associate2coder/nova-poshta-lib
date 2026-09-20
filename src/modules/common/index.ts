import type { NovaPoshtaClient } from "../../client.js";
import type {
  AlternativePayerType,
  CargoDescription,
  CargoDescriptionFilters,
  CargoType,
  CounterpartyType,
  DocumentStatus,
  OwnershipForm,
  Pallet,
  PayerType,
  PayerTypeForRedelivery,
  PaymentForm,
  ServiceType,
  TimeInterval,
  TimeIntervalFilters,
  TireWheel,
  Tray,
} from "../../types/common.js";

export interface CommonModule {
  getCargoTypes(): Promise<CargoType[]>;
  getBackwardDeliveryCargoTypes(): Promise<CargoType[]>;
  getCargoDescriptionList(filters?: CargoDescriptionFilters): Promise<CargoDescription[]>;
  getDocumentStatuses(): Promise<DocumentStatus[]>;
  getOwnershipFormsList(): Promise<OwnershipForm[]>;
  getPalletsList(): Promise<Pallet[]>;
  getPaymentForms(): Promise<PaymentForm[]>;
  getServiceTypes(): Promise<ServiceType[]>;
  getTimeIntervals(filters: TimeIntervalFilters): Promise<TimeInterval[]>;
  getTiresWheelsList(): Promise<TireWheel[]>;
  getTraysList(): Promise<Tray[]>;
  getTypesOfAlternativePayers(): Promise<AlternativePayerType[]>;
  getTypesOfPayers(): Promise<PayerType[]>;
  getTypesOfPayersForRedelivery(): Promise<PayerTypeForRedelivery[]>;
  getTypesOfCounterparties(): Promise<CounterpartyType[]>;
}

export function createCommonModule(client: NovaPoshtaClient): CommonModule {
  return {
    getCargoTypes: () => client.request<CargoType>("Common", "getCargoTypes"),
    getBackwardDeliveryCargoTypes: () => client.request<CargoType>("Common", "getBackwardDeliveryCargoTypes"),
    getCargoDescriptionList: (filters?: CargoDescriptionFilters) =>
      client.request<CargoDescription>("Common", "getCargoDescriptionList", filters as Record<string, unknown>),
    getDocumentStatuses: () => client.request<DocumentStatus>("Common", "getDocumentStatuses"),
    getOwnershipFormsList: () => client.request<OwnershipForm>("Common", "getOwnershipFormsList"),
    getPalletsList: () => client.request<Pallet>("Common", "getPalletsList"),
    getPaymentForms: () => client.request<PaymentForm>("Common", "getPaymentForms"),
    getServiceTypes: () => client.request<ServiceType>("Common", "getServiceTypes"),
    getTimeIntervals: (filters: TimeIntervalFilters) =>
      client.request<TimeInterval>("Common", "getTimeIntervals", filters as unknown as Record<string, unknown>),
    getTiresWheelsList: () => client.request<TireWheel>("Common", "getTiresWheelsList"),
    getTraysList: () => client.request<Tray>("Common", "getTraysList"),
    getTypesOfAlternativePayers: () => client.request<AlternativePayerType>("Common", "getTypesOfAlternativePayers"),
    getTypesOfPayers: () => client.request<PayerType>("Common", "getTypesOfPayers"),
    getTypesOfPayersForRedelivery: () =>
      client.request<PayerTypeForRedelivery>("Common", "getTypesOfPayersForRedelivery"),
    getTypesOfCounterparties: () => client.request<CounterpartyType>("Common", "getTypesOfCounterparties"),
  };
}
