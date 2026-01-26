# Parallel Agent Prompts - Batch 3

**Date:** November 13, 2025  
**Batch:** 4 parallel agents  
**Coordination:** Independent modules, minimal conflicts expected  
**Previous Batches:** Batch 1 (2/3 complete), Batch 2 (3/3 complete)

---

## Agent 1: Add Missing Database Indexes (ST-005)

### Prompt

````
You are Agent 1 of 4 parallel agents working on the TERP project.

TASK: ST-005 - Add Missing Database Indexes
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Database schema (server/db/schema/)

PARALLEL WORK COORDINATION:
- Agent 2 is working on: ST-008 Error Tracking (Sentry integration)
- Agent 3 is working on: ST-009 API Monitoring (Datadog/New Relic)
- Agent 4 is working on: ST-007 System-Wide Pagination (tRPC procedures)
- POTENTIAL CONFLICTS: Agent 4 may touch same router files, coordinate on commits

MANDATORY FIRST STEPS:
1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-005 task - line 190-194)
5. Confirm you understand ALL protocols before proceeding
6. IMMEDIATELY create session file to confirm you've started

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
   Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
   Phase 2: Session Startup (create session file, branch, update roadmap) - DO THIS IMMEDIATELY
   Phase 3: Development (TDD, frequent commits)
   Phase 4: Completion (merge to main, update roadmap, archive session)

✅ TDD mandatory (write tests to verify indexes improve performance)
✅ All tests must pass before ANY commit
✅ No 'any' types allowed
✅ All files must be <500 lines
✅ No TODO, FIXME, or placeholder code
✅ Pre-commit hooks must pass (NEVER use --no-verify)
✅ Push to GitHub every 30 minutes minimum
✅ Update session file with progress every 30 minutes

PARALLEL COORDINATION PROTOCOL:
1. Create session file: docs/sessions/active/Session-[YOUR-ID]-ST-005-db-indexes.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/ST-005-db-indexes-Session-[YOUR-ID]
4. Mark ST-005 "in progress" in MASTER_ROADMAP.md (line 190)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)
7. Coordinate with Agent 4 if both touching router files

TASK REQUIREMENTS (from MASTER_ROADMAP.md line 190-194):
- Task ID: ST-005
- Action: Audit all foreign keys and add missing indexes
- Impact: Improved query performance
- Estimate: 4-6 hours

IMPLEMENTATION STEPS:

**Step 1: Audit Current Schema (1-2 hours)**

```bash
# List all schema files
ls -lh server/db/schema/

# Review each table for foreign keys
# Check for existing indexes
````

**Foreign Key Audit Checklist:**

- [ ] Identify all foreign key columns
- [ ] Check if each FK has an index
- [ ] Document missing indexes
- [ ] Prioritize by query frequency

**Common FK patterns to check:**

- `userId` columns
- `clientId` columns
- `productId` columns
- `orderId` columns
- `invoiceId` columns
- `vendorId` columns

**Step 2: Create Index Migration (1 hour)**

```typescript
// Example: server/db/migrations/add-missing-indexes.ts
import { index } from "drizzle-orm/mysql-core";

export const addMissingIndexes = {
  // Add indexes for foreign keys
  clientUserIdIdx: index("client_user_id_idx").on(clients.userId),
  orderClientIdIdx: index("order_client_id_idx").on(orders.clientId),
  // ... more indexes
};
```

**Step 3: Write Tests (1 hour)**

```typescript
// server/db/schema/indexes.test.ts
import { describe, it, expect } from "vitest";
import { db } from "../db";

describe("Database Indexes", () => {
  it("should have index on clients.userId", async () => {
    // Query to check index exists
    const indexes = await db.execute(
      sql`SHOW INDEX FROM clients WHERE Column_name = 'userId'`
    );
    expect(indexes.length).toBeGreaterThan(0);
  });

  // Test for each critical index
});
```

**Step 4: Apply Migrations (30 min)**

```bash
# Generate migration
pnpm drizzle-kit generate:mysql

# Apply migration to dev database
pnpm drizzle-kit push:mysql

# Verify indexes created
mysql -u root -p terp_dev -e "SHOW INDEX FROM clients;"
```

**Step 5: Performance Testing (1 hour)**

```typescript
// Test query performance before/after
describe("Index Performance", () => {
  it("should improve query performance on clients by userId", async () => {
    const start = performance.now();
    await db.select().from(clients).where(eq(clients.userId, 1));
    const duration = performance.now() - start;

    // Should be fast with index
    expect(duration).toBeLessThan(100); // <100ms
  });
});
```

**Step 6: Documentation (30 min)**

Create `docs/DATABASE_INDEXES.md`:

- List all indexes added
- Explain rationale for each
- Performance improvements measured
- Migration instructions

DELIVERABLES:

- [ ] Index audit report (list of all FKs and missing indexes)
- [ ] Migration file with new indexes
- [ ] Test file verifying indexes exist (10+ tests)
- [ ] Performance test results (before/after)
- [ ] DATABASE_INDEXES.md documentation
- [ ] Updated MASTER_ROADMAP.md (mark ST-005 complete)
- [ ] Session file in docs/sessions/completed/

BEFORE REPORTING DONE:

- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Indexes verified in database (SHOW INDEX)
- [ ] Performance improvement documented
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated (ST-005 marked complete)
- [ ] Session archived

⚠️ CRITICAL: This task affects database performance. Test thoroughly before merging!

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and IMMEDIATELY creating your session file.

```

---

## Agent 2: Implement Error Tracking (ST-008)

### Prompt

```

You are Agent 2 of 4 parallel agents working on the TERP project.

TASK: ST-008 - Implement Error Tracking (Sentry)
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: Error tracking integration (root config files, \_app.tsx)

PARALLEL WORK COORDINATION:

- Agent 1 is working on: ST-005 Database Indexes (schema files)
- Agent 3 is working on: ST-009 API Monitoring (Datadog/New Relic)
- Agent 4 is working on: ST-007 System-Wide Pagination (tRPC procedures)
- NO CONFLICTS EXPECTED - You work on different files

MANDATORY FIRST STEPS:

1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-008 task - line 223-234)
5. Confirm you understand ALL protocols before proceeding

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
Phase 2: Session Startup (create session file, branch, update roadmap)
Phase 3: Development (TDD, frequent commits)
Phase 4: Completion (merge to main, update roadmap, archive session)

✅ TDD mandatory (write tests to verify Sentry captures errors)
✅ All tests must pass before ANY commit
✅ No 'any' types allowed
✅ All files must be <500 lines
✅ No TODO, FIXME, or placeholder code
✅ Pre-commit hooks must pass (NEVER use --no-verify)
✅ Push to GitHub every 30 minutes minimum
✅ Update session file with progress every 30 minutes

PARALLEL COORDINATION PROTOCOL:

1. Create session file: docs/sessions/active/Session-[YOUR-ID]-ST-008-sentry.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/ST-008-sentry-Session-[YOUR-ID]
4. Mark ST-008 "in progress" in MASTER_ROADMAP.md (line 223)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)

TASK REQUIREMENTS (from MASTER_ROADMAP.md line 223-234):

- Task ID: ST-008
- Action: Set up Sentry integration for error tracking
- Impact: Better error tracking and debugging in production
- Estimate: 1-2 days

**Checklist:**

1. ☐ Install Sentry SDK: `pnpm add @sentry/nextjs`
2. ☐ Configure Sentry in `sentry.client.config.ts` and `sentry.server.config.ts`
3. ☐ Add error boundaries in React components
4. ☐ Configure source maps for production
5. ☐ Test error reporting in staging

IMPLEMENTATION STEPS:

**Step 1: Install Sentry (15 min)**

```bash
# Install Sentry SDK
pnpm add @sentry/nextjs

# Initialize Sentry (creates config files)
npx @sentry/wizard@latest -i nextjs
```

**Step 2: Configure Sentry Client (30 min)**

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

**Step 3: Configure Sentry Server (30 min)**

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
});
```

**Step 4: Add Error Boundaries (1 hour)**

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

**Step 5: Integrate with tRPC (1 hour)**

```typescript
// server/_core/errorHandling.ts (update existing)
import * as Sentry from "@sentry/nextjs";

export const createErrorHandlingMiddleware = () => {
  return async (opts: { next: () => Promise<unknown>; ctx: Context }) => {
    try {
      return await opts.next();
    } catch (error) {
      // Send to Sentry
      Sentry.captureException(error, {
        user: opts.ctx.user ? { id: opts.ctx.user.id } : undefined,
        extra: {
          procedure: opts.ctx.path,
          input: opts.ctx.rawInput,
        },
      });

      // Re-throw for tRPC error handling
      throw error;
    }
  };
};
```

**Step 6: Write Tests (2 hours)**

```typescript
// sentry.test.ts
import { describe, it, expect, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";

vi.mock("@sentry/nextjs");

describe("Sentry Integration", () => {
  it("should capture exceptions", () => {
    const error = new Error("Test error");
    Sentry.captureException(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("should include user context", () => {
    const error = new Error("Test error");
    const user = { id: 123 };

    Sentry.captureException(error, { user });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ user })
    );
  });

  // More tests...
});
```

**Step 7: Configure Source Maps (30 min)**

```javascript
// next.config.js (update)
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  {
    // existing config
  },
  {
    silent: true,
    org: "your-org",
    project: "terp",
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
  }
);
```

**Step 8: Test Error Reporting (1 hour)**

```typescript
// Create test page: src/pages/test-sentry.tsx
export default function TestSentry() {
  return (
    <button onClick={() => {
      throw new Error('Test Sentry Error');
    }}>
      Trigger Error
    </button>
  );
}
```

**Step 9: Documentation (30 min)**

Create `docs/ERROR_TRACKING.md`:

- Sentry setup instructions
- How to view errors in Sentry dashboard
- Error context captured
- Best practices for error reporting

DELIVERABLES:

- [ ] Sentry SDK installed and configured
- [ ] sentry.client.config.ts (client configuration)
- [ ] sentry.server.config.ts (server configuration)
- [ ] ErrorBoundary component
- [ ] tRPC integration (updated errorHandling.ts)
- [ ] Tests for Sentry integration (10+ tests)
- [ ] Source maps configured
- [ ] Test error verified in Sentry dashboard
- [ ] ERROR_TRACKING.md documentation
- [ ] Updated .env.example with SENTRY_DSN
- [ ] Updated MASTER_ROADMAP.md (mark ST-008 complete)
- [ ] Session file in docs/sessions/completed/

ENVIRONMENT VARIABLES NEEDED:

```bash
# Add to .env.example
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token
```

BEFORE REPORTING DONE:

- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Test error visible in Sentry dashboard
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated (ST-008 marked complete)
- [ ] Session archived

⚠️ IMPORTANT: Use test/staging Sentry project, not production!

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.

```

---

## Agent 3: Implement API Monitoring (ST-009)

### Prompt

```

You are Agent 3 of 4 parallel agents working on the TERP project.

TASK: ST-009 - Implement API Monitoring
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: API monitoring integration (middleware, config)

PARALLEL WORK COORDINATION:

- Agent 1 is working on: ST-005 Database Indexes (schema files)
- Agent 2 is working on: ST-008 Error Tracking (Sentry)
- Agent 4 is working on: ST-007 System-Wide Pagination (tRPC procedures)
- POTENTIAL CONFLICTS: Agent 4 may touch same middleware, coordinate on commits

MANDATORY FIRST STEPS:

1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-009 task - line 236-247)
5. Confirm you understand ALL protocols before proceeding

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
Phase 2: Session Startup (create session file, branch, update roadmap)
Phase 3: Development (TDD, frequent commits)
Phase 4: Completion (merge to main, update roadmap, archive session)

✅ TDD mandatory (write tests to verify monitoring captures metrics)
✅ All tests must pass before ANY commit
✅ No 'any' types allowed
✅ All files must be <500 lines
✅ No TODO, FIXME, or placeholder code
✅ Pre-commit hooks must pass (NEVER use --no-verify)
✅ Push to GitHub every 30 minutes minimum
✅ Update session file with progress every 30 minutes

PARALLEL COORDINATION PROTOCOL:

1. Create session file: docs/sessions/active/Session-[YOUR-ID]-ST-009-monitoring.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/ST-009-monitoring-Session-[YOUR-ID]
4. Mark ST-009 "in progress" in MASTER_ROADMAP.md (line 236)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)
7. Coordinate with Agent 4 if both touching middleware

TASK REQUIREMENTS (from MASTER_ROADMAP.md line 236-247):

- Task ID: ST-009
- Action: Set up API monitoring (Datadog or New Relic)
- Impact: Proactive performance monitoring
- Estimate: 2-3 days

**Checklist:**

1. ☐ Choose monitoring provider (Datadog recommended)
2. ☐ Install monitoring SDK
3. ☐ Add performance metrics to tRPC procedures
4. ☐ Set up alerts for slow queries (>1s)
5. ☐ Create monitoring dashboard

IMPLEMENTATION STEPS:

**Step 1: Choose Provider and Install (30 min)**

**Option A: Datadog (Recommended)**

```bash
pnpm add dd-trace
```

**Option B: New Relic**

```bash
pnpm add newrelic
```

**For this task, use Datadog.**

**Step 2: Configure Datadog (1 hour)**

```typescript
// server/_core/monitoring.ts
import tracer from "dd-trace";

export function initializeMonitoring() {
  if (process.env.NODE_ENV === "production") {
    tracer.init({
      service: "terp-api",
      env: process.env.NODE_ENV,
      version: process.env.npm_package_version,
      logInjection: true,
      runtimeMetrics: true,
    });
  }
}

// Call in server startup
initializeMonitoring();
```

**Step 3: Add Performance Middleware (2 hours)**

```typescript
// server/_core/performanceMiddleware.ts
import { TRPCError } from "@trpc/server";
import tracer from "dd-trace";

export const performanceMiddleware = async (opts: {
  next: () => Promise<unknown>;
  ctx: Context;
  path: string;
}) => {
  const span = tracer.startSpan("trpc.procedure", {
    resource: opts.path,
    tags: {
      "procedure.name": opts.path,
      "user.id": opts.ctx.user?.id,
    },
  });

  const start = performance.now();

  try {
    const result = await opts.next();
    const duration = performance.now() - start;

    // Log slow queries
    if (duration > 1000) {
      console.warn(`Slow query: ${opts.path} took ${duration}ms`);
      span.setTag("slow_query", true);
    }

    span.setTag("duration_ms", duration);
    span.finish();

    return result;
  } catch (error) {
    span.setTag("error", true);
    span.finish();
    throw error;
  }
};
```

**Step 4: Integrate with tRPC (1 hour)**

```typescript
// server/trpc.ts (update)
import { performanceMiddleware } from "./_core/performanceMiddleware";

export const publicProcedure = t.procedure
  .use(performanceMiddleware)
  .use(errorHandlingMiddleware);

export const protectedProcedure = t.procedure
  .use(performanceMiddleware)
  .use(authMiddleware)
  .use(errorHandlingMiddleware);
```

**Step 5: Add Custom Metrics (2 hours)**

```typescript
// server/_core/metrics.ts
import { StatsD } from "hot-shots";

const statsd = new StatsD({
  host: process.env.DATADOG_HOST || "localhost",
  port: 8125,
  prefix: "terp.",
});

export const metrics = {
  incrementCounter(metric: string, tags?: Record<string, string>) {
    statsd.increment(metric, tags);
  },

  recordTiming(
    metric: string,
    duration: number,
    tags?: Record<string, string>
  ) {
    statsd.timing(metric, duration, tags);
  },

  recordGauge(metric: string, value: number, tags?: Record<string, string>) {
    statsd.gauge(metric, value, tags);
  },
};

// Usage example:
metrics.incrementCounter("api.calls", { endpoint: "getClients" });
metrics.recordTiming("db.query", 45, { table: "clients" });
```

**Step 6: Write Tests (2 hours)**

```typescript
// server/_core/performanceMiddleware.test.ts
import { describe, it, expect, vi } from "vitest";
import { performanceMiddleware } from "./performanceMiddleware";

describe("Performance Middleware", () => {
  it("should track procedure execution time", async () => {
    const next = vi.fn().mockResolvedValue("result");
    const ctx = { user: { id: 1 } };
    const path = "clients.getAll";

    await performanceMiddleware({ next, ctx, path });

    expect(next).toHaveBeenCalled();
  });

  it("should log slow queries (>1s)", async () => {
    const consoleSpy = vi.spyOn(console, "warn");
    const next = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1100))
      );

    await performanceMiddleware({
      next,
      ctx: {},
      path: "slow.procedure",
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Slow query")
    );
  });

  // More tests...
});
```

**Step 7: Set Up Alerts (1 hour)**

```yaml
# datadog-alerts.yaml
alerts:
  - name: "Slow API Queries"
    query: "avg(last_5m):avg:trpc.procedure.duration{*} > 1000"
    message: "API queries are taking >1s on average"
    tags:
      - "service:terp-api"
      - "severity:warning"

  - name: "High Error Rate"
    query: "sum(last_5m):sum:trpc.procedure.errors{*} > 10"
    message: "High error rate detected in API"
    tags:
      - "service:terp-api"
      - "severity:critical"
```

**Step 8: Create Dashboard Config (1 hour)**

```json
// datadog-dashboard.json
{
  "title": "TERP API Monitoring",
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "requests": [
          {
            "q": "avg:trpc.procedure.duration{*} by {procedure.name}",
            "display_type": "line"
          }
        ],
        "title": "Average Procedure Duration"
      }
    },
    {
      "definition": {
        "type": "query_value",
        "requests": [
          {
            "q": "sum:trpc.procedure.errors{*}",
            "aggregator": "sum"
          }
        ],
        "title": "Total Errors (Last Hour)"
      }
    }
  ]
}
```

**Step 9: Documentation (1 hour)**

Create `docs/API_MONITORING.md`:

- Datadog setup instructions
- How to view metrics in dashboard
- Custom metrics available
- Alert configuration
- Troubleshooting guide

DELIVERABLES:

- [ ] Datadog SDK installed and configured
- [ ] monitoring.ts (initialization)
- [ ] performanceMiddleware.ts (performance tracking)
- [ ] metrics.ts (custom metrics)
- [ ] tRPC integration (middleware applied)
- [ ] Tests for monitoring (10+ tests)
- [ ] Alert configuration (datadog-alerts.yaml)
- [ ] Dashboard configuration (datadog-dashboard.json)
- [ ] API_MONITORING.md documentation
- [ ] Updated .env.example with DATADOG_API_KEY
- [ ] Updated MASTER_ROADMAP.md (mark ST-009 complete)
- [ ] Session file in docs/sessions/completed/

ENVIRONMENT VARIABLES NEEDED:

```bash
# Add to .env.example
DATADOG_API_KEY=your-datadog-api-key
DATADOG_HOST=localhost
DD_ENV=development
DD_SERVICE=terp-api
```

BEFORE REPORTING DONE:

- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] Metrics visible in Datadog dashboard
- [ ] Alerts configured and tested
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated (ST-009 marked complete)
- [ ] Session archived

⚠️ IMPORTANT: Use test/staging Datadog account, not production!

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.

```

---

## Agent 4: Implement System-Wide Pagination (ST-007)

### Prompt

```

You are Agent 4 of 4 parallel agents working on the TERP project.

TASK: ST-007 - Implement System-Wide Pagination
REPOSITORY: https://github.com/EvanTenenbaum/TERP
YOUR MODULE: tRPC procedures (server/routers/\*)

PARALLEL WORK COORDINATION:

- Agent 1 is working on: ST-005 Database Indexes (schema files)
- Agent 2 is working on: ST-008 Error Tracking (Sentry)
- Agent 3 is working on: ST-009 API Monitoring (Datadog/New Relic)
- POTENTIAL CONFLICTS: Agent 1 may touch schema, Agent 3 may touch middleware
- Coordinate on commits and pull frequently

MANDATORY FIRST STEPS:

1. Clone repo: git clone https://github.com/EvanTenenbaum/TERP.git
2. Read: docs/ROADMAP_AGENT_GUIDE.md (REQUIRED - contains all protocols)
3. Check: docs/ACTIVE_SESSIONS.md (verify no conflicts)
4. Read: docs/roadmaps/MASTER_ROADMAP.md (find ST-007 task - line 212-221)
5. Confirm you understand ALL protocols before proceeding

CRITICAL PROTOCOLS (NEVER VIOLATE):
✅ Follow mandatory 4-phase workflow:
Phase 1: Pre-Flight Check (review roadmap, check ACTIVE_SESSIONS.md)
Phase 2: Session Startup (create session file, branch, update roadmap)
Phase 3: Development (TDD, frequent commits)
Phase 4: Completion (merge to main, update roadmap, archive session)

✅ TDD mandatory (write tests for pagination)
✅ All tests must pass before ANY commit
✅ No 'any' types allowed
✅ All files must be <500 lines
✅ No TODO, FIXME, or placeholder code
✅ Pre-commit hooks must pass (NEVER use --no-verify)
✅ Push to GitHub every 30 minutes minimum
✅ Update session file with progress every 30 minutes

PARALLEL COORDINATION PROTOCOL:

1. Create session file: docs/sessions/active/Session-[YOUR-ID]-ST-007-pagination.md
2. Update ACTIVE_SESSIONS.md to register your work
3. Use branch: claude/ST-007-pagination-Session-[YOUR-ID]
4. Mark ST-007 "in progress" in MASTER_ROADMAP.md (line 212)
5. Push changes immediately so other agents see your work
6. Check for updates from other agents before each push (git pull --rebase)
7. Coordinate with Agents 1 & 3 if touching same files

TASK REQUIREMENTS (from MASTER_ROADMAP.md line 212-221):

- Task ID: ST-007
- Scope: Expand RF-002 to cover ALL list endpoints, not just dashboard
- Action: Add pagination (limit/offset or cursor-based) to all `getAll` and list endpoints
- Priority Endpoints: Accounting, inventory, orders, clients, vendors
- Implementation: Add `limit` and `offset` parameters to all list procedures
- Testing: Verify pagination works with large datasets (1000+ records)
- Impact: Prevent browser crashes with large datasets
- Estimate: 3-4 days
- Note: This addresses Kimi AI's finding about missing pagination

IMPLEMENTATION STEPS:

**Step 1: Create Pagination Utility (1 day)**

```typescript
// server/_core/pagination.ts
import { z } from "zod";

export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  input: PaginationInput
): PaginatedResponse<T> {
  return {
    items,
    total,
    limit: input.limit,
    offset: input.offset,
    hasMore: input.offset + input.limit < total,
  };
}
```

**Step 2: Write Pagination Tests (1 day)**

```typescript
// server/_core/pagination.test.ts
import { describe, it, expect } from "vitest";
import { createPaginatedResponse, paginationSchema } from "./pagination";

describe("Pagination Utility", () => {
  it("should validate pagination input", () => {
    const result = paginationSchema.parse({ limit: 25, offset: 0 });
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(0);
  });

  it("should use default values", () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it("should enforce max limit", () => {
    expect(() => paginationSchema.parse({ limit: 200 })).toThrow();
  });

  it("should calculate hasMore correctly", () => {
    const response = createPaginatedResponse([1, 2, 3], 100, {
      limit: 3,
      offset: 0,
    });
    expect(response.hasMore).toBe(true);
  });

  it("should handle last page", () => {
    const response = createPaginatedResponse([1, 2, 3], 100, {
      limit: 50,
      offset: 97,
    });
    expect(response.hasMore).toBe(false);
  });
});
```

**Step 3: Update Priority Endpoints (1-2 days)**

**Priority Order:**

1. Accounting endpoints (invoices, payments, GL entries)
2. Inventory endpoints (products, stock movements)
3. Orders endpoints (orders, order items)
4. Clients endpoints (clients, client needs)
5. Vendors endpoints (vendors, vendor products)

**Example: Accounting Router**

```typescript
// server/routers/accounting.ts (update)
import { paginationSchema, createPaginatedResponse } from "../_core/pagination";

export const accountingRouter = router({
  getAllInvoices: protectedProcedure
    .input(
      z.object({
        ...paginationSchema.shape,
        // other filters
      })
    )
    .query(async ({ input, ctx }) => {
      // Get total count
      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(invoices);

      // Get paginated items
      const items = await ctx.db
        .select()
        .from(invoices)
        .limit(input.limit)
        .offset(input.offset);

      return createPaginatedResponse(items, count, input);
    }),

  // Update other procedures...
});
```

**Step 4: Write Integration Tests (1 day)**

```typescript
// server/routers/accounting.test.ts (update)
describe("Accounting Pagination", () => {
  it("should paginate invoices", async () => {
    // Create 100 test invoices
    await createTestInvoices(100);

    const result = await caller.accounting.getAllInvoices({
      limit: 25,
      offset: 0,
    });

    expect(result.items).toHaveLength(25);
    expect(result.total).toBe(100);
    expect(result.hasMore).toBe(true);
  });

  it("should handle offset correctly", async () => {
    await createTestInvoices(100);

    const result = await caller.accounting.getAllInvoices({
      limit: 25,
      offset: 75,
    });

    expect(result.items).toHaveLength(25);
    expect(result.offset).toBe(75);
    expect(result.hasMore).toBe(false);
  });

  it("should enforce max limit", async () => {
    await expect(
      caller.accounting.getAllInvoices({ limit: 200, offset: 0 })
    ).rejects.toThrow();
  });
});
```

**Step 5: Update All List Endpoints (Systematic)**

**Endpoints to Update (from codebase audit):**

- [ ] accounting.getAllInvoices
- [ ] accounting.getAllPayments
- [ ] accounting.getAllGLEntries
- [ ] inventory.getAllProducts
- [ ] inventory.getAllStockMovements
- [ ] orders.getAllOrders
- [ ] orders.getAllOrderItems
- [ ] clients.getAll
- [ ] clients.getAllNeeds
- [ ] vendors.getAll
- [ ] vendors.getAllProducts
- [ ] ... (audit codebase for all `getAll` procedures)

**Step 6: Performance Testing (1 day)**

```typescript
// Test with large datasets
describe("Pagination Performance", () => {
  it("should handle 10,000 records efficiently", async () => {
    await createTestInvoices(10000);

    const start = performance.now();
    const result = await caller.accounting.getAllInvoices({
      limit: 50,
      offset: 0,
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500); // <500ms
    expect(result.items).toHaveLength(50);
  });
});
```

**Step 7: Documentation (1 day)**

Create `docs/PAGINATION_GUIDE.md`:

- Pagination utility usage
- How to add pagination to new endpoints
- Frontend integration examples
- Performance considerations
- Best practices

DELIVERABLES:

- [ ] pagination.ts utility (pagination schema and helpers)
- [ ] pagination.test.ts (10+ tests)
- [ ] Updated accounting router with pagination
- [ ] Updated inventory router with pagination
- [ ] Updated orders router with pagination
- [ ] Updated clients router with pagination
- [ ] Updated vendors router with pagination
- [ ] Integration tests for all updated endpoints (50+ tests)
- [ ] Performance tests with large datasets
- [ ] PAGINATION_GUIDE.md documentation
- [ ] Updated MASTER_ROADMAP.md (mark ST-007 complete)
- [ ] Session file in docs/sessions/completed/

BEFORE REPORTING DONE:

- [ ] All tests passing (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Zero ESLint warnings
- [ ] All priority endpoints paginated
- [ ] Performance tests passing (<500ms for 10k records)
- [ ] Documentation complete
- [ ] Pre-commit hooks passing
- [ ] Merged to main
- [ ] Roadmap updated (ST-007 marked complete)
- [ ] Session archived

⚠️ CRITICAL: This is a large task (3-4 days). Break into small commits and push frequently!

RECOMMENDED APPROACH:

- Day 1: Pagination utility + tests
- Day 2: Accounting + Inventory routers
- Day 3: Orders + Clients + Vendors routers
- Day 4: Performance testing + documentation

START BY: Reading docs/ROADMAP_AGENT_GUIDE.md and confirming you understand all protocols.

```

---

## Coordination Summary - Batch 3

### Module Assignments (Minimal Conflicts)

| Agent | Task ID | Module | Estimate | Branch |
|-------|---------|--------|----------|--------|
| Agent 1 | **ST-005** | Database Indexes | 4-6 hours | `claude/ST-005-db-indexes-Session-[ID]` |
| Agent 2 | **ST-008** | Error Tracking (Sentry) | 1-2 days | `claude/ST-008-sentry-Session-[ID]` |
| Agent 3 | **ST-009** | API Monitoring (Datadog) | 2-3 days | `claude/ST-009-monitoring-Session-[ID]` |
| Agent 4 | **ST-007** | System-Wide Pagination | 3-4 days | `claude/ST-007-pagination-Session-[ID]` |

### Potential Conflicts

**Minor conflicts:**
1. **Agent 1 & Agent 4:** Both may touch router files
   - Agent 1: Adding indexes (schema changes)
   - Agent 4: Adding pagination (procedure changes)
   - Resolution: Different files, but coordinate on commits

2. **Agent 3 & Agent 4:** Both may touch middleware
   - Agent 3: Adding performance middleware
   - Agent 4: May need to update middleware for pagination
   - Resolution: Agent 3 should complete middleware first, Agent 4 pulls latest

### Expected Timeline

- **Agent 1 (ST-005):** 4-6 hours (fastest)
- **Agent 2 (ST-008):** 1-2 days (medium)
- **Agent 3 (ST-009):** 2-3 days (medium-slow)
- **Agent 4 (ST-007):** 3-4 days (slowest)

**Staggered Completion:**
- Day 1: Agent 1 completes
- Day 2: Agent 2 completes
- Day 3: Agent 3 completes
- Day 4: Agent 4 completes

### Success Criteria (All Agents)

- ✅ All tests passing (no regressions)
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ Comprehensive documentation
- ✅ Merged to main
- ✅ Roadmap updated (correct task ID marked complete)
- ✅ Session archived
- ✅ Session file created within 15 minutes

### Communication Protocol

**Each agent MUST:**
1. Register in ACTIVE_SESSIONS.md immediately (within 15 minutes)
2. Push to GitHub every 30 minutes (especially Agent 4 - large task!)
3. Update session file with progress every 30 minutes
4. Check for updates before each push (git pull --rebase)
5. Mark correct task ID "in progress" in MASTER_ROADMAP.md

### Special Instructions

**Agent 1 (ST-005):**
- Test thoroughly - database changes are critical
- Document all indexes added
- Measure performance improvements

**Agent 2 (ST-008):**
- Use test/staging Sentry project
- Don't use production credentials
- Test error reporting before merging

**Agent 3 (ST-009):**
- Use test/staging Datadog account
- Coordinate with Agent 4 on middleware
- Set up alerts carefully

**Agent 4 (ST-007):**
- This is the largest task (3-4 days)
- Break into small commits (daily)
- Push frequently to avoid conflicts
- Prioritize endpoints systematically
- Update session file daily with progress

---

**Ready to start all 4 agents in Batch 3!**
```
