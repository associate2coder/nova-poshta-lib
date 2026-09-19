---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-20"
feature_size: ""
ticket: ""
---

# 0002 — Organize by Nova Poshta API model, ship dual ESM+CJS via tsup

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** User (project owner) + Architect (survey session)

## Context

The real Nova Poshta API is one HTTPS POST endpoint that dispatches by `modelName` + `calledMethod`
(e.g. model `Address`, method `getCities`) — there is no per-resource URL routing to mirror. The
library also has to work for consumers on both `import` (ESM) and `require` (CJS) toolchains, since
we don't control what build system they use.

## Decision drivers

- The API's own shape (model/method dispatch) should drive the module boundaries, not an arbitrary REST-style guess.
- Consumers' projects vary between ESM and CJS — the package must not force one on them.
- New Nova Poshta models should be addable without touching existing modules (low blast radius per addition).

## Considered options

1. **`src/modules/<domain>/` mirroring each Nova Poshta model, built with `tsup` to dual ESM+CJS.**
2. **A flat `src/api.ts` with every method on one large client class** — simpler file layout, but the file grows unbounded as models are added and every change risks touching unrelated methods.
3. **ESM-only output** — simpler build, but breaks any consumer still on `require()`.

## Decision outcome

**Chosen:** Option 1. One folder per Nova Poshta model keeps each domain's methods and types
isolated (matches the API's own dispatch shape), and `tsup`'s dual build plus a `package.json`
`exports` map means both `import` and `require` consumers work without extra consumer-side config.

## Consequences

**Positive**
- Adding a new Nova Poshta model is additive — a new `src/modules/<domain>/` folder, no edits to existing ones.
- Consumers on either module system get a working import, unblocking adoption regardless of their toolchain.

**Negative**
- Slightly more build configuration than a single-entry ESM-only build (two output targets to keep in sync via `tsup`).

**Neutral**
- If the Nova Poshta API ever exposes a true REST-style surface, the per-model layout can be kept or flattened later — it's an internal folder structure, not part of the public API contract (`src/index.ts` re-exports regardless of internal layout).

## Links

- Spec: N/A — greenfield foundation, predates any feature spec.
- SAD: N/A — captured directly in [[../architecture-map.md]].
- Related ADR: [[0001-typescript-node-stack]]
