const API_URL = "https://api.novaposhta.ua/v2.0/json/";

/** Thrown whenever a Nova Poshta API call fails — a non-2xx HTTP response, an unsuccessful
 *  envelope (`success: false`), a network/parse failure, or a success envelope with no usable
 *  data. Carries Nova Poshta's own `errors`/`errorCodes`/`warnings` from the envelope, when the
 *  failure came from one; empty arrays otherwise (CLAUDE.md: "a single `NovaPoshtaApiError`...
 *  thrown whenever the envelope's `success` is `false` or the HTTP call fails"). */
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

/** A successful envelope's data plus its success-path `errors`/`warnings` — normally discarded by
 *  `request()`, which returns only `data`. Exposed by `requestEnvelope()` for the rare caller that
 *  needs Nova Poshta's own success-path explanation for individual items in a batch response (e.g.
 *  `internet-document`'s `delete`, AC-08) — every other module only ever needs `request()`. */
export interface NovaPoshtaSuccessEnvelope<T> {
  data: T[];
  errors: string[];
  warnings: string[];
  /** Passed through as-is from the raw envelope's own `info` field (ADR-0001) — present on some
   *  Nova Poshta responses (e.g. payment-form defaults), absent on most. */
  info?: unknown;
}

/** The core client every domain module's factory is built on — sends the `apiKey`/`modelName`/
 *  `calledMethod`/`methodProperties` request envelope to Nova Poshta and unwraps the response,
 *  throwing {@link NovaPoshtaApiError} on any failure (CLAUDE.md's `src/client.ts` contract). Most
 *  callers only ever need {@link NovaPoshtaClient.request}; the other three methods cover the
 *  cases the API's response shape doesn't fit a plain navigable list. */
export interface NovaPoshtaClient {
  /** The caller's own Nova Poshta API key. Exposed read-only for the rare code path that must embed
   *  it outside the JSON envelope (e.g. `internet-document`'s print-link construct-then-verify helper,
   *  ADR-0003) — every other module reaches Nova Poshta exclusively through `request()`. */
  readonly apiKey: string;
  /** Calls a Nova Poshta method and resolves its `data` array — the common case for every module
   *  method that returns a navigable list. Throws {@link NovaPoshtaApiError} if the HTTP call
   *  fails, the envelope reports `success: false`, or `data` is not an array. */
  request<T>(modelName: string, calledMethod: string, methodProperties?: Record<string, unknown>): Promise<T[]>;
  /** Same validation/error contract as `request()` (throws `NovaPoshtaApiError` under the same
   *  conditions), but resolves the full success-path envelope instead of just `data`. */
  requestEnvelope<T>(
    modelName: string,
    calledMethod: string,
    methodProperties?: Record<string, unknown>,
  ): Promise<NovaPoshtaSuccessEnvelope<T>>;
  /** Same validation/error contract as `request()`, but resolves only the first element of the
   *  returned array — and throws `NovaPoshtaApiError` (naming `modelName`/`calledMethod`) if that
   *  array is empty (ADR-0002). */
  requestFirst<T>(modelName: string, calledMethod: string, methodProperties?: Record<string, unknown>): Promise<T>;
  /** For the rare Nova Poshta method whose successful `data` is a single object, not a navigable
   *  list — confirmed live against `ScanSheet.deleteScanSheet` (2026-09-23), whose `data` is
   *  `{ ScanSheetRefs: { Success: [...], Errors: [...] } }`. Same success/error validation as
   *  `request()`, but skips its `Array.isArray(data)` check and resolves `data` as-is. */
  requestObject<T>(modelName: string, calledMethod: string, methodProperties?: Record<string, unknown>): Promise<T>;
}

/** Same wire shape as the public `NovaPoshtaEnvelope<T>` (re-exported for consumers who expect
 *  `data: T[]`), but generic over `data`'s actual shape rather than assuming a list — used only
 *  internally by `fetchEnvelope`, since `ScanSheet.deleteScanSheet` confirmed live that `data` is
 *  sometimes a single object, not an array. */
interface RawEnvelope<D> {
  success: boolean;
  data: D;
  errors: string[];
  errorCodes?: string[];
  warnings: string[];
  info?: unknown;
}

/** Creates a {@link NovaPoshtaClient} bound to the given API key. The key is held read-only and
 *  non-enumerable on the returned client — it never appears in `JSON.stringify`/`console.log`
 *  output, only via the explicit `.apiKey` property. */
export function createClient(apiKey: string): NovaPoshtaClient {
  /** Fetches + parses the envelope and enforces the success/error contract — but does not assume
   *  `data`'s shape, since one confirmed Nova Poshta method (`ScanSheet.deleteScanSheet`) returns a
   *  single object there, not a list. Callers that need a navigable list assert that themselves. */
  async function fetchEnvelope<D>(
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, unknown>,
  ): Promise<{ data: D; errors: string[]; warnings: string[]; info?: unknown }> {
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

    let envelope: RawEnvelope<D>;
    try {
      envelope = (await response.json()) as RawEnvelope<D>;
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

    return {
      data: envelope.data,
      errors: Array.isArray(envelope.errors) ? envelope.errors : [],
      warnings: Array.isArray(envelope.warnings) ? envelope.warnings : [],
      info: envelope.info,
    };
  }

  async function sendRequest<T>(
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, unknown>,
  ): Promise<NovaPoshtaSuccessEnvelope<T>> {
    const envelope = await fetchEnvelope<T[]>(modelName, calledMethod, methodProperties);

    if (!Array.isArray(envelope.data)) {
      throw new NovaPoshtaApiError(
        `Nova Poshta API response for ${modelName}.${calledMethod} was not a navigable list`,
      );
    }

    return envelope;
  }

  const client = {
    async request<T>(
      modelName: string,
      calledMethod: string,
      methodProperties: Record<string, unknown> = {},
    ): Promise<T[]> {
      const envelope = await sendRequest<T>(modelName, calledMethod, methodProperties);
      return envelope.data;
    },
    requestEnvelope<T>(
      modelName: string,
      calledMethod: string,
      methodProperties: Record<string, unknown> = {},
    ): Promise<NovaPoshtaSuccessEnvelope<T>> {
      return sendRequest<T>(modelName, calledMethod, methodProperties);
    },
    async requestFirst<T>(
      modelName: string,
      calledMethod: string,
      methodProperties: Record<string, unknown> = {},
    ): Promise<T> {
      const records = await client.request<T>(modelName, calledMethod, methodProperties);
      const [first] = records;
      if (first === undefined) {
        throw new NovaPoshtaApiError(
          `Nova Poshta API response for ${modelName}.${calledMethod} reported success but returned no record`,
        );
      }
      return first;
    },
    async requestObject<T>(
      modelName: string,
      calledMethod: string,
      methodProperties: Record<string, unknown> = {},
    ): Promise<T> {
      const envelope = await fetchEnvelope<T>(modelName, calledMethod, methodProperties);
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
