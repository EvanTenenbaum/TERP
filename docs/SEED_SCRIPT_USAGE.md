# Seed Script Usage Guide

## Resource Considerations

**⚠️ IMPORTANT:** The seed script is resource-intensive and should NOT run automatically on every deployment.

### Resource Usage:
- **Compute Time:** ~30 seconds (light) to ~2 minutes (full)
- **Database Operations:** Clears and recreates all data
- **Network:** Downloads dependencies (`pnpm install`)
- **Cost:** Spins up compute instance for duration

## Recommended Usage Patterns

### 1. **Manual Execution (Recommended)**
Run only when you need fresh test data:

```bash
# From local/dev environment with database access
DATABASE_URL="mysql://..." pnpm seed:light
```

### 2. **One-Time Setup**
Run once after initial database setup, then disable:

```bash
# Initial setup
DATABASE_URL="mysql://..." pnpm seed:light

# Then remove/disable automatic seeding
```

### 3. **Scheduled Job (If Needed)**
If you need periodic reseeding, use a scheduled job instead of POST_DEPLOY:

```yaml
jobs:
  - name: seed-database
    # ... config ...
    kind: SCHEDULED
    schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
```

### 4. **Manual Trigger via DigitalOcean**
If you need to run it in DigitalOcean infrastructure:

```bash
# Create a one-off job run (when job component exists)
doctl apps create-job-run <app-id> <job-name>
```

## When to Run Seed Script

✅ **DO run when:**
- Setting up a new development/staging database
- Resetting test data for QA
- Initial production setup (one-time)
- After major schema changes requiring data refresh

❌ **DON'T run:**
- On every deployment (wasteful, slow, expensive)
- In production with real data (will delete everything!)
- As part of CI/CD pipeline (unless specifically needed)
- Automatically without explicit trigger

## Cost Optimization

**Current Configuration:** Job removed from automatic execution
- **Savings:** No compute costs on every deployment
- **Deployment Speed:** Faster deployments (no seed step)
- **Safety:** Prevents accidental data loss

## Alternative: Incremental Seeding

If you need to add data without clearing:
- Use targeted seed scripts (`seed-critical-tables.ts`, etc.)
- Add data incrementally via migrations
- Use database fixtures for specific test scenarios
