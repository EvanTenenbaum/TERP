# Staging Escape Prevention Implementation Plan

## Purpose

Reduce the specific classes of bugs that have recently reached TERP staging without adding a new heavy process layer, a second QA framework, or slow always-on gates that people will bypass.

This plan is intentionally constrained to:

- integrate into existing TERP CI, Playwright, oracle, and release-train structures
- focus on the highest-repeat escape classes from March 24-26, 2026
- prefer changed-files-aware automation over global always-on checks
- roll out in shadow mode before making anything newly blocking

## Evidence Base

Primary evidence used for this plan:

- `docs/qa-reports/2026-03-26-staging-ux-qa-audit/RUNNING_BUG_LOG.md`
- `docs/qa-reports/2026-03-26-staging-ux-qa-audit/CONSOLIDATION_MANIFEST.md`
- `docs/qa/2026-03-24-tranche3-adversarial-review/consolidated-verdict.md`
- `docs/superpowers/plans/2026-03-25-qa-remediation.md`

Current TERP structures this plan is designed to extend rather than duplicate:

- `.github/workflows/pre-merge.yml`
- `scripts/ci/resolve-affected-tests.sh`
- `scripts/ci/domain-test-map.json`
- `tests-e2e/critical-paths/control-action-contracts.spec.ts`
- `tests-e2e/oracles/oracle-runner.spec.ts`
- `scripts/qa/release-train/checkpoint-gate.sh`
- `scripts/qa/placeholder-scan.sh`
- `scripts/qa/golden-flow-assertion-quality.ts`
- package scripts under `qa:test:*`, `gate:*`, and `test:e2e:*`

## Findings Summary

The recent staging escapes clustered into a small number of failure classes:

1. Shared work-surface and shell interaction failures
2. Route and mode coupling failures
3. Permission and feature-flag contract drift
4. Soft-delete and data-lifecycle gaps
5. Operator-facing leak/hygiene issues that do not fail normal tests

The issue is not that TERP lacks gates. The issue is that existing gates are too coarse in some areas and have blind spots in others.

## Existing Structure Assessment

### Strengths already present

- `pre-merge.yml` already does changed-files-aware quality checks and targeted E2E dispatch
- `resolve-affected-tests.sh` already maps changed files to targeted Playwright specs
- `oracle-runner.spec.ts` already supports domain, tags, and single-oracle execution
- `checkpoint-gate.sh` already packages release-train baseline verification
- `placeholder-scan.sh` and `golden-flow-assertion-quality.ts` already establish the pattern of small opinionated guards

### Current gaps

- `domain-test-map.json` has real blind spots
  - `vendors-purchasing` currently has no targeted E2E specs
  - shared work-surface changes fall back to a smoke subset that misses known staging escape classes
  - settings/admin coverage is weaker than actual staging risk
- recent escape classes would not all be caught by the current smoke subset
- there is no lightweight automatic page-load contract pack for high-risk routes
- there is no changed-files-aware automatic check for zero-input tRPC procedures needing explicit `.input(z.void())`
- there is permission semantics drift risk across:
  - `server/services/permissionService.ts`
  - `server/_core/permissionService.ts`
- soft-delete issues are recurring, and recent evidence shows they cannot be deferred entirely to nightly discovery
- there is already a nightly workflow path in `.github/workflows/nightly-e2e.yml`, which can host advisory discovery checks without adding another scheduler

## Design Principles

1. No new umbrella gate
2. No second QA framework
3. No always-on full headed staging gate per PR
4. Prefer extension of existing resolver and workflows
5. Favor changed-files-aware dispatch
6. Introduce new blockers only after shadow-mode validation
7. Every new check must be low-maintenance, narrow, and easy to disable independently

## Placement Rules

This plan only works if each change is enacted in the right layer.

### 1. Repo instructions (`CLAUDE.md`, `AGENTS.md`, `.claude/*`)

These should define:

- policy
- operator guidance
- risk framing
- human/agent workflow expectations

They should not be the primary enforcement point for defect prevention.

Use them for:

- documenting why a class of bug matters
- telling agents which verification commands are expected
- describing rollout discipline such as `available` vs `default`

Do not use them for:

- the actual bug-catching logic
- CI dispatch decisions
- release-blocking enforcement

### 2. Repo scripts and tests

These are the primary source of truth for technical prevention logic.

Use them for:

- changed-files-aware scanners
- resolver logic
- unit/integration tests
- Playwright contract tests
- soft-delete hotspot assertions
- permission parity tests

This is where the real implementation belongs.

### 3. GitHub Actions and existing gates

These are the primary source of truth for automated enforcement and PR-time behavior.

Use them for:

- advisory vs blocking decisions
- PR comments
- targeted dispatch
- artifacts
- nightly discovery jobs

They should consume repo scripts and tests, not duplicate their logic inline beyond simple orchestration.

### 4. Local release-train/checkpoint scripts

These should mirror CI selection logic for local proof and checkpoint bundles.

Use them for:

- local parity with CI behavior
- checkpoint evidence generation
- runtime/staging proof collection

They should not invent a separate risk-selection system.

### 5. VS Code workspace scaffolding

In this repo, `.vscode` currently contains only workspace convenience settings, not task orchestration.

Use VS Code workspace scaffolding only for:

- developer convenience
- discoverability
- one-click wrappers if helpful later

Do not use VS Code workspace files as the enforcement source of truth.

### 6. Nightly workflows

These should be advisory discovery layers for drift and broader regression detection.

Use them for:

- broader soft-delete drift discovery
- wider regression discovery not suitable for every PR

Do not use nightly jobs as the primary protection for recently recurring P0/P1 bug classes.

## Claude Adversarial Review Corrections

The first draft was reviewed adversarially by Claude. The review materially changed the plan in five ways:

1. `operator-leak` coverage is now split into:
   - a dedicated BUG-080 prevention test for the Users flow
   - a narrower source scanner for obvious credential-like defaults
2. resolver enhancement no longer assumes direct `--json` adoption in-place
3. page-load contracts are now treated as bootstrap-only guards, not substitutes for interaction/state oracles
4. vendors/purchasing coverage must begin with a real minimal spec before any domain-map expansion
5. soft-delete protection moves partly into per-PR hotspot tests instead of relying mainly on nightly discovery

## Revised Implementation

### 1. Upgrade the resolver safely, without breaking the current stdout contract

Do not switch `resolve-affected-tests.sh` directly to JSON-driven workflow parsing in the first tranche.

Instead:

- keep current stdout contract unchanged:
  - `SKIP`
  - `SMOKE`
  - space-separated spec list
- add an optional sidecar mode that writes structured metadata to a file
  - `decision`
  - `specs`
  - `oracleDomains`
  - `riskTags`
- update `pre-merge.yml` and `checkpoint-gate.sh` together when the sidecar is adopted

Suggested `riskTags`:

- `shared-shell`
- `routing-mode`
- `permissions`
- `settings-admin`
- `purchasing`
- `calendar`
- `mobile-shell`
- `financial-state`

This keeps the resolver as the single source of truth while avoiding a hidden workflow split between PR comments and actual dispatched tests.

### 2. Fix the domain-map blind spots only when real tests exist

Update `scripts/ci/domain-test-map.json` only alongside the tests it points to.

Order of operations:

1. create or attach a real purchasing contract spec or oracle path
2. wire that path into `vendors-purchasing`
3. extend settings/admin mappings
4. route shared work-surface changes into shared-shell contract coverage

No domain map entry should ever reference a nonexistent spec path.

### 3. Separate bootstrap contracts from interaction-sequence contracts

The original plan over-credited page-load contracts. They are useful, but only for a narrow slice of failures.

#### 3a. Bootstrap/page-load contracts

These should only claim to catch:

- bootstrap HTTP 4xx/5xx failures
- uncaught console errors on first render
- missing primary selectors
- completely dead first action visibility/clickability

They are not meant to catch:

- route-mode drift after user action
- state-machine violations
- drawer interception after opening a panel
- financial integrity contradictions in loaded detail views

#### 3b. Interaction-sequence contracts

These are the real priority for the recent staging escapes.

Use existing Playwright infrastructure to expand `control-action-contracts.spec.ts` and add missing focused specs for:

- quote vs order route/mode behavior
- purchase order confirmed-state actions
- receiving row selection behavior
- shipping drawer overlay blocking
- invoice detail/state contradictions
- Need/Supply modal launch behavior
- global search activation path
- users/settings key dialog open actions

### 4. Add BUG-080 protection as a dedicated guard, not as a generic placeholder scan

BUG-080 is too important to treat as a side effect of a broader scanner.

Add two protections:

- a focused unit/component test asserting Users create/reset forms render with empty initial state
- a narrow changed-files-aware scanner in auth- and user-management-related UI paths that flags obvious credential-like defaults in:
  - `defaultValue=`
  - `useState(...)`
  - `defaultValues:`

This is separate from ordinary TODO/placeholder scanning.

### 5. Put tRPC zero-input contract checking into quality-gate as advisory first

Add a changed-files-aware checker for router files that flags zero-input procedures lacking explicit `.input(z.void())`.

Rollout mode:

- phase 1: advisory only in `quality-gate`
- phase 2: blocking only after observed low-noise behavior

### 6. Close permission drift with tests against the actively used paths

The evidence now confirms that:

- `server/services/permissionService.ts` is actively used for application permission semantics
- `server/_core/permissionService.ts` is actively used by calendar event permission paths, including `batchCheckPermissions`

Add focused parity tests for the overlapping expectations that matter:

- admin behavior
- fail-closed behavior
- batch checks vs single checks where equivalent expectations exist
- repeated calendar/admin regression cases

This remains inside the existing `pnpm test` path.

### 7. Move soft-delete hotspot protection into per-PR tests, keep nightly discovery as supplemental

Soft-delete bugs are too recurrent to leave mostly to nightly discovery.

Do both:

- per-PR hotspot tests for the repeated risk routers and mutation paths
- nightly non-blocking discovery for broader drift and new candidates

Priority hotspot areas:

- quotes
- orders
- inventory
- returns
- purchase orders / receiving

The nightly workflow can host supplemental discovery, but it is not the primary protection for this class anymore.

### 8. Keep default flips inside existing feature-flag rollout structures

Do not add a new rollout manifest.

For high-risk sheet-native/default behavior:

- use existing feature flag controls
- keep `available` and `default` as separate decisions
- trigger routing/shared-shell coverage automatically when route/default logic changes

## Atomic Roadmap

Each item below should land as its own atomic PR or tightly-coupled PR pair. No roadmap item should leave the CI selection logic in a half-migrated state.

### Track A: Baseline and safety rails

#### A1. Baseline current gate cost and flake profile

- Goal: establish current runtime and failure baseline before adding checks
- Files:
  - `.github/workflows/pre-merge.yml`
  - `.github/workflows/nightly-e2e.yml`
- Deliverable:
  - summary note of current targeted-e2e duration, smoke duration, and recent failure patterns
- Exit criteria:
  - baseline numbers captured for later comparison

#### A2. Add resolver sidecar output without changing stdout behavior

- Goal: expose `riskTags` and structured dispatch data safely
- Files:
  - `scripts/ci/resolve-affected-tests.sh`
  - optionally a helper script under `scripts/ci/`
- Deliverable:
  - sidecar metadata file generation
  - existing stdout contract unchanged
- Exit criteria:
  - current `pre-merge.yml` still works unchanged
  - resolver verification script still passes

#### A3. Surface resolver sidecar in pre-merge comments only

- Goal: observe new risk classification in shadow mode without altering blocking logic
- Files:
  - `.github/workflows/pre-merge.yml`
- Deliverable:
  - PR comment includes structured risk profile
- Exit criteria:
  - targeted-e2e dispatch is still driven by existing stdout output

### Track B: Fill the biggest coverage hole first

#### B1. Create minimal purchasing contract coverage

- Goal: eliminate zero-coverage state for `vendors-purchasing`
- Files:
  - `tests-e2e/critical-paths/purchasing-contracts.spec.ts`
  - or purchasing-tagged oracles under `tests-e2e/oracles/`
- Minimum scope:
  - one purchase-order route load contract
  - one confirmed-state action contract
  - one receiving action contract
- Exit criteria:
  - test file exists and passes locally/CI

#### B2. Wire purchasing coverage into the domain map

- Goal: make purchasing file changes automatically run real coverage
- Files:
  - `scripts/ci/domain-test-map.json`
  - `scripts/ci/verify-release-train-impact-map.sh`
- Exit criteria:
  - `vendors-purchasing` no longer resolves to an empty spec list
  - impact-map verification covers the new mapping

### Track C: Catch the escape classes that actually happened

#### C1. Expand shared-shell control-action contracts

- Goal: catch repeat escape classes in shared work-surface interactions
- Files:
  - `tests-e2e/critical-paths/control-action-contracts.spec.ts`
- Add contracts for:
  - quote vs order create flow
  - receiving row selection
  - shipping drawer interaction
  - Need/Supply modal launch
  - global search activation
  - users/settings key dialog actions
- Exit criteria:
  - new contracts fail against the prior bug states and pass on fixed state

#### C2. Add bootstrap-only page-load contracts

- Goal: cheaply catch bootstrap crashes and dead-on-arrival pages
- Files:
  - new small spec or oracle-tag pack
  - `scripts/ci/domain-test-map.json`
- Scope:
  - no bootstrap 4xx/5xx
  - no uncaught console errors
  - primary selector visible
- Exit criteria:
  - positioned explicitly as bootstrap coverage, not workflow coverage

#### C3. Add mobile-shell contract coverage

- Goal: catch nav/layout regressions only when shell files change
- Files:
  - targeted mobile shell spec
  - `scripts/ci/domain-test-map.json`
  - `pre-merge.yml`
- Exit criteria:
  - runs only for shell/layout/nav diff patterns

### Track D: High-value fast guards

#### D1. Add BUG-080 Users default-state test

- Goal: permanently prevent credential-prefill regressions
- Files:
  - `client/src/components/UserManagement.tsx`
  - adjacent test file if missing
- Exit criteria:
  - test proves create/reset forms start empty

#### D2. Add credential-like default scanner

- Goal: catch obvious hardcoded credential defaults in changed auth/user UI files
- Files:
  - `scripts/qa/placeholder-scan.sh`
  - or a dedicated helper used by it
- Exit criteria:
  - changed-files-aware
  - scoped to relevant UI/auth files
  - ignore mechanism documented

#### D3. Add zero-input tRPC checker in advisory mode

- Goal: catch future `getEffectiveFlags`-style regressions cheaply
- Files:
  - `pre-merge.yml`
  - checker script under `scripts/qa/` or `scripts/ci/`
- Exit criteria:
  - advisory first
  - no merge blocking until noise is proven low

### Track E: Recurrence-prone invariants

#### E1. Add soft-delete hotspot tests to per-PR suite

- Goal: stop repeated deleted-record regressions before staging
- Files:
  - hotspot router/service tests in orders, quotes, inventory, returns, purchase orders
- Exit criteria:
  - known recurrence paths have dedicated assertions for `deletedAt` behavior

#### E2. Add supplemental nightly soft-delete audit

- Goal: detect broader drift without blocking unrelated work
- Files:
  - `.github/workflows/nightly-e2e.yml` or another existing nightly path
  - audit script under `scripts/qa/` or `scripts/ci/`
- Exit criteria:
  - nightly advisory signal exists
  - does not replace E1

#### E3. Add permission parity tests for active overlapping paths

- Goal: reduce drift between application permissions and calendar event permission handling where semantics overlap
- Files:
  - `server/services/permissionService.test.ts`
  - tests for `server/_core/permissionService.ts`
- Exit criteria:
  - admin and fail-closed expectations covered
  - batch/single behavior tested where equivalence is expected

### Track F: Promotion and consolidation

#### F1. Extend checkpoint-gate to consume resolver sidecar

- Goal: keep local release-train verification aligned with CI selection logic
- Files:
  - `scripts/qa/release-train/checkpoint-gate.sh`
  - resolver helper files
- Exit criteria:
  - local checkpoint bundles and PR checks use the same risk metadata

#### F2. Promote proven advisory checks to blocking

- Goal: make only low-noise, high-yield checks enforceable
- Promotion requirements:
  - low false-positive rate
  - acceptable runtime cost
  - proven bug catch value
- Exit criteria:
  - documented before/after metrics support the change

## Rollout Strategy

### Phase 0: Shadow mode

Run new selection logic and advisory checks for 10-15 PRs.

Track:

- median added CI time
- false-positive rate
- flaky-failure rate
- issues caught before staging

### Phase 1: Low-risk enforcement

Promote only the checks that prove:

- low noise
- low runtime cost
- real defect catch value

### Phase 2: Tighten only proven controls

Promotion criteria:

- median added runtime stays low
- false-positive rate remains acceptable
- developers are not bypassing the checks
- checks are catching regressions that matter

## Explicit Non-Goals

- no global always-on headed staging gate per PR
- no duplicate QA orchestrator
- no broad per-PR static deletedAt lint
- no new mandatory manual approval layer
- no system so strict that developers routinely skip it

## Validated Assumptions

After adversarial review, the assumptions retained are:

1. Extending current TERP structures is still lower-risk than creating a parallel QA system
2. Interaction-sequence contracts are more valuable than page-load checks for the recent bug cluster
3. BUG-080 and soft-delete recurrence require dedicated guards, not generic hygiene coverage
4. Resolver improvements must be staged so comments, dispatch, and local checkpoint behavior cannot silently diverge
5. Advisory-first rollout is necessary to keep the system credible and prevent future bypass behavior
