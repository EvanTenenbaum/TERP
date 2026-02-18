# TER-93: Fix Deployment Health Check / Deploy Parity

**Wave:** 10 — Infrastructure & Edge Cases
**Priority:** MEDIUM | **Mode:** SAFE
**Estimate:** 4h

---

## Context

The `/api/health` endpoint may return stale data after deployments. CI merge commit `60d808e9` likely fixed the underlying issue, but it needs verification and potentially a code fix to ensure the health endpoint always returns the currently-running commit SHA and correct deployment status.

## Root Cause Investigation

1. Read `server/routers/health.ts` and `server/_core/healthCheck.ts` to understand how the health endpoint works
2. Check if the commit SHA is read from `client/public/version.json` or from an environment variable
3. Check if the value is cached at startup (stale) vs read on each request (fresh)
4. Read `scripts/check-deployment-status.sh` and `scripts/watch-deploy.sh` for the expected health response format

## Required Changes

### If the commit SHA is cached at module load time:

- Change to read `version.json` on each request, or use a short TTL cache (e.g., 60s)
- Ensure the health endpoint returns the actual running commit, not a build-time snapshot

### If the issue is that version.json isn't updated during builds:

- Verify the Dockerfile or build script updates `version.json` with `$COMMIT_SHA` or `git rev-parse HEAD`
- Check `.do/app.yaml` or the DigitalOcean app spec for build-time env vars

### Verification Checklist

- [ ] `curl /api/health` returns 200 with correct commit SHA
- [ ] Health response includes: `status`, `version`/`commit`, `uptime`
- [ ] After a new deploy, the SHA updates (not stale)
- [ ] `pnpm check` passes
- [ ] `pnpm lint` — no new errors in modified files
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes

## Key Files

| File                                 | Purpose                                |
| ------------------------------------ | -------------------------------------- |
| `server/routers/health.ts`           | Health endpoint router                 |
| `server/_core/healthCheck.ts`        | Health check implementation            |
| `client/public/version.json`         | Build metadata (commit SHA, timestamp) |
| `scripts/check-deployment-status.sh` | Deployment verification script         |
| `scripts/watch-deploy.sh`            | Deployment watcher                     |
| `.do/app.yaml`                       | DigitalOcean app spec (if exists)      |

## Acceptance Criteria

1. Health endpoint returns accurate, non-stale commit SHA
2. Health endpoint returns 200 when the app is healthy
3. No regression in existing health check consumers
