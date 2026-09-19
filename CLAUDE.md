# nova-poshta-lib

Typed TypeScript client library for the Nova Poshta API. No framework, no database — a stateless
library wrapping `fetch` calls to `https://api.novaposhta.ua/v2.0/json/`.

## Layout

- `src/client.ts` — core client: builds the `apiKey`/`modelName`/`calledMethod`/`methodProperties`
  request envelope, sends it, unwraps `success`/`errors`/`data`, throws on failure.
- `src/modules/<domain>/` — one folder per Nova Poshta API model (address, counterparty,
  internet-document, tracking-document, common, …). Each exports a factory taking the core
  `NovaPoshtaClient` and returning its typed methods.
- `src/types/` — request/response interfaces per model, plus the shared envelope type.
- `src/index.ts` — public surface: re-exports the client factory, domain modules, and types.

Adding a new domain module: mirror `src/modules/address/` (once it exists) — one `index.ts` built
on `NovaPoshtaClient.request()`, plus `src/types/<domain>.ts`, plus
`test/unit/modules/<domain>.test.ts` mocking `fetch`.

## Conventions

- **Errors:** a single `NovaPoshtaApiError` (extends `Error`) carries `errors[]`/`errorCodes[]`/
  `warnings[]`; thrown whenever the envelope's `success` is `false` or the HTTP call fails. No
  silent swallowing.
- **Tests:** Vitest. `test/unit/**` mocks `fetch` (no network) and runs in CI. `test/integration/**`
  hits the real API using `NOVA_POSHTA_TEST_API_KEY`; skipped automatically when that env var is
  absent.
- **No persistence:** the library holds no state and no IDs of its own — it passes through
  whatever the Nova Poshta API returns (refs, waybill numbers).

## Commands

```sh
npm run build   # tsup — dual ESM+CJS build to dist/
npm test        # vitest run
npm run lint    # eslint
```
