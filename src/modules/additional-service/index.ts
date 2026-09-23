import type { NovaPoshtaClient } from "../../client.js";
import type {
  CheckRedirectEditPossiblePayload,
  CheckRedirectPossiblePayload,
  CheckReturnEditPossiblePayload,
  CheckReturnEditPossibleResult,
  CheckReturnPossiblePayload,
  CreateRedirectPayload,
  CreateReturnPayload,
  OrderListFilters,
  OrderPricingEstimate,
  RedirectOrderListItem,
  RedirectPossibility,
  ReturnAddressOption,
  ReturnEditInfo,
  ReturnEditOption,
  ReturnOrderListItem,
  ReturnReason,
  ReturnReasonSubtype,
  ReturnReasonSubtypeFilters,
  SavedRedirectOrder,
  SavedReturnOrder,
  UpdateRedirectPayload,
  UpdateReturnPayload,
} from "../../types/additional-service.js";

export interface AdditionalServiceModule {
  /** public-api.md §3.1, AC-01/AC-02: delegates straight to client.request() — one destination
   *  choice per array element, NonCash included as a raw wire string (see types' own note). */
  checkReturnPossible(payload: CheckReturnPossiblePayload): Promise<ReturnAddressOption[]>;
  /** public-api.md §3.1, AC-06, ADR-0001: uses client.requestEnvelope() and assembles both the
   *  envelope's `data` and its `info` field into one result — `info` is narrowed to
   *  `ReturnEditInfo` here, since the client itself makes no assumption about its shape. */
  checkReturnEditPossible(payload: CheckReturnEditPossiblePayload): Promise<CheckReturnEditPossibleResult>;
  /** public-api.md §3.1/§5, AC-03: strips the TS-only Destination discriminant and sets
   *  OrderType: "orderCargoReturn" internally before calling save/orderCargoReturn via
   *  client.requestFirst(). */
  createReturn(payload: CreateReturnPayload): Promise<SavedReturnOrder>;
  /** public-api.md §3.1/§5, AC-05: same wire call and payload builder as createReturn, plus
   *  OnlyGetPricing: "1" — returns a pricing estimate and creates no order. */
  calculateReturn(payload: CreateReturnPayload): Promise<OrderPricingEstimate>;
  /** public-api.md §3.1/§5, AC-06/AC-07: passes the payload through as-is to update via
   *  client.requestFirst() — no client-side status check; Nova Poshta's own decline (a non-Accepted
   *  return) is the sole enforcer (AC-07). Response shape is genuinely ambiguous (types' own note),
   *  so it's returned loosely typed rather than falsely precisely. */
  updateReturn(payload: UpdateReturnPayload): Promise<Record<string, unknown>>;
  /** public-api.md §3.1/§5, AC-08: thin pass-through to client.request() — filters (Number, Ref,
   *  BeginDate, EndDate, Page, Limit) travel to the wire unmodified; no client-side re-filtering,
   *  sorting, or pagination. */
  getReturnOrdersList(filters?: OrderListFilters): Promise<ReturnOrderListItem[]>;
  /** public-api.md §3.1/§5, AC-08: thin pass-through to client.request(); no arguments in the
   *  public signature — Nova Poshta's own getReturnReasons takes none. */
  getReturnReasons(): Promise<ReturnReason[]>;
  /** public-api.md §3.1/§5, AC-08: thin pass-through to client.request() — ReasonRef travels to
   *  the wire unmodified; no client-side re-filtering. */
  getReturnReasonsSubtypes(filters?: ReturnReasonSubtypeFilters): Promise<ReturnReasonSubtype[]>;
  /** public-api.md §3.2/§5, AC-09, sad.md §5's asymmetry note: unlike checkReturnPossible's array
   *  of destination choices, checkPossibilityForRedirecting resolves ONE info record — uses
   *  client.requestFirst(), not client.request(). */
  checkRedirectPossible(payload: CheckRedirectPossiblePayload): Promise<RedirectPossibility>;
  /** public-api.md §3.2/§5, AC-12: same wire calledMethod as checkRedirectPossible, dispatched by
   *  payload shape (OrderRef + fields) — resolves the same record type, partially populated. */
  checkRedirectEditPossible(payload: CheckRedirectEditPossiblePayload): Promise<Partial<RedirectPossibility>>;
  /** public-api.md §3.2/§5, AC-09/AC-10: unlike createReturn's Destination, CreateRedirectPayload has
   *  no discriminant to strip — it's forwarded to save/orderRedirecting as-is via client.requestFirst(),
   *  with OrderType: "orderRedirecting" set internally, never caller-settable. AC-10: Recipient (a
   *  counterparty Ref from the counterparty module) travels through unmodified — no ownership/existence
   *  check of this module's own. */
  createRedirect(payload: CreateRedirectPayload): Promise<SavedRedirectOrder>;
  /** public-api.md §3.2/§5, AC-11: same wire call and payload as createRedirect, plus
   *  OnlyGetPricing: "1" — returns a pricing estimate and creates no order. */
  calculateRedirect(payload: CreateRedirectPayload): Promise<OrderPricingEstimate>;
  /** public-api.md §3.2/§5, AC-12/AC-13: passes the payload through as-is to update via
   *  client.requestFirst() — no role field is added and no client-side role check is performed;
   *  Nova Poshta infers sender-vs-recipient solely from the calling API key, and a field-permission
   *  decline (AC-13) surfaces as Nova Poshta's own NovaPoshtaApiError, unmodified. */
  updateRedirect(payload: UpdateRedirectPayload): Promise<Record<string, unknown>>;
  /** public-api.md §3.2/§5, AC-14: thin pass-through to client.request() — filters travel to the
   *  wire unmodified, same OrderListFilters shape as getReturnOrdersList. */
  getRedirectionOrdersList(filters?: OrderListFilters): Promise<RedirectOrderListItem[]>;
}

/** AC-03/AC-04/AC-05, sad.md §4 decision 4: shared builder for createReturn/calculateReturn — strips
 *  CreateReturnPayload's own Destination discriminant (TS-only, no wire counterpart) and sets
 *  OrderType: "orderCargoReturn" internally, never caller-settable. Matches internet-document's
 *  save() precedent of stripping a discriminated union's tag field before the wire call. */
function buildCreateReturnMethodProperties(payload: CreateReturnPayload): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...payload };
  delete rest.Destination;
  return { ...rest, OrderType: "orderCargoReturn" };
}

export function createAdditionalServiceModule(client: NovaPoshtaClient): AdditionalServiceModule {
  return {
    checkReturnPossible: (payload: CheckReturnPossiblePayload) =>
      client.request<ReturnAddressOption>(
        "AdditionalServiceGeneral",
        "CheckPossibilityCreateReturn",
        payload as unknown as Record<string, unknown>,
      ),
    checkReturnEditPossible: async (payload: CheckReturnEditPossiblePayload) => {
      const envelope = await client.requestEnvelope<ReturnEditOption>(
        "AdditionalServiceGeneral",
        "CheckPossibilityCreateReturn",
        payload as unknown as Record<string, unknown>,
      );
      return { options: envelope.data, info: envelope.info as ReturnEditInfo };
    },
    createReturn: (payload: CreateReturnPayload) =>
      client.requestFirst<SavedReturnOrder>(
        "AdditionalServiceGeneral",
        "save",
        buildCreateReturnMethodProperties(payload),
      ),
    calculateReturn: (payload: CreateReturnPayload) =>
      client.requestFirst<OrderPricingEstimate>("AdditionalServiceGeneral", "save", {
        ...buildCreateReturnMethodProperties(payload),
        OnlyGetPricing: "1",
      }),
    updateReturn: (payload: UpdateReturnPayload) =>
      client.requestFirst<Record<string, unknown>>(
        "AdditionalServiceGeneral",
        "update",
        payload as unknown as Record<string, unknown>,
      ),
    getReturnOrdersList: (filters?: OrderListFilters) =>
      client.request<ReturnOrderListItem>(
        "AdditionalServiceGeneral",
        "getReturnOrdersList",
        (filters ?? {}) as unknown as Record<string, unknown>,
      ),
    getReturnReasons: () =>
      client.request<ReturnReason>("AdditionalServiceGeneral", "getReturnReasons", {}),
    getReturnReasonsSubtypes: (filters?: ReturnReasonSubtypeFilters) =>
      client.request<ReturnReasonSubtype>(
        "AdditionalServiceGeneral",
        "getReturnReasonsSubtypes",
        (filters ?? {}) as unknown as Record<string, unknown>,
      ),
    checkRedirectPossible: (payload: CheckRedirectPossiblePayload) =>
      client.requestFirst<RedirectPossibility>(
        "AdditionalServiceGeneral",
        "checkPossibilityForRedirecting",
        payload as unknown as Record<string, unknown>,
      ),
    checkRedirectEditPossible: (payload: CheckRedirectEditPossiblePayload) =>
      client.requestFirst<Partial<RedirectPossibility>>(
        "AdditionalServiceGeneral",
        "checkPossibilityForRedirecting",
        payload as unknown as Record<string, unknown>,
      ),
    createRedirect: (payload: CreateRedirectPayload) =>
      client.requestFirst<SavedRedirectOrder>("AdditionalServiceGeneral", "save", {
        ...payload,
        OrderType: "orderRedirecting",
      } as unknown as Record<string, unknown>),
    calculateRedirect: (payload: CreateRedirectPayload) =>
      client.requestFirst<OrderPricingEstimate>("AdditionalServiceGeneral", "save", {
        ...payload,
        OrderType: "orderRedirecting",
        OnlyGetPricing: "1",
      } as unknown as Record<string, unknown>),
    updateRedirect: (payload: UpdateRedirectPayload) =>
      client.requestFirst<Record<string, unknown>>(
        "AdditionalServiceGeneral",
        "update",
        payload as unknown as Record<string, unknown>,
      ),
    getRedirectionOrdersList: (filters?: OrderListFilters) =>
      client.request<RedirectOrderListItem>(
        "AdditionalServiceGeneral",
        "getRedirectionOrdersList",
        (filters ?? {}) as unknown as Record<string, unknown>,
      ),
  };
}
