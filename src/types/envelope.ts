export interface NovaPoshtaEnvelope<T> {
  success: boolean;
  data: T[];
  errors: string[];
  errorCodes?: string[];
  warnings: string[];
  info?: unknown;
}

export interface NovaPoshtaRequest {
  apiKey: string;
  modelName: string;
  calledMethod: string;
  methodProperties: Record<string, unknown>;
}
