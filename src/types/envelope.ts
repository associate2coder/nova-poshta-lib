/** The raw JSON envelope shape Nova Poshta's API returns — `NovaPoshtaClient.request()` unwraps
 *  this to just `data`, discarding the rest on success; `requestEnvelope()` exposes more of it via
 *  {@link NovaPoshtaSuccessEnvelope}. Documented here for callers who want to understand or type
 *  the wire format directly (CLAUDE.md: "the shared envelope type"). */
export interface NovaPoshtaEnvelope<T> {
  success: boolean;
  data: T[];
  errors: string[];
  errorCodes?: string[];
  warnings: string[];
  info?: unknown;
}

/** The raw JSON request envelope every call sends to Nova Poshta — `apiKey`/`modelName`/
 *  `calledMethod`/`methodProperties`, built internally by `NovaPoshtaClient`'s methods
 *  (CLAUDE.md: "builds the... request envelope"). */
export interface NovaPoshtaRequest {
  apiKey: string;
  modelName: string;
  calledMethod: string;
  methodProperties: Record<string, unknown>;
}
