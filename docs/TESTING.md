# TERP Testing Guide

**For AI agents and developers. Single source of truth for all test infrastructure.**

---

## Local DB Auto-Bootstrap

Local TERP verification now auto-bootstrap the shared MySQL test DB by default.

- `pnpm dev` will start the local test DB when no remote DB URL is configured, run schema push, and seed the baseline dataset only if the local DB is empty or broken.
- `pnpm test`, `pnpm test:watch`, and `pnpm test:coverage` now reset to a clean light dataset before running so local coverage is more complete and less dependent on tribal setup knowledge.
- `pnpm test:e2e` still uses a fresh full reset for deterministic browser runs.
- Remote or live DB mode still wins when `TEST_DATABASE_URL` or `DATABASE_URL` points off-host. In that case the repo only runs connectivity preflight and does not touch Docker.

Useful commands:

```bash
pnpm agent:prepare        # In local worktrees, link shared node_modules and verify local bins
pnpm test:db:ensure        # Start/migrate/seed local DB only when needed
pnpm test:db:fresh         # Force a clean light reset
pnpm test:db:ensure:full   # Ensure full dataset is available
pnpm test:db:fresh:full    # Force a clean full reset
pnpm db:status             # Show target URL, container state, and baseline readiness
```

Opt-outs:

- Set `SKIP_LOCAL_DB_BOOTSTRAP=1` to bypass the repo-level auto-bootstrap wrapper.
- Set `TEST_DB_AUTO_STOP=1` if you want integration-test teardown to stop the local container instead of leaving it warm for reuse.

---

## Quick Reference: What to Run When

| Situation              | Command                                                           | Time    |
| ---------------------- | ----------------------------------------------------------------- | ------- |
| Before every commit    | `pnpm check && pnpm lint && pnpm test && pnpm build`              | ~2 min  |
| Schema changes         | `pnpm test:schema:ci`                                             | ~3 min  |
| UI/flow changes        | `pnpm test:e2e` (local) or `pnpm test:staging-critical` (staging) | ~5 min  |
| Deep business logic    | `pnpm test:e2e:deep:all`                                          | ~10 min |
| Pre-production deploy  | `pnpm test:smoke:prod`                                            | ~2 min  |
| Stress testing staging | `pnpm qa:stress --env=staging --profile=smoke`                    | ~5 min  |
| Full QA pipeline       | `pnpm qa:pipeline`                                                | ~15 min |

---

## Local UI Runtime Inspection with Domscribe

Use Domscribe when you need live UI truth during implementation, not just post-merge browser QA. It is especially useful for styling bugs, conditional rendering issues, wrong props, and "what is actually on screen right now?" questions.

### When to Use It

- The change is visual or behaviorally tied to rendered UI.
- The source code alone is ambiguous.
- You want Codex to inspect the live browser state before or after an edit.

### Workflow

1. Start the app with `pnpm dev`.
   If local DB bootstrap is slowing down or blocking a quick UI-debug session, use `pnpm domscribe:dev`.
2. Open the target page in a browser.
3. Confirm the relay is up with `pnpm domscribe:status`.
4. Ask Codex to use Domscribe before editing, or use the in-browser overlay to capture an annotation.
   The overlay starts collapsed by default, so a small root shell is normal until you expand it.

Interpret results carefully:

- `browserConnected: false` means the browser page is not connected yet, so runtime truth is unavailable.
- `rendered: false` can be expected for wrapper components. Retry on a nearby native rendered element before assuming the UI is broken.
- `domSnapshot` is the most useful payload for actual classes, text, and attributes.

### Repo Integration Notes

- App-side wiring lives in `vite.config.ts`.
- Codex MCP wiring lives in `.codex/config.toml`.
- Claude project MCP wiring lives in `.mcp.json`.
- Claude skill guidance lives in `.claude/skills/terp-domscribe/SKILL.md`.
- Local runtime artifacts live under `.domscribe/` and are gitignored.

See `docs/dev-guide/DOMSCRIBE_WORKFLOW.md` for the full TERP-specific flow and prompt examples.

---

## Test Layers (Testing Pyramid)

### 1. Unit Tests (Vitest) — `pnpm test`

**229 test suites** across server, client, scripts, and utilities.

```bash
pnpm test                    # All unit tests
pnpm test:unit               # tests/unit/ only
pnpm test:watch              # Watch mode
pnpm test:coverage           # With coverage report
pnpm test:property           # Property-based tests (fast-check)
pnpm test:property:full      # Property tests with 10,000 runs
```

**Where tests live:**

- `server/routers/*.test.ts` — Router endpoint tests (49 files)
- `server/_core/*.test.ts` — Core utility tests (15 files)
- `server/services/__tests__/` — Business logic tests (12 files)
- `client/src/**/*.test.tsx` — React component tests (43 files)
- `client/src/hooks/**/*.test.ts` — React hooks tests (13 files)
- `tests/unit/` — Domain-specific unit tests
- `tests/property/` — Property-based fuzz tests
- `tests/contracts/` — Contract tests
- `tests/security/` — Security tests

**Config:** `vitest.config.ts` (primary), `vitest.config.integration.ts` (integration)

### 2. Integration Tests — `pnpm test:schema`

Requires a running database (Docker).

```bash
pnpm test:schema:ci          # Full: start DB → reset → test → stop
pnpm test:schema             # Schema verification only (needs running DB)
```

**Database utilities:**

```bash
pnpm test:env:up             # Start test MySQL container
pnpm test:env:down           # Stop test container
pnpm test:db:reset           # Reset and migrate test DB
pnpm test:db:preflight       # Check DB connectivity
```

**Config:** `vitest.config.integration.ts`, `testing/docker-compose.yml`

### 3. E2E Tests (Playwright) — `pnpm test:e2e`

Browser-based tests organized by purpose:

```bash
# Local development
pnpm test:e2e                # All E2E tests
pnpm test:e2e:headed         # Visible browser
pnpm test:e2e:debug          # Debug mode
pnpm test:e2e:ui             # Playwright UI

# Staging
pnpm test:staging-critical   # Gate tests for staging (fast, read-only)

# Production
pnpm test:e2e:prod           # All prod tests (smoke + regression)
pnpm test:e2e:prod-smoke     # Production smoke only
pnpm test:smoke              # Smoke suite
```

**E2E spec organization (`tests-e2e/`):**

| Directory         | Purpose                                          | Count                     |
| ----------------- | ------------------------------------------------ | ------------------------- |
| `golden-flows/`   | Core business flow tests (gf-001 through gf-008) | 10 specs                  |
| `critical-paths/` | Feature-specific critical paths                  | 15 specs                  |
| `deep/`           | Deep business logic, edge cases, state machines  | 7 specs                   |
| `rbac/`           | Role-based access control tests                  | 5 specs                   |
| `mega/`           | Comprehensive sprint feature tests               | 2 specs                   |
| `ai-generated/`   | AI-agent generated scenario tests                | 2 specs                   |
| `oracles/`        | Declarative YAML-based oracle runner             | 1 spec + YAML definitions |
| `chains/`         | Chain-based scenario executor (57 chains)        | 1 spec + definitions      |
| Root level        | Auth, CRUD, navigation, dashboard                | 7 specs                   |

**Golden flows (canonical business paths):**

- `gf-001` — Direct Intake
- `gf-002` — Procure-to-Pay
- `gf-003` — Order-to-Cash
- `gf-004` — Invoice Payment + GL Entries
- `gf-005` — Pick & Pack
- `gf-006` — Client Ledger Review
- `gf-007` — Inventory Management
- `gf-008` — Sample Request

**Deep tests (business logic + edge cases + RBAC):**

Tests under `tests-e2e/deep/` exercise the tRPC API at depth with admin access first, RBAC second:

```bash
pnpm test:e2e:deep           # Business logic tests (@deep tag)
pnpm test:e2e:deep:rbac      # RBAC permission boundary tests (@rbac tag, runs after deep)
pnpm test:e2e:deep:all       # Both: business logic first, then RBAC
pnpm test:e2e:deep:headed    # Business logic with visible browser
```

Deep test specs:

- `state-machines.spec.ts` — Order, invoice, and batch state machine transitions
- `financial-integrity.spec.ts` — Payment tracking, GL entries, bad debt write-off
- `cross-domain-integration.spec.ts` — Order-to-cash, fulfillment chain, AR dashboard
- `credit-and-pricing.spec.ts` — Credit engine, margins, VIP tiers, pricing context
- `negative-paths.spec.ts` — Invalid inputs, boundary conditions, race conditions
- `critical-edge-cases.spec.ts` — Partial invoice void, returns, concurrent oversell
- `rbac-boundaries.spec.ts` — Per-role mutation boundaries (warehouse, accountant, fulfillment, auditor, salesRep)

Execution order: The `deep` project runs all `@deep` tests with full admin access. The `deep-rbac` project runs `@rbac` tests only after the deep project completes, ensuring auth infrastructure issues never block business logic findings.

**Config:** `playwright.config.ts`

### 4. Oracle Tests — `pnpm qa:test:core`

Declarative YAML-based test system for deterministic flow validation.

```bash
pnpm qa:test:core            # Tier 1 (critical paths)
pnpm qa:test:all             # All oracle tests
pnpm qa:test:smoke           # Smoke-tagged oracles
pnpm qa:test:orders          # Orders domain only
pnpm qa:test:clients         # Clients domain only
pnpm qa:test:inventory       # Inventory domain only
pnpm qa:test:accounting      # Accounting domain only
pnpm qa:test:headed          # With visible browser
```

Oracle definitions live in `tests-e2e/oracles/` as YAML files. See `docs/qa/TEST_ORACLE_SCHEMA.md` for the DSL reference.

### 5. Chain Tests — `pnpm staging:chains`

57 scenario chains testing staging end-to-end via browser automation.

```bash
pnpm staging:chains          # Run all chains against staging
pnpm staging:chains:headed   # With visible browser
pnpm staging:load-test       # Full persona simulation
pnpm staging:load-test:quick # Quick 1-day simulation
```

Chain definitions: `tests-e2e/chains/definitions/`

### 5.5 Human QA Packet — `pnpm qa:human:flows`

Seeded live-browser packet generation for confused-human exploratory QA.

```bash
pnpm qa:human:flows -- --help
pnpm qa:human:flows -- --count 40 --seed "$(date +%Y%m%d)"
pnpm qa:human:flows -- --count 60 --seed "$(date +%Y%m%d)" --format json --output "qa-results/confused-human/packet-$(date +%Y%m%d).json"
pnpm qa:human:flows:check -- --help
pnpm qa:human:flows:check -- --seed "$(date +%Y%m%d)"
pnpm qa:human:flows:check -- --file "qa-results/confused-human/packet-20260401.json"
```

Validation rules:

- `Candidate rows` must be non-zero
- `Generated runs` must be non-zero
- JSON packets must parse and expose `selectedCount > 0`

### 6. Stress Tests — `pnpm qa:stress`

API load testing against staging using k6 + browser preflight.

```bash
pnpm qa:stress:preflight     # Preflight checks only
pnpm qa:stress:smoke         # Light load (10 VU, 30s)
pnpm qa:stress:peak          # Peak load profile
pnpm qa:stress:soak          # Long-duration soak test
pnpm qa:stress               # Full orchestrated run
```

k6 profile: `scripts/stress/staging-mixed-traffic.k6.js`
Orchestrator: `scripts/stress/run-stress-testing.sh`
Profiles config: `scripts/stress/profiles.json`

**Stress contract (from CLAUDE.md):**

- `run stress testing` = `pnpm qa:stress --env=staging --profile=peak`
- Stress runs enforce **NO_REPAIR** mode
- k6 must be installed separately (`brew install k6` or `apt install k6`)

---

## Quality Gates — `pnpm gate:all`

Static analysis gates that don't require a running app:

```bash
pnpm gate:placeholder        # Scan for placeholder text
pnpm gate:rbac               # RBAC contract verification
pnpm gate:parity             # Feature parity check
pnpm gate:invariants         # Database invariant checks
pnpm gate:e2e-quality        # Golden flow assertion quality
pnpm gate:terminology        # Terminology drift audit
pnpm gate:all                # Run all gates
```

---

## QA Pipeline — `pnpm qa:pipeline`

End-to-end QA orchestrator: runs E2E tests, parses results, generates reports.

```bash
pnpm qa:pipeline             # Full pipeline (uses existing test results)
pnpm qa:pipeline:local       # Run E2E first, then analyze
pnpm qa:coverage             # Oracle coverage report
```

---

## Mega QA — `pnpm mega:qa`

Comprehensive multi-journey QA suite for full regression testing.

```bash
pnpm mega:qa                 # Full mega QA
pnpm mega:qa:quick           # Quick (25 journeys)
pnpm mega:qa:invariants      # DB invariant checks only
```

---

## Test Infrastructure

| File/Directory                 | Purpose                                          |
| ------------------------------ | ------------------------------------------------ |
| `vitest.config.ts`             | Unit test configuration                          |
| `vitest.config.integration.ts` | Integration test configuration                   |
| `playwright.config.ts`         | E2E test configuration                           |
| `testing/`                     | Shared infra: Docker DB, setup scripts, fixtures |
| `server/test-utils/`           | Test DB helpers, permission mocking              |
| `tests-e2e/fixtures/auth.ts`   | E2E authentication helpers                       |
| `tests-e2e/page-objects/`      | Page object model for E2E                        |
| `tests-e2e/utils/`             | E2E helper utilities                             |

## Output Directories

| Directory            | Tracked       | Purpose                   |
| -------------------- | ------------- | ------------------------- |
| `qa-results/`        | .gitkeep only | QA artifacts (gitignored) |
| `test-results/`      | No            | Playwright HTML reports   |
| `playwright-report/` | No            | Playwright report output  |

---

## Archived Documentation

Historical QA reports and one-off testing docs are in:

- `docs/qa/archive/` — Past sprint QA reports, Red Team audits, validation logs
- `docs/testing/archive/` — Historical test execution logs, persona testing reports

These are kept for reference but are not active guides.
