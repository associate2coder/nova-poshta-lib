import type { NovaPoshtaEnvelope } from "./types/envelope.js";

const API_URL = "https://api.novaposhta.ua/v2.0/json/";

export class NovaPoshtaApiError extends Error {
  readonly errors: string[];
  readonly errorCodes: string[];
  readonly warnings: string[];

  constructor(message: string, errors: string[] = [], errorCodes: string[] = [], warnings: string[] = []) {
    super(message);
    this.name = "NovaPoshtaApiError";
    this.errors = errors;
    this.errorCodes = errorCodes;
    this.warnings = warnings;
  }
}

export interface NovaPoshtaClient {
  /** The caller's own Nova Poshta API key. Exposed read-only for the rare code path that must embed
   *  it outside the JSON envelope (e.g. `internet-document`'s print-link construct-then-verify helper,
   *  ADR-0003) — every other module reaches Nova Poshta exclusively through `request()`. */
  readonly apiKey: string;
  request<T>(modelName: string, calledMethod: string, methodProperties?: Record<string, unknown>): Promise<T[]>;
}

export function createClient(apiKey: string): NovaPoshtaClient {
  const client = {
    async request<T>(
      modelName: string,
      calledMethod: string,
      methodProperties: Record<string, unknown> = {},
    ): Promise<T[]> {
      let response: Response;
      try {
        response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
        });
      } catch (cause) {
        throw new NovaPoshtaApiError(
          `Nova Poshta API request for ${modelName}.${calledMethod} failed: ${(cause as Error).message}`,
        );
      }

      if (!response.ok) {
        throw new NovaPoshtaApiError(`Nova Poshta API request failed with status ${response.status}`);
      }

      let envelope: NovaPoshtaEnvelope<T>;
      try {
        envelope = (await response.json()) as NovaPoshtaEnvelope<T>;
      } catch (cause) {
        throw new NovaPoshtaApiError(
          `Nova Poshta API response for ${modelName}.${calledMethod} was not valid JSON: ${(cause as Error).message}`,
        );
      }

      if (!envelope.success) {
        const errors = Array.isArray(envelope.errors) ? envelope.errors : [];
        const errorCodes = Array.isArray(envelope.errorCodes) ? envelope.errorCodes : undefined;
        const warnings = Array.isArray(envelope.warnings) ? envelope.warnings : [];
        throw new NovaPoshtaApiError(
          errors.join("; ") || "Nova Poshta API returned an unsuccessful response",
          errors,
          errorCodes,
          warnings,
        );
      }

      if (!Array.isArray(envelope.data)) {
        throw new NovaPoshtaApiError(
          `Nova Poshta API response for ${modelName}.${calledMethod} was not a navigable list`,
        );
      }

      return envelope.data;
    },
  };

  // Defined non-enumerable so JSON.stringify(client)/Object.keys(client)/console.log(client)
  // never surface the raw key (review 2026-09-21 finding 3) — still readable via client.apiKey
  // for the one code path that needs it outside the envelope (internet-document's print-link
  // construct-then-verify helper, ADR-0003).
  Object.defineProperty(client, "apiKey", {
    value: apiKey,
    enumerable: false,
    writable: false,
  });

  return client as NovaPoshtaClient;
}
