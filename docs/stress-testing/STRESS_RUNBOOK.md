# TERP Staging Stress Testing Runbook

> Superseded command contract: use `docs/testing/STRESS_TESTING_RUNBOOK.md` as the canonical runbook for `pnpm qa:stress --env=staging --profile=<...>`.

**Version**: 1.0 | **Updated**: 2026-03-05 | **Status**: CANONICAL

## Overview

This runbook defines how to run stress tests against TERP's staging environment.
These tests validate that the system holds up under realistic wholesale cannabis
ERP load patterns.

**Staging URL**: `https://terp-staging-yicld.ondigitalocean.app`

## Critical Constraints

| Constraint            | Value           | Impact                                                                          |
| --------------------- | --------------- | ------------------------------------------------------------------------------- |
| MySQL connection pool | 25 max          | **PRIMARY BOTTLENECK** — exceeding 25 concurrent DB ops causes queuing/timeouts |
| BullMQ                | NOT implemented | Do NOT include queue stress                                                     |
| Staging DB            | Shared with QA  | Stress runs may affect concurrent QA sessions                                   |

The MySQL connection pool limit of 25 is the expected primary bottleneck. Test
profiles are designed around this constraint. When load exceeds the pool, requests
will queue. If the queue fills, requests will fail with 503. This is expected
behavior — the goal is to characterize the failure point, not to hide it.

## Tool Requirements

Stress tests use **k6** (preferred) or **autocannon** (fallback).

### Installing k6

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker (no installation required)
docker run --rm -i grafana/k6 run - <tests/stress/smoke.k6.js
```

### Installing autocannon (Node.js fallback)

```bash
npm install -g autocannon
# or
pnpm add -g autocannon
```

## Required Environment Variables

| Variable                | Description                                             | Required            |
| ----------------------- | ------------------------------------------------------- | ------------------- |
| `STRESS_TARGET_URL`     | Target base URL                                         | Yes                 |
| `STRESS_AUTH_TOKEN`     | Bearer token or session cookie for authenticated routes | Yes for auth routes |
| `STRESS_ADMIN_EMAIL`    | Admin email for session-based auth                      | Optional            |
| `STRESS_ADMIN_PASSWORD` | Admin password                                          | Optional            |
| `STRESS_TOOL`           | `k6` or `autocannon` (default: `k6`)                    | No                  |
| `STRESS_OUTPUT_DIR`     | Directory for artifacts (default: `./stress-results`)   | No                  |

### Setting environment variables

```bash
export STRESS_TARGET_URL="https://terp-staging-yicld.ondigitalocean.app"
export STRESS_AUTH_TOKEN="your-session-token"
export STRESS_ADMIN_EMAIL="qa.superadmin@terp.test"
export STRESS_ADMIN_PASSWORD="TerpQA2026!"
```

## Stress Profiles

### Smoke Test — Quick Validation

**Purpose**: Verify staging is healthy before deeper testing. Runs in under 1 minute.

| Parameter            | Value                           |
| -------------------- | ------------------------------- |
| Virtual Users (VU)   | 10                              |
| Duration             | 30 seconds                      |
| Expected p95 latency | < 500ms                         |
| Expected error rate  | < 1%                            |
| Pass threshold       | p95 < 500ms AND error rate < 1% |

```bash
pnpm stress:smoke
# or
STRESS_TARGET_URL=https://terp-staging-yicld.ondigitalocean.app k6 run tests/stress/smoke.k6.js
```

### Peak Test — Maximum Load

**Purpose**: Find the breaking point. Simulates a burst of concurrent users, well
above the MySQL pool limit.

| Parameter            | Value                            |
| -------------------- | -------------------------------- |
| Virtual Users (VU)   | 50                               |
| Duration             | 2 minutes                        |
| Ramp-up              | 30s to reach 50 VU               |
| Expected p95 latency | < 2000ms                         |
| Expected error rate  | < 5%                             |
| Pass threshold       | p95 < 2000ms AND error rate < 5% |

Note: 50 VU against a 25-connection pool will cause queuing. This is intentional.
The test validates that queuing (not crashing) occurs.

```bash
pnpm stress:peak
# or
STRESS_TARGET_URL=https://terp-staging-yicld.ondigitalocean.app k6 run tests/stress/peak.k6.js
```

### Soak Test — Sustained Load

**Purpose**: Detect memory leaks, connection pool leaks, or degradation over time.

| Parameter            | Value                                                  |
| -------------------- | ------------------------------------------------------ |
| Virtual Users (VU)   | 20                                                     |
| Duration             | 10 minutes                                             |
| Ramp-up              | 1 minute to reach 20 VU                                |
| Expected p95 latency | < 1000ms                                               |
| Expected error rate  | < 2%                                                   |
| Pass threshold       | p95 stable (< 20% drift over test) AND error rate < 2% |

Note: 20 VU approaches but does not exceed the 25-connection pool. This is
deliberate — soak tests should not themselves trigger the bottleneck.

```bash
pnpm stress:soak
# or
STRESS_TARGET_URL=https://terp-staging-yicld.ondigitalocean.app k6 run tests/stress/soak.k6.js
```

## Pass/Fail Criteria Summary

| Profile | p95 Latency      | Error Rate | Notes                                |
| ------- | ---------------- | ---------- | ------------------------------------ |
| Smoke   | < 500ms          | < 1%       | Hard fail — staging must be healthy  |
| Peak    | < 2000ms         | < 5%       | Soft fail — document queue depth     |
| Soak    | < 1000ms, stable | < 2%       | Fail if latency grows > 20% over run |

### What counts as an error

- HTTP 5xx responses
- HTTP 408 / 429 (timeout or rate limit)
- Connection refused / timeout
- Response body missing expected fields

### What does NOT count as an error

- HTTP 401/403 (auth — fix your token)
- HTTP 404 (wrong URL — fix your script)
- HTTP 200 with empty result set (valid business response)

## Running a Full Stress Suite

```bash
# Run preflight, then all profiles in sequence
pnpm stress:preflight && pnpm stress:smoke && pnpm stress:peak && pnpm stress:soak

# Or use the orchestrator
bash scripts/stress-orchestrate.sh
```

## Artifacts

Stress runs produce artifacts in `./stress-results/` (or `$STRESS_OUTPUT_DIR`):

| Artifact             | Description                                |
| -------------------- | ------------------------------------------ |
| `smoke-summary.json` | k6 summary for smoke run                   |
| `peak-summary.json`  | k6 summary for peak run                    |
| `soak-summary.json`  | k6 summary for soak run                    |
| `stress-report.md`   | Human-readable summary of all runs         |
| `*.html`             | k6 HTML reports (if k6 reporter installed) |

## Interpreting Results

### Healthy result indicators

- p95 latency within thresholds for profile
- Error rate within thresholds for profile
- No p99 spike > 3x the p50 (indicates connection pool saturation)
- Soak test latency stable (not trending upward)

### Warning indicators

- p99 > 3x p50 — connection pool is queuing
- Error rate increasing over time during soak — possible leak
- Latency trending up during soak — possible memory pressure
- Any 500 errors on GET /api/health — server instability

### Failure indicators

- Error rate exceeds threshold
- p95 latency exceeds threshold
- Server returns 503 during smoke test
- Latency trend > 20% growth during soak

## Pre-Run Checklist

Run `pnpm stress:preflight` or manually verify:

- [ ] Staging URL is reachable (`curl -I $STRESS_TARGET_URL`)
- [ ] Auth token is valid (test one authenticated API call)
- [ ] No active deployments to staging (check DigitalOcean dashboard)
- [ ] k6 or autocannon is installed (`k6 version` or `autocannon --version`)
- [ ] Required env vars are set
- [ ] Output directory exists and is writable
- [ ] No other stress runs in progress against staging

## Post-Run Actions

1. Review `stress-results/stress-report.md`
2. If any profile fails, file a bug with the artifact bundle
3. If soak shows memory growth, escalate to Evan before production promotion
4. Archive results to `stress-results/archive/YYYY-MM-DD/`

## MySQL Pool Saturation — What to Expect

When VU count exceeds the pool size (25), behavior depends on the pool config:

- **Queuing**: Requests wait for a connection. Latency increases but requests succeed.
- **Queue full**: Requests fail with timeout (503). Error rate spikes.

The peak test (50 VU) will almost certainly trigger queuing. The soak test
(20 VU) should stay below the threshold under normal conditions.

If smoke test (10 VU) triggers pool saturation, the system is unhealthy and
the staging deploy should be investigated before any production promotion.

## NO_REPAIR Mode

All stress scripts respect the `NO_REPAIR=1` environment variable. When set,
scripts will NOT attempt to fix any issues they encounter. This is critical
during stress testing — automatic repairs during a stress run corrupt the
measurement.

```bash
NO_REPAIR=1 bash scripts/stress-orchestrate.sh
```

The orchestrator always sets `NO_REPAIR=1` internally.
