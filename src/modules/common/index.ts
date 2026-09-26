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

/** Read-only reference-list lookups shared across Nova Poshta's domain (cargo types, payment
 *  forms, payer types, …) — none of these methods take a wire ID, they enumerate the fixed sets
 *  other modules' fields point into. */
export interface CommonModule {
  /** Lists the cargo types selectable on a forward shipment. */
  getCargoTypes(): Promise<CargoType[]>;
  /** Lists the cargo types selectable on a backward-delivery (return) shipment. */
  getBackwardDeliveryCargoTypes(): Promise<CargoType[]>;
  /** Lists cargo descriptions, optionally narrowed to those matching a search string. */
  getCargoDescriptionList(filters?: CargoDescriptionFilters): Promise<CargoDescription[]>;
  /** Lists the possible statuses an internet document (shipment) can be in. */
  getDocumentStatuses(): Promise<DocumentStatus[]>;
  /** Lists the ownership forms usable when describing a counterparty's organization. */
  getOwnershipFormsList(): Promise<OwnershipForm[]>;
  /** Lists the pallet types selectable on a cargo shipment. */
  getPalletsList(): Promise<Pallet[]>;
  /** Lists the payment forms a shipment's cost can be settled with. */
  getPaymentForms(): Promise<PaymentForm[]>;
  /** Lists the delivery service types (e.g. warehouse-to-warehouse, door-to-door). */
  getServiceTypes(): Promise<ServiceType[]>;
  /** Lists the courier-visit time windows available for a recipient city, optionally on a
   *  specific date. */
  getTimeIntervals(filters: TimeIntervalFilters): Promise<TimeInterval[]>;
  /** Lists the tire/wheel cargo sub-types. */
  getTiresWheelsList(): Promise<TireWheel[]>;
  /** Lists the tray cargo sub-types. */
  getTraysList(): Promise<Tray[]>;
  /** Lists who besides sender/recipient may pay for a shipment. */
  getTypesOfAlternativePayers(): Promise<AlternativePayerType[]>;
  /** Lists who can pay for a shipment (sender, recipient, third party). */
  getTypesOfPayers(): Promise<PayerType[]>;
  /** Lists who can pay when a shipment is redelivered. */
  getTypesOfPayersForRedelivery(): Promise<PayerTypeForRedelivery[]>;
  /** Lists the counterparty categories the API recognizes. */
  getTypesOfCounterparties(): Promise<CounterpartyType[]>;
}

/** Creates the {@link CommonModule} bound to the given {@link NovaPoshtaClient}. */
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
