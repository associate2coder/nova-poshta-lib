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

## API-contract sourcing policy

External API fields may not become acceptance criteria solely because another generated artifact
(a spec, a SAD, an ADR, a prior module's contract) says so. Before implementation, every request
field and wire method must be traced directly to an authoritative source — Nova Poshta's own
documentation — or, when that's unreachable, at least two independent third-party implementations
that agree. The agent must quote or list the exact upstream struct/schema used for the decision,
not just cite an SDK by name. Any discrepancy between sources blocks ship; a review may not PASS
while unresolved API-contract questions remain open.

## Commands

```sh
npm run build   # tsup — dual ESM+CJS build to dist/
npm test        # vitest run
npm run lint    # eslint
```
