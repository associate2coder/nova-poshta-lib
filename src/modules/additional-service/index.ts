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
  };
}
