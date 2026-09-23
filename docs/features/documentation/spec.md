---
status: Draft
owner: "associate2coder"
reviewers: ["Tech Lead"]
updated_at: "2026-09-23"
feature_size: "S"
---

# Spec — documentation

> **Glossary:** [CONTEXT](../../../CONTEXT.md) (includes a new "contributor" entry added while drafting this spec — see §1)
> **Reference module / docs / channels used:** `docs/architecture-map.md`, `docs/roadmap.md`, `CONTRIBUTING.md`; `package.json` + `src/index.ts` (current public-export surface scanned directly to ground the ~150-symbol estimate and the internal-plumbing examples below). A competitive-research pass (TypeDoc-enforcement precedent across comparable open-source TypeScript client libraries) and a failure-mode pass (concrete production risks in this feature's design) both ran as part of drafting — see §1 ¶3/¶4 and §3/§6.1. No ticket/Confluence/knowledge-base channel available. This feature adds no new request field or wire method of its own, so CLAUDE.md's API-contract sourcing policy (which governs new fields entering the codebase) does not gate this feature the way it gates a domain module's spec — but the TSDoc prose it writes will describe existing wire behavior in plain language, and that prose must stay consistent with whatever sourcing each module's own already-shipped spec already established; this feature does not re-derive or re-verify that sourcing, only re-expresses it (see §3 non-goal on prose accuracy).

## 1. Context

Consuming developers integrating this library today have no generated, browsable reference for its public surface — the README carries short usage snippets, but there is no way to look up a method's exact parameters, return shape, or behavior without opening the library's TypeScript source directly. This is the last gap `docs/architecture-map.md`'s own foundation Intent names explicitly ("documented" is listed alongside "tested" and "branch-protected" as a day-one requirement) and the only one of the three still unmet, even though all seven domain modules have now shipped.

This is the roadmap's final step (step 8 of 8), deliberately sequenced last: it documents the complete public surface exactly once every module — `common`, `address`, `counterparty`, `internet-document`, `tracking-document`, `scan-sheet`, and `additional-service`, plus the core client — has already shipped, rather than documenting a moving target module-by-module. Nothing about it depends on a new module or a new release cadence; it is triggered purely by the fact that the surface it documents is now finished.

The committed approach is to add TSDoc comments to the library's whole current public surface (the core client plus all seven modules — on the order of 150 exported symbols as of 2026-09-23), generate a static reference site with TypeDoc, and enforce completeness in CI using TypeDoc's own three-flag combination (a documentation-required list, a check for anything missing from it, and a setting that turns that into a hard build failure) so a pull request that adds an undocumented export fails CI. A competitive-research pass found no comparable open-source TypeScript client library that has actually shipped this exact three-flag combination gating a pull request before — the closest precedent (the Model Context Protocol TypeScript SDK) validates but only warns, and the closest hard-fail precedent is TypeDoc's own documentation, not a peer library in production — so this feature includes a one-time validation spike that runs the check against this library's already-TSDoc'd codebase first, to catch false positives before the hard-fail rule is relied on for real. A failure-mode pass surfaced the risk that the generated site could show methods before they are actually installable if it rebuilt on every merge to main, since this repo's release process is a separate, later version-bump-PR step.

Decision override: the reference site rebuilds only when a new version actually reaches npm (the same moment the release workflow publishes), not on every merge to main — closing the gap the failure-mode pass surfaced. Decision override: internal-only re-exports (a shared record-base type, a lookup-table constant, and similar plumbing surfaced by the failure-mode pass — e.g. `AddressReferenceRecordBase`, `CounterpartyRecordBase`, `SearchWrapper`, `OpenEnum`, `TRACKING_STATUS_CODES`) are marked with TypeDoc's `@internal` tag and excluded from both the generated site and the CI coverage requirement, keeping the reference focused on what a consuming developer actually calls — the coverage requirement (§2, §5, §6) therefore always means "every **non-internal** exported symbol," not literally every export. Decision override: only type/function/parameter/return-level comments are required, not a comment on every individual field of a wire-shape type — this library's fields already mirror Nova Poshta's own field names, and per-field coverage would multiply the writing effort several-fold for comparatively little reader benefit. Decision override: this session also evaluated where the generated reference is hosted and settled on GitHub Pages — a free static-site host built into GitHub — as the concrete target; recorded here as a fixed decision for `design` to wire up, not to be re-litigated there.

## 2. Goals

- Every non-internal exported symbol across the core client and all 7 domain modules has TSDoc coverage enforced by CI, closing the last unmet "documented" requirement named in the project's own foundation intent.
- A generated, publicly browsable API reference exists at a stable URL and always matches the latest published npm version.
- Documentation coverage cannot silently regress — CI fails any future pull request that adds a non-internal exported symbol without its comment; turning that failure into an enforced merge-block is a one-time repo-settings step tracked in §8.

## 3. Non-goals

- Verifying that TSDoc prose stays factually accurate as the underlying wire behavior evolves is out of scope — no automated tool can check natural-language prose against actual API behavior; ordinary PR review remains the safeguard, the same as for any other code comment.
- Documenting every individual field of large wire-shape types is out of scope — one type-level comment plus documented function/parameter/return signatures is the scope; field names already mirror Nova Poshta's own naming.
- Archiving per-version documentation is out of scope — only the latest released version is shown; a developer pinned to an older version reads that version's own installed TSDoc comments directly instead.
- Registering the new CI check as a required branch-protection status check in GitHub's repository settings is out of scope for this feature — that is a repo-admin action outside this codebase, consistent with how this repo already treats branch-protection configuration (`docs/architecture-map.md`'s Constraints note); tracked as an open question below.

## 4. User stories

### US-01: Browse the reference

**As a** consuming developer
**I want** to look up any documented method's parameters, return type, and behavior on a public website
**So that** I can integrate without reading the library's source directly

### US-02: Trust full coverage

**As a** consuming developer
**I want** every exported method and type to appear on the reference with a real description
**So that** I never have to guess about an undocumented piece

### US-03: Get blocked on missing docs

**As a** contributor
**I want** CI to fail clearly when my change adds an exported symbol without a comment
**So that** I fix it before merge instead of shipping a documentation gap

### US-04: Internal plumbing stays out of the way

**As a** consuming developer
**I want** the generated reference to show only real API surface, not internal helper types
**So that** I am never confused about what is meant to be used directly

### US-05: Reference matches what is installable

**As a** consuming developer
**I want** the published reference to always match the latest npm version
**So that** I never read about something I cannot install yet

### US-06: Trust the new CI check itself

**As a** contributor
**I want** the new documentation-required check validated against the existing codebase before it starts blocking pull requests
**So that** I do not get blocked by a false positive on unrelated code

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the library has a published version with a generated reference site
**When** a consuming developer looks up any documented method on it
**Then** they see its description, parameters, and return type

### AC-02 (US-03) — error

**Given** a contributor's pull request adds a new exported function or type without a comment
**When** CI runs the documentation check
**Then** it fails and names exactly which exported symbol is missing its comment

### AC-03 (US-04) — authorization (visibility boundary)

**Given** an exported symbol is explicitly marked as internal-only plumbing
**When** the documentation build runs
**Then** that symbol is excluded from both the generated public reference and the CI comment requirement — a consuming developer never sees it, and a contributor is never blocked by it

### AC-04 (US-02) — domain invariant

**Given** the full existing non-internal public surface (core client + all 7 modules)
**When** the one-time TSDoc pass is complete and CI's documentation check runs
**Then** it reports zero non-internal exported symbols missing a comment — "every public export is documented" holds for the whole current surface, not just new code

### AC-05 (US-05) — cross-context

**Given** a new version has just been published to npm
**When** that release completes
**Then** the published reference site rebuilds and reflects exactly that version — never an older or not-yet-released state

### AC-06 (US-06) — happy path (rollout safety)

**Given** the documentation CI check is enabled for the first time
**When** it runs against the newly-completed TSDoc pass across the whole existing codebase
**Then** it passes with zero false-positive failures before the hard-fail rule is relied on for future contributions

## 6. Non-functional requirements

<!-- Numeric targets set directly by Claude per standard practice for a library this size, at the user's explicit request to stop asking per-row questions ("I do not know. What is the best practice? Do not ask me all these questions"); a "docs site availability" row was considered and dropped since third-party hosting uptime is outside this project's control or instrumentation (the concrete hosting target is fixed in §1 ¶4 for `design` to wire up). -->

| Aspect | Target | Measurement |
|---|---|---|
| TypeDoc site build time | ≤ 60s | CI job step duration (the `typedoc` build step) |
| Documentation-check step added to CI | ≤ 30s added to the existing pipeline | CI job step duration |
| Docs-site freshness after a release | ≤ 5 min from npm publish to site update | GitHub Actions workflow run timestamps |
| Coverage of non-internal exported symbols | 100% (0 missing) | TypeDoc's own validation report, 0 warnings |

## 6.1 Security / privacy

- **Data classification:** Public — the whole point is a publicly browsable reference; no confidential or regulated data is touched.
- **Personal data touched:** None — TSDoc content describes library code, not user data.
- **AuthZ/AuthN impact:** None — no new capability or permission checks; the generated site has no auth of its own, matching the public npm package it documents.
- **Abuse cases:**
  - Malicious content embedded in a TSDoc comment rendered on the public site: TypeDoc escapes comment text by default; normal PR review of docs-only diffs is the backstop.
  - A secret or live API key pasted into an example comment and published publicly: mitigated by standard PR review; no automated secret scanning is added by this feature.
  - Placeholder/low-effort comments satisfying the presence check without being useful: the CI check verifies presence only, not quality — caught by ordinary PR review (see §3 non-goals).
  - A compromised or misconfigured automated publishing step pushing unintended content to the public site: mitigated by pinning any third-party automation used for publishing to an explicit version and scoping its permissions to only what publishing needs — the concrete wiring is a `design`-stage decision.
- **Security review:** N/A — no new authz boundary, no personal data, no change to the library's Nova Poshta wire behavior; purely additive dev-tooling producing a static, fully public output.

## 7. Metrics / KPIs

- **TSDoc coverage of exported symbols** — baseline: 0% (today), target: 100% before the CI hard-fail rule is enabled.
- **False-positive rate of the new CI check against existing code** — baseline: untested, target: 0 false positives in the validation spike, before the hard-fail rule is turned on.
- **Docs-site freshness lag (release → site update)** — baseline: N/A (no site exists yet), target: ≤ 5 minutes, confirmed across the first 3 real releases after launch.
- **Consuming-developer support questions attributable to missing/unclear reference docs** — baseline: 0 (this repo is 3 days old as of this spec and has no reference site yet, so there is no prior window to sample); measurement plan: starting from the site's launch, scan new GitHub issues for phrases like "how do I", "is there docs for", "what does X do". Target: average no more than 1 such issue per month across the first 90 days after launch — any month exceeding that is a signal the reference needs improvement.

## 8. Open questions

- [ ] Who registers the new documentation CI check as a required branch-protection status check in GitHub's repository settings? Default now: called out as a manual follow-up step in this feature's PR description, done outside this codebase. — owner: repo admin (associate2coder), due: immediately after this feature's PR merges
- [ ] What is the definitive, fully-audited list of exports that get TypeDoc's `@internal` marker? Default now: research surfaced a few concrete examples (`AddressReferenceRecordBase`, `CounterpartyRecordBase`, `SearchWrapper`, `OpenEnum`, `TRACKING_STATUS_CODES`), but a complete scan of all ~150 exports has not run. — owner: implementer, due: before `sdd:tasks`
- [ ] Should a lightweight contributor convention (e.g. "update the TSDoc in the same PR that changes behavior") be added to `CONTRIBUTING.md` to reduce prose-goes-stale risk (see §3 non-goals)? Default now: not required by this feature. — owner: Tech Lead, due: before `sdd:tasks`
