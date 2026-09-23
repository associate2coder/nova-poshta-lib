import type { NovaPoshtaClient } from "../../client.js";
import type {
  CheckReturnEditPossiblePayload,
  CheckReturnEditPossibleResult,
  CheckReturnPossiblePayload,
  CreateReturnPayload,
  OrderPricingEstimate,
  ReturnAddressOption,
  ReturnEditInfo,
  ReturnEditOption,
  SavedReturnOrder,
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
  };
}
