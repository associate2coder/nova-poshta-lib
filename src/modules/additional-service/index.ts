import type { NovaPoshtaClient } from "../../client.js";
import type {
  CheckReturnEditPossiblePayload,
  CheckReturnEditPossibleResult,
  CheckReturnPossiblePayload,
  ReturnAddressOption,
  ReturnEditInfo,
  ReturnEditOption,
} from "../../types/additional-service.js";

export interface AdditionalServiceModule {
  /** public-api.md §3.1, AC-01/AC-02: delegates straight to client.request() — one destination
   *  choice per array element, NonCash included as a raw wire string (see types' own note). */
  checkReturnPossible(payload: CheckReturnPossiblePayload): Promise<ReturnAddressOption[]>;
  /** public-api.md §3.1, AC-06, ADR-0001: uses client.requestEnvelope() and assembles both the
   *  envelope's `data` and its `info` field into one result — `info` is narrowed to
   *  `ReturnEditInfo` here, since the client itself makes no assumption about its shape. */
  checkReturnEditPossible(payload: CheckReturnEditPossiblePayload): Promise<CheckReturnEditPossibleResult>;
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
  };
}
