# Agent 6E: Testing & Documentation

**Estimated Time**: 12-16 hours  
**Priority**: MEDIUM - Quality assurance  
**Dependencies**: None (can start immediately)

---

## Mission

Fix skipped tests, add performance benchmarks, and update documentation.

---

## Context

Current state:
- Multiple skipped tests (it.skip, describe.skip)
- No performance test suite
- Documentation may be outdated
- README needs verification

---

## Prompt

```
You are working on the TERP cannabis ERP project.

## Setup
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install

## Your Mission: Testing & Documentation

### Task 1: Fix Skipped Tests - 6-8h

#### 1.1 Find All Skipped Tests
grep -rn "it.skip\|describe.skip\|test.skip\|xit\|xdescribe" --include="*.test.ts" --include="*.spec.ts" --include="*.test.tsx" client/ server/ > /tmp/skipped.txt
cat /tmp/skipped.txt
wc -l /tmp/skipped.txt

#### 1.2 Categorize Each Skipped Test

For each skipped test, determine:

**Fix if:**
- Test logic is correct but assertion needs update
- Test was skipped due to temporary issue now resolved
- Test needs minor refactoring to work

**Remove if:**
- Test is for removed/deprecated feature
- Test is duplicate of another test
- Test is fundamentally broken and not worth fixing

**Keep skipped if:**
- Requires major infrastructure (e.g., external service)
- Needs significant refactoring (>2h)
- Create GitHub issue for follow-up

#### 1.3 Fix Process
For each test you fix:
1. Remove .skip
2. Run: pnpm test -- --grep "test name"
3. Fix any failures
4. Verify it passes consistently

#### 1.4 Target: 75% reduction in skipped tests

### Task 2: Performance Testing (QA-026) - 4-6h

#### 2.1 Create Performance Test Directory
mkdir -p tests/performance

#### 2.2 Create API Benchmark Tests
Create tests/performance/api-benchmarks.test.ts:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../server';
import supertest from 'supertest';

describe('API Performance Benchmarks', () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    app = await createServer();
    request = supertest(app);
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Read Operations (target: <500ms)', () => {
    it('GET /api/trpc/health.check should respond quickly', async () => {
      const start = Date.now();
      const response = await request.get('/api/trpc/health.check');
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
      console.log(`health.check: ${duration}ms`);
    });

    // Add more read endpoint tests...
  });

  describe('Write Operations (target: <1000ms)', () => {
    // Add write endpoint tests...
  });
});
```

#### 2.3 Create Performance README
Create tests/performance/README.md:

```markdown
# Performance Tests

## Running Performance Tests

\`\`\`bash
# Run all performance tests
pnpm test -- tests/performance/

# Run with verbose output
pnpm test -- tests/performance/ --reporter=verbose
\`\`\`

## Benchmarks

| Endpoint | Target | Current |
|----------|--------|---------|
| health.check | <500ms | TBD |
| inventory.list | <500ms | TBD |
| orders.list | <500ms | TBD |

## Adding New Benchmarks

1. Add test to api-benchmarks.test.ts
2. Set appropriate target time
3. Run and document baseline
4. Update this table
```

### Task 3: Documentation Updates - 4-6h

#### 3.1 Update README.md

Verify and update:
- [ ] Prerequisites (Node version, pnpm, etc.)
- [ ] Installation steps actually work
- [ ] Environment variables are complete
- [ ] Development commands are correct
- [ ] Add troubleshooting section

Test by following the README on a fresh checkout.

#### 3.2 Create Deployment Documentation
Create docs/DEPLOYMENT.md:

```markdown
# TERP Deployment Guide

## Pre-Deployment Checklist

- [ ] All tests passing: `pnpm test`
- [ ] TypeScript check: `pnpm check`
- [ ] Build succeeds: `pnpm build`
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Feature flags reviewed

## Environment Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | Database connection string | mysql://... |
| SESSION_SECRET | Session encryption key | random-string |
| ... | ... | ... |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| VITE_SENTRY_DSN | Sentry error tracking | (disabled) |
| ... | ... | ... |

## Database Migrations

\`\`\`bash
# Check migration status
pnpm drizzle-kit status

# Apply pending migrations
pnpm drizzle-kit push

# Generate new migration
pnpm drizzle-kit generate
\`\`\`

## Rollback Procedures

### Application Rollback
1. Revert to previous Docker image/commit
2. Verify health endpoint
3. Monitor error rates

### Database Rollback
1. Restore from backup
2. Or manually revert migration
```

#### 3.3 Document All Environment Variables
Create or update docs/ENVIRONMENT.md with every env var from .env.example, with descriptions.

### Task 4: Verify Everything

1. pnpm test (run full suite, note any new failures)
2. pnpm check (must pass)
3. Follow README instructions on fresh clone
4. Verify docs are accurate

### Task 5: Create PR

git checkout -b test/fix-skipped-tests-and-docs
git add -A
git commit -m "test(qa): fix skipped tests and update documentation

Testing:
- Fixed X skipped tests (Y% reduction)
- Removed Z obsolete tests
- Added performance benchmark suite

Documentation:
- Updated README with accurate setup instructions
- Created DEPLOYMENT.md guide
- Documented all environment variables"

git push origin test/fix-skipped-tests-and-docs
gh pr create --title "test(qa): fix skipped tests and add documentation" --body "..."
```

---

## Success Criteria

- [ ] Skipped test count reduced by 75%
- [ ] Performance test suite created
- [ ] README verified to work
- [ ] DEPLOYMENT.md created
- [ ] All env vars documented
- [ ] pnpm test passes (or same failures as before)
- [ ] pnpm check passes

---

## Files Created/Modified

| File | Change |
|------|--------|
| tests/**/*.test.ts | Fix skipped tests |
| tests/performance/api-benchmarks.test.ts | NEW |
| tests/performance/README.md | NEW |
| README.md | Update and verify |
| docs/DEPLOYMENT.md | NEW |
| docs/ENVIRONMENT.md | NEW or update |

---

## Merge Priority

**Merge SECOND** - After QA backlog cleanup, before code changes. Test fixes should go in early.
