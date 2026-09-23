/** @internal Generic pattern type nested inside other exported types' fields (e.g.
 * `CounterpartyProperty`) — never itself a standalone public signature. */
export type OpenEnum<Known extends string> = Known | (string & {});

/** The `Ref`/`Description` shape shared by most of Nova Poshta's flat reference lists (cargo
 *  types, pallets, service types, …) — a shared shape, not internal-only plumbing. */
export interface ReferenceRecordBase {
  Ref?: string;
  Description?: string;
}

/** One entry from Nova Poshta's cargo-type reference list (`Common.getCargoTypes` /
 *  `getBackwardDeliveryCargoTypes`) — the `Ref` a shipment's `CargoType` field points at. */
export interface CargoType extends ReferenceRecordBase {} // eslint-disable-line @typescript-eslint/no-empty-object-type -- extends, not aliases, so TypeDoc renders its fields instead of a dangling name

/** One entry from Nova Poshta's cargo-description reference list
 *  (`Common.getCargoDescriptionList`), optionally filtered by {@link CargoDescriptionFilters}. */
export interface CargoDescription extends ReferenceRecordBase {} // eslint-disable-line @typescript-eslint/no-empty-object-type -- extends, not aliases, so TypeDoc renders its fields instead of a dangling name
/** Narrows {@link CargoDescription} lookups to descriptions matching a search string. */
export interface CargoDescriptionFilters {
  FindByString?: string;
}

/** One entry from Nova Poshta's internet-document status reference list
 *  (`Common.getDocumentStatuses`) — the set of values a shipment's status can take. */
export interface DocumentStatus extends ReferenceRecordBase {} // eslint-disable-line @typescript-eslint/no-empty-object-type -- extends, not aliases, so TypeDoc renders its fields instead of a dangling name

/** One entry from Nova Poshta's ownership-form reference list (`Common.getOwnershipFormsList`),
 *  e.g. sole proprietor vs. legal entity — used when describing a counterparty's organization. */
export interface OwnershipForm extends ReferenceRecordBase {
  FullName?: string;
}

/** One entry from Nova Poshta's pallet reference list (`Common.getPalletsList`) — the set of
 *  pallet types selectable on a cargo shipment. */
export interface Pallet extends ReferenceRecordBase {} // eslint-disable-line @typescript-eslint/no-empty-object-type -- extends, not aliases, so TypeDoc renders its fields instead of a dangling name

/** One entry from Nova Poshta's payment-form reference list (`Common.getPaymentForms`) — how a
 *  shipment's cost is settled (e.g. cash, non-cash). */
export interface PaymentForm {
  Ref?: OpenEnum<never>;
  Description?: string;
}

/** One entry from Nova Poshta's service-type reference list (`Common.getServiceTypes`) — the
 *  delivery service a shipment uses (e.g. warehouse-to-warehouse, door-to-door). */
export interface ServiceType extends ReferenceRecordBase {} // eslint-disable-line @typescript-eslint/no-empty-object-type -- extends, not aliases, so TypeDoc renders its fields instead of a dangling name

/** One selectable courier-visit time window, as returned by `Common.getTimeIntervals`. */
export interface TimeInterval {
  Number?: string;
  Start?: string;
  End?: string;
}
/** Scopes a {@link TimeInterval} lookup to a recipient city and, optionally, a specific date. */
export interface TimeIntervalFilters {
  RecipientCityRef: string;
  DateTime?: string;
}

/** One entry from Nova Poshta's tire/wheel reference list (`Common.getTiresWheelsList`) — a cargo
 *  sub-type selectable for shipments carrying tires or wheels. */
export interface TireWheel extends ReferenceRecordBase {} // eslint-disable-line @typescript-eslint/no-empty-object-type -- extends, not aliases, so TypeDoc renders its fields instead of a dangling name

/** One entry from Nova Poshta's tray reference list (`Common.getTraysList`) — a cargo sub-type
 *  selectable for shipments carrying trays. */
export interface Tray extends ReferenceRecordBase {} // eslint-disable-line @typescript-eslint/no-empty-object-type -- extends, not aliases, so TypeDoc renders its fields instead of a dangling name

/** One entry from Nova Poshta's alternative-payer-type reference list
 *  (`Common.getTypesOfAlternativePayers`) — who besides sender/recipient may pay for a shipment. */
export interface AlternativePayerType extends ReferenceRecordBase {} // eslint-disable-line @typescript-eslint/no-empty-object-type -- extends, not aliases, so TypeDoc renders its fields instead of a dangling name

/** One entry from Nova Poshta's payer-type reference list (`Common.getTypesOfPayers`) — who pays
 *  for a shipment (sender, recipient, or a third party). */
export interface PayerType {
  Ref?: OpenEnum<never>;
  Description?: string;
}

/** One entry from Nova Poshta's redelivery-payer-type reference list
 *  (`Common.getTypesOfPayersForRedelivery`) — who pays when a shipment is redelivered. */
export interface PayerTypeForRedelivery extends ReferenceRecordBase {} // eslint-disable-line @typescript-eslint/no-empty-object-type -- extends, not aliases, so TypeDoc renders its fields instead of a dangling name

/** One entry from Nova Poshta's counterparty-type reference list
 *  (`Common.getTypesOfCounterparties`) — the set of counterparty categories the API recognizes. */
export interface CounterpartyType {
  Ref?: OpenEnum<never>;
  Description?: string;
}
