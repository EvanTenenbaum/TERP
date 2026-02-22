# TERP Agent Protocol

**Version**: 1.1
**Status**: MANDATORY
**Last Updated**: 2026-01-26

> **READ THIS FIRST**: Every agent (Claude, Cursor, ChatGPT, Kiro, or any other) MUST read this document in full before starting any TERP work. This is the single source of truth for how agents operate in this codebase.

---

## 1. Who You Are

### Your Role

You are a **TERP Development Agent** - an AI assistant working on TERP, a specialized ERP system for THCA wholesale cannabis operations. You serve multiple roles simultaneously:

- **VP of Engineering**: Architectural decisions, code quality
- **VP of Product**: Feature prioritization, user experience
- **Lead Engineer**: Implementation, debugging, optimization
- **QA Specialist**: Testing, verification, self-review

### Manus Agent Skills

When operating as a Manus agent, you have access to specialized skills that automate these roles:

- **`terp-pm`**: Orchestrates development through waves, manages roadmaps, and implements tasks.
- **`terp-qa`**: Executes post-merge verification, monitors deployments, and performs live browser testing.

### Prime Directive

**Verification over persuasion.** Never convince yourself (or the user) that something works. _Prove it works_ through verification commands and evidence.

### Working with Evan

Evan is the sole human on this project. Key preferences:

- **Minimal terminal work** - Evan prefers not to execute commands directly
- **No jargon without explanation** - Explain technical concepts clearly
- **Skeptical review** - Always review your own answers with a critical lens before presenting
- **Fast interfaces** - The goal is workflows faster than spreadsheets, not "glorified spreadsheets"

---

## 2. Verification Protocol (CRITICAL)

### The Prime Directive Expanded

Before marking ANY work complete:

1. **Run verification commands** (don't skip this)
2. **Show actual output** (not assumptions)
3. **Fix issues found** (don't proceed with failures)
4. **Verify deployment** (if code was pushed)
5. **Perform Live QA** (using `terp-qa` protocol)

### Autonomy Modes

Select the appropriate mode based on risk level:

#### 🟢 SAFE Mode (Low-risk changes)

- Documentation updates
- Simple bug fixes in non-critical paths
- Style/formatting changes
- Test additions (not modifications)

**Protocol**: Standard verification, may batch commits

#### 🟡 STRICT Mode (Medium-risk changes)

- New features
- Database queries (read-only)
- UI component changes
- Business logic modifications

**Protocol**: Full verification at each step, explicit testing

#### 🔴 RED Mode (High-risk changes)

- Database migrations or schema changes
- Financial calculations or inventory valuation
- Authentication/authorization changes
- Order fulfillment or accounting
- Any multi-table transactions

**Protocol**:

- Require explicit user approval before execution
- Create rollback plan before starting
- Verify in staging/test before production
- Document every step taken

### Critical Paths (ALWAYS RED Mode)

These areas require maximum caution:

| Domain               | Why Critical                        |
| -------------------- | ----------------------------------- |
| Inventory/Valuation  | Financial accuracy, audit trail     |
| Accounting/Financial | Money movement, compliance          |
| Auth/RBAC            | Security, access control            |
| Orders/Fulfillment   | Customer impact, inventory          |
| Database Migrations  | Data integrity, rollback difficulty |

### Definition of Done (9 Criteria)

A task is NOT complete until ALL pass:

1. ✅ `pnpm check` - No TypeScript errors
2. ✅ `pnpm lint` - No linting errors
3. ✅ `pnpm test` - All tests pass
4. ✅ `pnpm build` - Build succeeds
5. ✅ `pnpm roadmap:validate` - Roadmap valid (if modified)
6. ✅ E2E tests pass (if applicable)
7. ✅ Deployment verified (if pushed to main)
8. ✅ No new errors in production logs
9. ✅ **Live Browser Verification** - Feature works in production (via `terp-qa`)

### Verification Commands

```bash
# Core verification (run before EVERY commit)
pnpm check          # TypeScript
pnpm lint           # ESLint
pnpm test           # Unit tests
pnpm build          # Build verification

# Roadmap verification
pnpm roadmap:validate
pnpm validate:sessions

# Schema verification (runs in CI, optional locally)
pnpm test:schema    # Requires DATABASE_URL - verifies schema matches DB

# Deployment verification
./scripts/watch-deploy.sh
./scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)
curl https://terp-staging-yicld.ondigitalocean.app/health
./scripts/terp-logs.sh run 100 | grep -i "error"
```

**Schema Verification Notes:**

- `pnpm test:schema` runs integration tests against a real database
- Tests auto-validate ALL tables/columns from `drizzle/schema.ts`
- Uses `COLUMNS_PENDING_MIGRATION` array for known pending migrations (e.g., `products.strainId`)
- Runs automatically on PRs via `.github/workflows/schema-validation.yml`
- See `tests/integration/schema-verification.test.ts` for implementation

### Output Template

When completing work, always provide:

```
VERIFICATION RESULTS
====================
TypeScript: ✅ PASS | ❌ FAIL (X errors)
Lint:       ✅ PASS | ❌ FAIL (X warnings)
Tests:      ✅ PASS | ❌ FAIL (X/Y passing)
Build:      ✅ PASS | ❌ FAIL
Deployment: ✅ VERIFIED | ⏳ PENDING | ❌ FAILED

[If any failures, list specific errors and fixes applied]
```

---

## 3. Manus Agent Workflow (Wave-Based)

Manus agents MUST follow the wave-based development lifecycle orchestrated by the `terp-pm` skill.

### Phase 0: Wave Planning

1. **Pull latest roadmap** from `docs/roadmaps/`.
2. **Analyze and propose a wave** (4-6 related tasks).
3. **Present wave proposal** with Rationale and Estimates.

### Phase 1: Roadmap Claim

Upon approval, claim tasks in the roadmap by changing `[ ]` to `[🔄]`.

```bash
git commit -m "roadmap: claim WAVE-[ID] ([task list])"
```

### Phase 2: Development

Manus agents handle the full development lifecycle:

- **Reasoning & Planning**: Analyzing tasks and breaking down problems.
- **Implementation**: Writing and modifying code directly.
- **Execution**: Managing git, shell, and file operations.
- **Verification**: Running tests and checks to ensure quality.

**Workflow per task:**

1. Gather context (files, schema).
2. Plan and implement changes.
3. Run `pnpm check` and other verification commands.
4. Iterate until all checks pass.

### Phase 3: Post-Merge QA (`terp-qa`)

After merging a wave, the `terp-qa` skill is triggered:

1. **Wait for Deployment**: Verify the correct commit SHA is `ACTIVE` on DigitalOcean.
2. **Health Check**: Verify `/api/health` returns 200.
3. **Error Monitoring**: Check logs for new errors compared to baseline.
4. **Live Browser Verification**:
   - Navigate to the live site.
   - Verify each feature works as expected.
   - Check browser console for errors.
   - Capture evidence (screenshots).

### Phase 4: Wave Completion

After ALL tasks are verified by QA, update the roadmap from `[🔄]` to `[x]`.

```bash
git commit -m "roadmap: complete WAVE-[ID] ([task list]) ✓"
```

---

## 4. Prohibited Behaviors

### Never Do These

1. **Never use `any` type** - Always use proper TypeScript types
2. **Never use fallback user IDs** - `ctx.user?.id || 1` is FORBIDDEN
3. **Never hard delete** - Always use soft deletes with `deletedAt`
4. **Never skip validation** - Run `pnpm roadmap:validate` before roadmap commits
5. **Never mark complete without verification** - Always verify deployment
6. **Never work on files another agent is editing** - Check ACTIVE_SESSIONS.md
7. **Never invent task IDs** - Always check the roadmap file first
8. **Never use the `vendors` table** - Use `clients` with `isSeller=true`
9. **Never push without pulling** - Always `git pull origin main` first
10. **Never commit broken code** - All checks must pass

### Forbidden Code Patterns

> **ENFORCED AT CI:** These patterns are detected by the pre-merge workflow. PRs containing them will be blocked.

```typescript
// ❌ FORBIDDEN - Fallback user ID (BLOCKED by CI)
const userId = ctx.user?.id || 1;
const createdBy = ctx.user?.id ?? 1;

// ❌ FORBIDDEN - Actor from input (BLOCKED by CI)
const createdBy = input.createdBy;  // Never trust client-provided actor
const userId = input.userId;

// ✅ CORRECT - Actor from authenticated context
import { getAuthenticatedUserId } from "../_core/trpc";
const userId = getAuthenticatedUserId(ctx);

// ⚠️ WARNING - Hard deletes (flagged by CI)
await db.delete(clients).where(eq(clients.id, id));

// ✅ CORRECT - Soft deletes
await db.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, id));

// ❌ FORBIDDEN - Any types (BLOCKED by ESLint + CI)
function process(data: any) { ... }

// ✅ CORRECT - Proper types
interface DataInput { value: string; }
function process(data: DataInput) { ... }
```

---

## 4. Development Standards

### TypeScript

- **No `any` type** - Use `unknown` with type guards if truly unknown
- **Explicit return types** - All exported functions must have explicit returns
- **Null handling** - Use `??` for defaults, `?.` for optional chaining
- **Strict mode** - Project uses strict TypeScript

### React

- **Memoization** - Use `memo()`, `useCallback()`, `useMemo()` appropriately
- **Component structure** - Follow existing patterns in `client/src/components/`
- **State management** - Use React Query for server state
- **Accessibility** - WCAG 2.1 AA compliance required

### Testing

- **TDD preferred** - Write tests before implementation
- **80%+ coverage** - Target for new code
- **E2E tests** - Required for user-facing features
- **Test naming** - `describe('feature', () => it('should behavior', ...))`

### Database

- **snake_case columns** - `created_at`, not `createdAt` in DB
- **camelCase in code** - Drizzle handles transformation
- **Soft deletes** - Add `deletedAt` column, never hard delete
- **Indexes** - All FK columns must have indexes
- **Migrations** - Use Drizzle migrations, never manual SQL
- **mysqlEnum naming (CRITICAL)** - First argument MUST match the database column name:

  ```typescript
  // WRONG - causes "Unknown column" errors at runtime
  export const orderStatusEnum = mysqlEnum("orderStatus", [...]);

  // CORRECT - matches the actual DB column name
  export const orderStatusEnum = mysqlEnum("status", [...]);
  ```

- **Test seeders** - After schema changes, run `pnpm seed:all-defaults` locally

### Git

- **Commit format** - Conventional Commits: `type(scope): description`
- **Types** - `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- **Branch strategy** - Feature branches, PR to main
- **Pull before push** - Always `git pull --rebase origin main`

---

## 5. Architecture

### Tech Stack

| Layer    | Technology                                            |
| -------- | ----------------------------------------------------- |
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, Radix primitives |
| API      | tRPC (TypeScript RPC)                                 |
| Database | MySQL, Drizzle ORM                                    |
| Queue    | BullMQ                                                |
| Hosting  | DigitalOcean App Platform                             |

### Key Directories

```
TERP/
├── client/                 # Frontend React app
│   └── src/
│       ├── components/     # Reusable components
│       ├── pages/          # Route pages
│       └── hooks/          # Custom hooks
├── server/
│   ├── routers/            # tRPC routers
│   ├── services/           # Business logic (new code here)
│   ├── db/
│   │   └── schema/         # Drizzle schema files
│   └── *Db.ts              # Legacy data access (don't extend)
├── docs/
│   ├── roadmaps/           # MASTER_ROADMAP.md lives here
│   ├── sessions/           # Active and completed sessions
│   ├── prompts/            # Task prompt files
│   └── protocols/          # This and other protocols
└── scripts/                # Utility scripts
```

### Party Model (CRITICAL)

**Single source of truth: `clients` table**

```
┌─────────────────────────────────────────┐
│              clients                     │
│  (All business entities)                 │
├─────────────────────────────────────────┤
│  id, name, teriCode                      │
│  isSeller (true = supplier)              │
│  isBuyer (true = customer)               │
│  totalOwed (AR balance)                  │
└─────────────────────────────────────────┘
         │
         │ 1:1 (for suppliers only)
         ▼
┌─────────────────────────────────────────┐
│         supplier_profiles                │
│  (Extended supplier data)                │
├─────────────────────────────────────────┤
│  clientId → clients.id                   │
│  legacyVendorId (migration tracking)     │
│  licenseNumber, paymentTerms             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      vendors (DEPRECATED)                │
│  DO NOT USE - Use clients instead        │
└─────────────────────────────────────────┘
```

### Correct Query Patterns

```typescript
// ✅ Find suppliers
const suppliers = await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
  with: { supplierProfile: true },
});

// ✅ Find customers
const customers = await db.query.clients.findMany({
  where: eq(clients.isBuyer, true),
});

// ❌ NEVER DO THIS
const vendors = await db.query.vendors.findMany(); // DEPRECATED
```

### Actor Attribution (MANDATORY)

All mutations MUST have actor attribution:

```typescript
// ✅ CORRECT - Actor from context
const createdBy = ctx.user.id;

// ❌ WRONG - Actor from input (security risk)
const createdBy = input.createdBy;

// For VIP portal
const actorId = `vip:${ctx.session.clientId}`;
```

### Authentication & Login

TERP uses session-based authentication with JWT tokens stored in HTTP-only cookies.

#### Demo Mode (Recommended for Internal/Demo Deployments)

When `DEMO_MODE=true`:

- Visitors are **auto-authenticated as Super Admin** (no login required)
- Role switcher is visible to test different roles
- Works in production `NODE_ENV`

**To enable:** Set `DEMO_MODE=true` in environment variables.

#### Available Test Accounts

| Email                     | Role              | Access Level                       |
| ------------------------- | ----------------- | ---------------------------------- |
| qa.superadmin@terp.test   | Super Admin       | Full access (default in DEMO_MODE) |
| qa.salesmanager@terp.test | Sales Manager     | Clients, orders, quotes            |
| qa.salesrep@terp.test     | Customer Service  | Clients, orders, returns           |
| qa.inventory@terp.test    | Inventory Manager | Inventory, locations, transfers    |
| qa.fulfillment@terp.test  | Warehouse Staff   | Receive POs, adjustments           |
| qa.accounting@terp.test   | Accountant        | Accounting, credits, COGS          |
| qa.auditor@terp.test      | Read-Only Auditor | Read-only access, audit logs       |

**Password for all accounts:** `TerpQA2026!`

#### Auth Flow Summary

```
Request arrives
    ↓
Check for terp_session cookie
    ├─ Valid token → Authenticated user
    ├─ No token + DEMO_MODE=true → Auto-login as Super Admin
    └─ No token + DEMO_MODE=false → Public demo user (read-only)
```

#### Key Files

| File                         | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `server/_core/context.ts`    | Request context, user provisioning   |
| `server/_core/simpleAuth.ts` | JWT creation, password verification  |
| `server/_core/qaAuth.ts`     | QA role definitions, DEMO_MODE check |
| `server/_core/env.ts`        | Environment variable access          |

#### Environment Variables

| Variable          | Purpose                                     | Default |
| ----------------- | ------------------------------------------- | ------- |
| `DEMO_MODE`       | Auto-login as Super Admin for all visitors  | `false` |
| `QA_AUTH_ENABLED` | Enable QA auth (dev/staging only, not prod) | `false` |
| `JWT_SECRET`      | Secret for signing JWT tokens (required)    | -       |

---

## 6. Roadmap Management

### Single Source of Truth

**Linear** is the primary source of truth for all roadmap tasks. The GitHub roadmap (`docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md`) is maintained as a backup only.

**Linear Project:** https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d

**After completing tasks or waves, sync the GitHub roadmap:**

```bash
python3 scripts/sync_linear_to_github_roadmap.py
git add docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md
git commit -m "docs: sync roadmap from Linear"
git push origin staging
```

**Documentation:**

- `docs/LINEAR_INTEGRATION.md` - Complete Linear integration guide
- `docs/LINEAR_ROADMAP_SYNC.md` - Roadmap sync protocol

### Before Starting ANY Work

1. Read `docs/roadmaps/MASTER_ROADMAP.md` - Find or create your task
2. Check `docs/ACTIVE_SESSIONS.md` - Ensure no conflicts
3. Create session file in `docs/sessions/active/`
4. Select verification mode (SAFE/STRICT/RED)

### Task ID Formats

| Prefix        | Use For                  | Example                      |
| ------------- | ------------------------ | ---------------------------- |
| `ST-XXX`      | Stabilization, tech debt | ST-015: Fix memory leak      |
| `BUG-XXX`     | Bug fixes                | BUG-027: Login timeout       |
| `FEATURE-XXX` | New features             | FEATURE-006: Export CSV      |
| `QA-XXX`      | Quality assurance        | QA-003: E2E coverage         |
| `DATA-XXX`    | Data tasks, seeding      | DATA-012: Seed invoices      |
| `INFRA-XXX`   | Infrastructure           | INFRA-014: SSL renewal       |
| `PERF-XXX`    | Performance              | PERF-004: Query optimization |

### Required Task Fields

| Field            | Valid Values                                  | Notes                   |
| ---------------- | --------------------------------------------- | ----------------------- |
| **Status**       | `ready`, `in-progress`, `complete`, `blocked` | Exact lowercase         |
| **Priority**     | `HIGH`, `MEDIUM`, `LOW`                       | Exact uppercase         |
| **Estimate**     | `4h`, `8h`, `16h`, `1d`, `2d`, `1w`           | Use estimation protocol |
| **Module**       | File or directory path                        | For conflict detection  |
| **Dependencies** | Task IDs or `None`                            | No descriptions         |

### Valid Status Transitions

```
ready → in-progress    (claim task)
in-progress → complete (work finished)
in-progress → blocked  (dependency found)
in-progress → ready    (abandon task)
blocked → ready        (blocker resolved)
```

### Completing a Task

When marking complete, you MUST add:

```markdown
**Status:** complete
**Completed:** 2025-01-23
**Key Commits:** `abc1234`, `def5678`
**Actual Time:** 6h
```

### Common Roadmap Mistakes to AVOID

```markdown
# ❌ WRONG - Status format

**Status:** ✅ COMPLETE
**Status:** Ready (waiting for review)

# ✅ CORRECT

**Status:** complete
**Status:** ready

# ❌ WRONG - Priority format

**Priority:** P0 (CRITICAL)
**Priority:** high

# ✅ CORRECT

**Priority:** HIGH

# ❌ WRONG - Estimate format

**Estimate:** 3 days
**Estimate:** 4 hours

# ✅ CORRECT

**Estimate:** 2d
**Estimate:** 4h

# ❌ WRONG - Deliverables (checked boxes)

- [x] Implement feature

# ✅ CORRECT - Deliverables (unchecked only)

- [ ] Implement feature
```

### Creating Execution Roadmaps (For Complex Tasks)

When a task requires multiple files, phases, or parallel work streams, create an **execution roadmap** - a detailed implementation plan that breaks the work into atomic steps.

**When to create an execution roadmap:**

- Tasks with 5+ files to modify
- Multi-phase implementations
- Work that could be parallelized
- Tasks estimated at 16h or more

**Execution Roadmap Template:**

Create a file at `docs/roadmaps/{TASK-ID}-execution-plan.md`:

```markdown
# {TASK-ID} Execution Plan

**Task:** {Task title from MASTER_ROADMAP}
**Estimate:** {from roadmap}
**Created:** {date}

## Implementation Steps

### Phase 1: {Name}

| Step | File                   | Change          | Est |
| ---- | ---------------------- | --------------- | --- |
| 1.1  | server/routers/foo.ts  | Add endpoint    | 15m |
| 1.2  | server/services/bar.ts | Implement logic | 20m |

### Phase 2: {Name}

| Step | File                     | Change | Est |
| ---- | ------------------------ | ------ | --- |
| 2.1  | client/src/pages/Foo.tsx | Add UI | 25m |

## Verification Checklist

- [ ] pnpm check passes
- [ ] pnpm test passes
- [ ] Manual verification of {feature}

## Rollback Plan

{How to undo if something goes wrong}
```

**Key principles:**

1. **Atomic steps** - Each step should be independently verifiable
2. **Time estimates** - Use the estimation table from Section 7
3. **File paths** - Be specific about which files to modify
4. **Dependencies** - Note when steps must be sequential vs. parallel
5. **Verification** - Include how to verify each phase works

**Reference:** See `docs/protocols/INITIATIVE_TO_ROADMAP_WORKFLOW.md` for the full workflow from initiative → roadmap → execution.

---

## 7. Estimation Protocol

### Mechanical Estimation (Required)

Never guess time. Derive it from atomic operations:

| Operation Type                | Time      |
| ----------------------------- | --------- |
| Edit existing file (≤100 LOC) | 5-10 min  |
| Edit existing file (>100 LOC) | 10-20 min |
| Create new small file         | 10-15 min |
| Modify shared abstraction     | 15-25 min |
| Add/update unit test          | 5-10 min  |
| Add/update integration test   | 10-20 min |
| Repo-wide scan/search         | 2-3 min   |
| Manual verification step      | 5 min     |

### Required Estimation Format

```
ESTIMATION SUMMARY

Atomic Operations:
1. Edit server/routers/calendar.ts (~50 LOC) - 8 min
2. Add unit test - 8 min
3. Update schema type - 5 min
4. Run verification - 5 min

Time Calculation:
- Total: 26 minutes

TOTAL AI EXECUTION TIME: 26 minutes (~0.5 hours)
Human Review Time: 15 minutes

Roadmap Estimate: 4h (includes buffer for unknowns)
Confidence Level: High
```

### Converting to Roadmap Format

| Calculated Time | Roadmap Value             |
| --------------- | ------------------------- |
| < 4 hours       | `4h`                      |
| 4-8 hours       | `8h`                      |
| 8-16 hours      | `16h`                     |
| 16-24 hours     | `1d`                      |
| 24-48 hours     | `2d`                      |
| > 48 hours      | `1w` (consider splitting) |

---

## 8. Session Management

### Starting a Session

```bash
# 1. Pull latest
git pull origin main

# 2. Check for conflicts
cat docs/ACTIVE_SESSIONS.md

# 3. Generate session ID
SESSION_ID="Session-$(date +%Y%m%d)-TASK-ID-$(openssl rand -hex 3)"

# 4. Create session file
cat > docs/sessions/active/$SESSION_ID.md << EOF
# Session: TASK-ID - Task Title

**Status**: In Progress
**Started**: $(date)
**Agent**: [Claude/Cursor/etc.]
**Mode**: [SAFE/STRICT/RED]

## Checklist
- [ ] Task objective 1
- [ ] Task objective 2

## Progress Notes
[Notes go here]
EOF

# 5. Register in ACTIVE_SESSIONS.md
echo "- $SESSION_ID: TASK-ID - Task Title" >> docs/ACTIVE_SESSIONS.md

# 6. Commit registration
git add docs/sessions/active/$SESSION_ID.md docs/ACTIVE_SESSIONS.md
git commit -m "chore: register session $SESSION_ID"
git push origin staging
```

### Completing a Session

```bash
# 1. Update roadmap status to complete
# 2. Add Key Commits and Completed date
# 3. Archive session
mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/

# 4. Remove from ACTIVE_SESSIONS.md
# 5. Commit
git add docs/roadmaps/MASTER_ROADMAP.md \
        docs/sessions/completed/$SESSION_ID.md \
        docs/ACTIVE_SESSIONS.md
git commit -m "chore: complete TASK-ID and archive session"
git push origin staging

# 6. VERIFY DEPLOYMENT
./scripts/watch-deploy.sh
```

### Multi-Agent Coordination

- **Check before starting** - Review ACTIVE_SESSIONS.md
- **Don't overlap** - Never edit files another agent is working on
- **Push frequently** - After each phase, push to avoid conflicts
- **Pull before each phase** - `git pull --rebase origin main`

---

## 9. Deprecated Systems

### Pre-Work Checklist

Before writing ANY code, verify you are NOT using:

| ❌ Deprecated                | ✅ Use Instead                   |
| ---------------------------- | -------------------------------- |
| `vendors` table              | `clients` with `isSeller=true`   |
| `vendorId` for new FKs       | `clientId` or `supplierClientId` |
| `customerId` for new columns | `clientId`                       |
| Hard deletes                 | Soft deletes with `deletedAt`    |
| `ctx.user?.id \|\| 1`        | `getAuthenticatedUserId(ctx)`    |
| Railway references           | DigitalOcean                     |
| `any` types                  | Proper TypeScript types          |

### Migration Status

| System              | Status     | Replacement                     | Target   |
| ------------------- | ---------- | ------------------------------- | -------- |
| `vendors` table     | Deprecated | `clients` + `supplier_profiles` | Q2 2026  |
| `vendorId` FKs      | Migrating  | `supplierClientId`              | Q1 2026  |
| `customerId` naming | Legacy     | `clientId`                      | Q1 2026  |
| Railway             | Removed    | DigitalOcean                    | Complete |

---

## 10. Quick Reference

### Essential Commands

```bash
# Verification
pnpm check              # TypeScript
pnpm lint               # ESLint
pnpm test               # Unit tests
pnpm build              # Build

# Roadmap
pnpm roadmap:validate   # Validate format
pnpm roadmap:capacity   # Check capacity
pnpm roadmap:next-batch # Get next tasks
pnpm validate:sessions  # Check sessions

# Deployment
./scripts/watch-deploy.sh
./scripts/terp-logs.sh run 100

# Git
git pull --rebase origin main
git push origin staging
```

### Essential Files

| File                                            | Purpose                          |
| ----------------------------------------------- | -------------------------------- |
| `docs/roadmaps/MASTER_ROADMAP.md`               | Single source of truth for tasks |
| `docs/ACTIVE_SESSIONS.md`                       | Currently active agent work      |
| `docs/protocols/CANONICAL_DICTIONARY.md`        | Term definitions                 |
| `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md` | How to run prod migrations       |
| `.kiro/steering/07-deprecated-systems.md`       | What NOT to use                  |

### Valid Values Quick Reference

```
Status:   ready | in-progress | complete | blocked
Priority: HIGH | MEDIUM | LOW
Estimate: 4h | 8h | 16h | 1d | 2d | 1w
```

---

## 11.### Deployment Workflow: Staging-First

**The new workflow is:** `PR` → `main` → `staging` (auto-deploy) → verify → `production` (manual promote)

1.  **Merge to `main`**: All feature branches are merged into `main` via Pull Requests.
2.  **Auto-deploy to Staging**: A GitHub Action (`.github/workflows/sync-staging.yml`) automatically merges `main` into the `staging` branch and pushes. This push triggers a deployment to the staging environment.
3.  **Verify on Staging**: All changes **must** be verified on the live staging URL: `https://terp-staging-yicld.ondigitalocean.app`.
4.  **Promote to Production**: After verification, the production deployment is a manual step handled by the project owner (Evan). Agents do not deploy to production.

Your workflow as an agent ends after you have verified your changes on the staging environment.

### Production Migrations (One-Off Scripts)

For running migration scripts, backfills, or data fixes against the DigitalOcean Managed Database, use **temporary App Platform job components** — NOT direct database connections.

**Full runbook**: `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md`

Key rules:

- **Never connect directly** from external environments (rotating IPs make firewall rules unreliable)
- **Use temporary job components** that run inside the VPC with `${db.DATABASE_URL}` binding
- **Run one script per job** (chained `&&` commands are unreliable in `run_command`)
- **Clean up jobs immediately** after success (otherwise they re-run on every push due to `deploy_on_push: true`)
- **Auto-rollback**: If a job exits non-zero, DigitalOcean rolls back the entire deployment including the web service
- **Deployment cycle**: ~8-12 minutes total (build 4-5min, deploy 3-5min, job 1-2min)

### Rollback Procedure

If deployment fails:

```bash
# 1. Identify last good commit
git log --oneline -10

# 2. Revert
git revert <bad-commit-hash>

# 3. Push immediately
git push origin staging

# 4. Monitor rollback
./scripts/watch-deploy.sh

# 5. Document incident
# Create docs/incidents/YYYY-MM-DD-description.md
```

---

## 12. Troubleshooting

### Common Issues

| Issue                        | Solution                              |
| ---------------------------- | ------------------------------------- |
| TypeScript errors after pull | Run `pnpm install` then `pnpm check`  |
| Tests failing                | Check if DB migrations needed         |
| Build fails                  | Clear `.next` folder, rebuild         |
| Roadmap validation fails     | Check format matches spec exactly     |
| Push rejected                | `git pull --rebase origin main` first |
| Deployment stuck             | Check `doctl apps logs`               |

### When Stuck

1. Read the error message carefully
2. Check relevant protocol docs
3. Search codebase for similar patterns
4. Ask Evan with specific context

---

## Appendix: Agent-Specific Notes

### Claude Code

- This file auto-loads from repo root as `CLAUDE.md`
- No additional setup needed
- Use bash tools for verification

### Claude.ai Projects

- Paste this document into Project Instructions
- May need to trim for character limits
- Use "Custom Instructions" for user preferences

### Other Agents (Cursor, ChatGPT, etc.)

- Read this file at session start
- Reference `.kiro/steering/` for detailed protocols
- Follow same verification and roadmap patterns

### Keeping Protocols in Sync

This `CLAUDE.md` consolidates from:

- `.kiro/steering/00-core-identity.md`
- `.kiro/steering/01-development-standards.md`
- `.kiro/steering/02-workflows.md`
- `.kiro/steering/03-agent-coordination.md`
- `.kiro/steering/06-architecture-guide.md`
- `.kiro/steering/07-deprecated-systems.md`
- `.kiro/steering/08-adaptive-qa-protocol.md`
- `.kiro/steering/terp-master-protocol.md`
- `docs/protocols/INITIATIVE_TO_ROADMAP_WORKFLOW.md`
- `docs/protocols/CANONICAL_DICTIONARY.md`

When updating protocols, update both this file AND the source files to maintain consistency.

---

**Remember**: Verification over persuasion. Prove it works, don't convince yourself it works.

---

## 13. Audit System

TERP has a systematic audit system to catch recurring bugs before they reach production.

### Running Audits

From Claude Code, use these slash commands:

```bash
# Full system audit (run all checks)
/project:audit/full

# Individual audits
/project:audit/schema       # Forbidden patterns, enum alignment
/project:audit/inventory    # Known $0 bugs, filter issues
/project:audit/golden-flows # Critical business path verification
```

### Audit Files

| File                            | Purpose                                           |
| ------------------------------- | ------------------------------------------------- |
| `.claude/known-bug-patterns.md` | Catalog of recurring bugs with detection commands |
| `.claude/audit-history.json`    | Tracks issues found across sessions               |
| `.claude/commands/audit/*.md`   | Audit command implementations                     |

### Known Bug Patterns

Before investigating any bug, CHECK `.claude/known-bug-patterns.md` first. It contains:

1. **Inventory $0 Display** - Status filter enum mismatch
2. **"No Inventory Found"** - localStorage filter persistence
3. **mysqlEnum Naming** - First arg must match DB column name
4. **Unresponsive Buttons** - CSS/z-index issues
5. **Actor From Input** - Security: never trust client-provided actor
6. **Vendors Table** - Deprecated, use clients with isSeller=true

### When to Run Audits

- **Before any release** - Run `/project:audit/full`
- **After major refactors** - Run relevant individual audit
- **When bugs recur** - Something is escaping detection
- **Weekly during active dev** - Catch drift early

### Recording Findings

All audits should append to `.claude/audit-history.log`:

```bash
echo "[$(date -Iseconds)] [AUDIT_TYPE] [SUMMARY]" >> .claude/audit-history.log
```

For recurring patterns, update `.claude/known-bug-patterns.md`.
