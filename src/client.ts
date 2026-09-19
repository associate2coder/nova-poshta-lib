import type { NovaPoshtaEnvelope } from "./types/common.js";

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
  request<T>(modelName: string, calledMethod: string, methodProperties?: Record<string, unknown>): Promise<T[]>;
}

export function createClient(apiKey: string): NovaPoshtaClient {
  return {
    async request<T>(
      modelName: string,
      calledMethod: string,
      methodProperties: Record<string, unknown> = {},
    ): Promise<T[]> {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
      });

      if (!response.ok) {
        throw new NovaPoshtaApiError(`Nova Poshta API request failed with status ${response.status}`);
      }

      const envelope = (await response.json()) as NovaPoshtaEnvelope<T>;

      if (!envelope.success) {
        throw new NovaPoshtaApiError(
          envelope.errors.join("; ") || "Nova Poshta API returned an unsuccessful response",
          envelope.errors,
          envelope.errorCodes,
          envelope.warnings,
        );
      }

      return envelope.data;
    },
  };
}
