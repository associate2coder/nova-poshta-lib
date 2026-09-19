---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-20"
feature_size: ""
ticket: ""
---

# 0001 — Build the Nova Poshta client as a dependency-light TypeScript/Node.js library

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** User (project owner) + Architect (survey session)

## Context

The project is a client library for the Nova Poshta API (https://developers.novaposhta.ua/documentation),
meant to be installed into other Node/TypeScript projects. No code exists yet — this is the
greenfield foundation decision that everything else (build format, tests, release) builds on.

## Decision drivers

- Consumers install this from npm/GitHub into their own TypeScript projects — the library must ship types natively.
- The Nova Poshta API is a single HTTPS JSON endpoint; no need for a heavy HTTP client or framework.
- Fewer runtime dependencies means less supply-chain surface for a public, widely-installed package.

## Considered options

1. **TypeScript + Node.js, no framework, native `fetch`** — the language is TypeScript itself, targeting Node >=18 where `fetch` is built in.
2. **TypeScript + `axios`** — same language, but pulls in `axios` as a runtime dependency for HTTP.
3. **Plain JavaScript + hand-written `.d.ts`** — avoids a TS build step but pushes type accuracy onto manually maintained declaration files.

## Decision outcome

**Chosen:** Option 1 (TypeScript + Node >=18 + native `fetch`). Native `fetch` removes a runtime
dependency entirely (no `axios`, no `node-fetch`) while TypeScript gives consumers real, type-checked
interfaces instead of hand-maintained `.d.ts` files that drift from the implementation.

## Consequences

**Positive**
- Zero HTTP-client runtime dependency — smaller install, smaller attack surface for a public package.
- Types are generated from the same source as the implementation — they cannot silently drift.

**Negative**
- Consumers on Node <18 (or old bundler targets without `fetch` polyfills) cannot use the library without a polyfill.

**Neutral**
- Switching to `axios` later is possible (isolated in `src/client.ts`) but would reintroduce a dependency the current design avoids.

## Links

- Spec: N/A — greenfield foundation, predates any feature spec.
- SAD: N/A — captured directly in [[../architecture-map.md]].
- Related ADR: [[0002-modular-domain-layout-dual-build]]
