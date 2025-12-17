# 🧪 Mega QA Runbook

**Red Hat QE-Style Quality Gate for TERP**

This document describes how to run the Mega QA system - a comprehensive, AI-readable quality assurance suite that validates all aspects of TERP.

## Quick Start

```bash
# Run the full Mega QA suite (100+ journeys, all checks)
pnpm mega:qa

# Run a quick check (25 journeys)
pnpm mega:qa:quick

# Run with specific seed for reproducibility
pnpm mega:qa --seed=12345

# Run in CI mode (stricter timeouts)
pnpm mega:qa:ci
```

## What Gets Tested

Mega QA runs the following test suites:

### 1. Must-Hit Suite (`tests-e2e/mega/must-hit.spec.ts`)

Deterministic tests that guarantee coverage of every required tag:

- System controls (Cmd+K, theme toggle)
- Authentication flows
- Dashboard & analytics
- Core routes (orders, clients, inventory, etc.)
- Regression checks for recent bugs

### 2. Randomized Journeys (`tests-e2e/mega/journeys/`)

100+ seeded random user journeys that:

- Traverse the app like real users
- Bias toward uncovered functionality
- Are fully reproducible via seed
- Cover multiple personas (admin, standard, VIP)

### 3. Accessibility Suite (`tests-e2e/mega/a11y/`)

WCAG compliance checks:

- Axe-core scans on all major pages
- Keyboard navigation tests
- Focus management
- Color contrast

### 4. Performance Suite (`tests-e2e/mega/perf/`)

Performance budget enforcement:

- Page load times (<3s for main pages)
- Interaction responsiveness (<500ms)
- Core Web Vitals (LCP, etc.)

### 5. Resilience Suite (`tests-e2e/mega/resilience/`)

Graceful degradation under failure:

- Offline handling
- Slow network
- Server errors (5xx)
- Data persistence

### 6. Security Suite (`tests-e2e/mega/security/`)

Security controls:

- Auth protection
- RBAC enforcement
- Input sanitization (XSS, SQLi)
- Rate limiting
- Security headers

### 7. Concurrency Suite (`tests-e2e/mega/concurrency/`)

Race condition detection:

- Parallel user sessions
- Rapid navigation
- Modal conflicts
- API race conditions

### 8. Backend Invariants (`scripts/mega-qa/invariants/`)

Database integrity checks:

- No negative inventory
- Balanced double-entry accounting
- Invoice status consistency
- No orphaned records

### 9. Contract Tests (`tests/contracts/`)

API contract verification:

- Response shape validation
- Required field checks
- Type validation

### 10. Property Tests (`tests/property/`)

Business logic invariants:

- Pricing never negative
- Order totals consistent
- Discount properties hold

## Configuration Options

```bash
pnpm mega:qa [options]

Options:
  --scenario=<scenario>    Seed scenario: light, full, edge, chaos (default: full)
  --journeys=<count>       Number of randomized journeys (default: 100)
  --seed=<number>          Master RNG seed for reproducibility
  --baseURL=<url>          Base URL for app under test (default: http://localhost:5173)
  --output=<dir>           Output directory (default: qa-results/mega-qa)
  --mode=<mode>            Run mode: standard, soak, quick (default: standard)
  --soak-duration=<min>    Soak duration in minutes (default: 30)
  --headed                 Run in headed mode (visible browser)
  --ci                     CI mode (stricter timeouts, no retries)
  --help                   Show help
```

## Report Bundle

Every run produces a report bundle at `qa-results/mega-qa/<run-id>/`:

```
qa-results/mega-qa/<run-id>/
├── bundle.json       # Complete report
├── manifest.json     # Run metadata (git sha, config, timing)
├── coverage.json     # Coverage analysis
├── failures.json     # All failures with replay info
├── suites.json       # Per-suite results
├── summary.json      # Quick summary stats
└── artifacts/
    ├── traces/       # Playwright traces for failures
    ├── screenshots/  # Screenshots at failure
    ├── videos/       # Videos if enabled
    └── visual-diffs/ # Visual regression diffs
```

### Machine-Readable Summary

The last line of output is always:

```
MACHINE_SUMMARY: ✅ PASS | tests=95/100 | coverage=98.5% | new_failures=0 | known_failures=2 | duration=180s | bundle=20241216-123456-abcd
```

## Replaying Failures

Every failure includes replay information:

```json
{
  "id": "failure-001",
  "replay": {
    "seed": 12345,
    "persona": "standard",
    "steps": [...],
    "replayCommand": "pnpm mega:qa --seed=12345 --journeys=1"
  }
}
```

To replay:

```bash
pnpm mega:qa --seed=12345
```

## Converting Failures to Bugs

After a run, convert failures to roadmap bugs:

```bash
# Package failures from the latest run
tsx scripts/mega-qa/bugpackager.ts

# Or from a specific run
tsx scripts/mega-qa/bugpackager.ts 20241216-123456-abcd
```

This will:

1. Generate `BUG-XXX` entries for each new failure
2. Append them to `docs/roadmaps/MASTER_ROADMAP.md`
3. Create prompt files in `docs/prompts/`

## Coverage Contract

The coverage contract defines what must be tested:

### Required Tags

- **TS-XXX**: Interaction protocols from `EXHAUSTIVE_INTERACTION_PROTOCOLS.md`
- **route:/\***: Frontend routes that must load
- **api:\*.\*\*\***: Backend procedures that must work
- **regression:\***: Recent bug fixes that must not regress

### Coverage Gate

The run **fails** if any required tag is not covered (unless waived).

Waivers can be added to `scripts/mega-qa/coverage/waivers.json`:

```json
[{ "tagId": "TS-15.3", "rationale": "Feature disabled until Phase 3" }]
```

## Soak Testing

For extended stability testing:

```bash
# Run for 1 hour
pnpm mega:qa:soak --duration=60

# Run with specific seed
tsx scripts/mega-qa/soak/soak-runner.ts --duration=30 --seed=12345
```

Soak tests detect:

- Memory leaks
- Intermittent failures (flakes)
- Stability degradation over time

## CI Integration

For CI pipelines:

```bash
# Run in CI mode (stricter, no retries)
pnpm mega:qa:ci

# Exit codes:
# 0 - All tests passed, coverage gate passed
# 1 - Tests failed or coverage gate failed
# 2 - Environment/preflight failure
```

## Troubleshooting

### Tests fail with "Database not ready"

```bash
pnpm test:env:up
pnpm test:db:reset:full
pnpm test:db:preflight
```

### Tests fail with "App not running"

```bash
pnpm dev  # In another terminal
```

### Coverage gate fails

Check `qa-results/mega-qa/latest/coverage.json` for missing tags.

### All tests timeout

- Check if app is running: `curl http://localhost:5173`
- Check database: `pnpm test:db:preflight`
- Try headed mode: `pnpm mega:qa --headed`

## For AI Agents

When instructed to "run the Mega QA", execute:

```bash
pnpm mega:qa
```

Then:

1. Read the summary from the last line of output
2. If failures exist, read `qa-results/mega-qa/latest/failures.json`
3. For each failure, the replay info shows how to reproduce
4. To create bug tasks: `tsx scripts/mega-qa/bugpackager.ts`

The report bundle is designed for AI consumption - all evidence needed to understand and fix issues is included.
