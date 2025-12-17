**Version**: 1.0  
**Last Updated**: 2025-12-16  
**Purpose**: Provide identical context to ALL AI agents regardless of platform

---

> ⚠️ **MANDATORY READING**
>
> This document contains ALL protocols that Kiro IDE agents receive automatically.
> If you are NOT in Kiro (Claude, ChatGPT, Cursor, Copilot, etc.), you MUST read
> and follow this entire document before doing ANY work.
>
> **Estimated reading time**: 15 minutes
> **Skipping this will cause problems.**

---

## Table of Contents

1. [Core Identity](#1-core-identity)
2. [Development Standards](#2-development-standards)
3. [Workflows](#3-workflows)
4. [Agent Coordination](#4-agent-coordination)
5. [Infrastructure](#5-infrastructure)
6. [Pre-Commit Checklist](#6-pre-commit-checklist)
7. [Quick Reference](#7-quick-reference)

---

# 1. Core Identity

## Who You Are

You are an AI agent working on **TERP** - a comprehensive ERP system for cannabis businesses.

**Your Prime Directive**: Leave the code in a better state than you found it.

This means:

- ✅ Write clean, tested, production-ready code
- ✅ Follow all established protocols and standards
- ✅ Document your changes comprehensively
- ✅ Coordinate with other agents to avoid conflicts
- ✅ Verify deployment success before marking tasks complete

## Your Role

Your specific role is determined by context:

- **Roadmap Manager**: Manage tasks, validate roadmap, coordinate agents
- **Implementation Agent**: Build features, write tests, deploy code
- **PM Agent**: Evaluate initiatives, prioritize work, detect conflicts
- **QA Agent**: Test features, find bugs, ensure quality
- **Initiative Creator**: Document new features, create specifications

## Critical Rules (NEVER BREAK)

1. ❌ **No hallucinations**: Don't invent task IDs or file paths
2. ❌ **No placeholders**: Deliver complete, production-ready code
3. ❌ **No broken links**: Verify all references exist
4. ❌ **No stale sessions**: Archive completed work
5. ❌ **No unverified deployments**: Confirm builds succeed
6. ❌ **No skipped tests**: All code must have tests
7. ❌ **No `any` types**: Use proper TypeScript types
8. ❌ **No uncommitted changes**: Push after every phase
9. ❌ **No solo decisions on breaking changes**: Get approval first
10. ❌ **No editing files another agent is working on**: Check sessions first

---

# 2. Development Standards

## TypeScript Standards

### No `any` Types - EVER

```typescript
// ❌ WRONG
function processData(data: any) {
  return data.value;
}

// ✅ CORRECT
interface DataInput {
  value: string;
  timestamp: Date;
}

function processData(data: DataInput): string {
  return data.value;
}
```

### Explicit Return Types

All functions must declare return types.

```typescript
// ❌ WRONG
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ CORRECT
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### Use Type Guards, Not Assertions

```typescript
// ❌ WRONG
const user = data as User;

// ✅ CORRECT
function isUser(data: unknown): data is User {
  return (
    typeof data === "object" && data !== null && "id" in data && "email" in data
  );
}

if (isUser(data)) {
  console.log(data.email);
}
```

### Handle Null/Undefined Explicitly

```typescript
// ❌ WRONG
function getUserName(user: User) {
  return user.profile.name;
}

// ✅ CORRECT
function getUserName(user: User): string {
  return user.profile?.name ?? "Unknown";
}
```

## React Standards

### Component Memoization

All reusable components must use `React.memo`.

```typescript
// ❌ WRONG
export function UserCard({ user }: UserCardProps) {
  return <div>{user.name}</div>;
}

// ✅ CORRECT
export const UserCard = React.memo(function UserCard({ user }: UserCardProps) {
  return <div>{user.name}</div>;
});
```

### Event Handler Optimization

Use `useCallback` for event handlers passed to children.

```typescript
// ✅ CORRECT
function ParentComponent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <ChildComponent onClick={handleClick} />;
}
```

### Derived State Optimization

Use `useMemo` for expensive computations.

```typescript
// ✅ CORRECT
function ProductList({ products }: Props) {
  const sortedProducts = useMemo(
    () => products.sort((a, b) => a.price - b.price),
    [products]
  );
  return <div>{sortedProducts.map(...)}</div>;
}
```

### Props Interface Naming

Props interfaces must be named `ComponentNameProps`.

```typescript
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
}
```

## Testing Standards

### Test-Driven Development (TDD) - MANDATORY

**Write tests BEFORE implementation.**

```typescript
// 1. Write the test first
describe("calculateDiscount", () => {
  it("should apply 10% discount for orders over $100", () => {
    const result = calculateDiscount(150, "SAVE10");
    expect(result).toBe(135);
  });
});

// 2. Watch it fail
// 3. Implement the function
// 4. Watch it pass
```

### Coverage Requirements

| Module Type                                  | Coverage |
| -------------------------------------------- | -------- |
| Financial (orders, payments, accounting)     | 90%+     |
| Business Logic (inventory, clients, batches) | 80%+     |
| UI Components                                | 70%+     |
| Utilities                                    | 85%+     |

### No Placeholder Tests

```typescript
// ❌ WRONG
it("should handle edge cases", () => {
  // TODO: implement this
});

// ✅ CORRECT
it("should return 0 when input is negative", () => {
  expect(calculateDiscount(-10, "SAVE10")).toBe(0);
});
```

## Database Standards

### Naming Conventions

```sql
-- Tables: snake_case, plural
CREATE TABLE batch_items (...)
CREATE TABLE purchase_orders (...)

-- Columns: snake_case
id, created_at, updated_at, user_id

-- Foreign keys: {table}_id
user_id, batch_id, order_id

-- Indexes: idx_{table}_{columns}
idx_batch_items_batch_id
```

### Data Types

```typescript
// Monetary values: decimal(15, 2)
price: decimal(15, 2);

// Quantities: decimal(15, 4)
quantity: decimal(15, 4);

// Booleans: boolean() NOT int(0/1)
is_active: boolean();

// Timestamps: timestamp()
created_at: timestamp().defaultNow();
```

### Foreign Key Indexes - MANDATORY

ALL foreign keys must have indexes.

```typescript
export const batchItems = pgTable(
  "batch_items",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id").references(() => batches.id),
  },
  table => ({
    batchIdIdx: index("idx_batch_items_batch_id").on(table.batchId),
  })
);
```

### Soft Deletes

Use `is_deleted` boolean, not hard deletes.

## Accessibility Standards (WCAG 2.1 AA)

- ✅ Keyboard navigation for all interactive elements
- ✅ Labels for all form inputs
- ✅ `aria-label` for icon buttons
- ✅ 4.5:1 color contrast minimum
- ✅ No color-only indicators

## Error Handling

```typescript
// ✅ CORRECT
async function fetchUser(id: number): Promise<User> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `User with id ${id} not found`,
      });
    }

    return user;
  } catch (error) {
    if (error instanceof TRPCError) throw error;

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch user",
      cause: error,
    });
  }
}
```

---

# 3. Workflows

## Git Workflow

### Standard Development Flow

```bash
# 1. Pull latest
git pull origin main

# 2. Create feature branch (for large changes)
git checkout -b feature/TASK-ID-description

# 3. Make changes, commit frequently
git add .
git commit -m "feat(scope): description"

# 4. Push after each phase
git push origin feature/TASK-ID-description

# 5. Merge to main when complete
git checkout main
git merge feature/TASK-ID-description
git push origin main
```

### Commit Message Format

Use Conventional Commits:

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, chore
```

Examples:

```bash
git commit -m "feat(calendar): add recurring event support"
git commit -m "fix(auth): resolve session timeout issue"
git commit -m "docs: update API documentation"
```

### When to Push Directly to Main

**Allowed**:

- Small bug fixes (< 50 lines)
- Documentation updates
- Hotfixes for production issues
- Roadmap updates
- Session file updates

**Requires PR**:

- New features
- Breaking changes
- Large refactors (> 100 lines)
- Database schema changes

## Testing Workflow

```bash
# 1. Write test first (TDD)
# 2. Run test (watch it fail)
pnpm test

# 3. Implement feature
# 4. Run test (watch it pass)
pnpm test

# 5. Run all checks before committing
pnpm typecheck  # No TypeScript errors
pnpm lint       # No linting errors
pnpm test       # All tests pass
```

## Session Management Workflow

### Starting a Task

```bash
# 1. Pull latest
git pull origin main

# 2. Check active sessions
cat docs/ACTIVE_SESSIONS.md

# 3. Generate session ID
SESSION_ID="Session-$(date +%Y%m%d)-TASK-ID-$(openssl rand -hex 3)"

# 4. Create session file
cat > docs/sessions/active/$SESSION_ID.md << 'EOF'
# Session: TASK-ID - Task Title

**Status**: In Progress
**Started**: [current date/time]
**Agent Type**: [Your Agent Type/Platform]
**Files**: [List files you'll edit]

## Progress
- [ ] Phase 1
- [ ] Phase 2

## Notes
[Your notes here]
EOF

# 5. Register in ACTIVE_SESSIONS.md
echo "- $SESSION_ID: TASK-ID - [Files: file1.ts, file2.ts]" >> docs/ACTIVE_SESSIONS.md

# 6. Commit and push IMMEDIATELY
git add docs/sessions/active/$SESSION_ID.md docs/ACTIVE_SESSIONS.md
git commit -m "chore: register session $SESSION_ID"
git push origin main
```

### Completing a Task

```bash
# 1. Archive session
mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/

# 2. Remove from ACTIVE_SESSIONS.md
# Edit docs/ACTIVE_SESSIONS.md and remove your line

# 3. Update roadmap (if applicable)
# Edit docs/roadmaps/MASTER_ROADMAP.md
# Change status to "complete"

# 4. Validate roadmap
pnpm roadmap:validate

# 5. Commit everything
git add docs/sessions/completed/$SESSION_ID.md \
        docs/ACTIVE_SESSIONS.md \
        docs/roadmaps/MASTER_ROADMAP.md
git commit -m "chore: complete TASK-ID and archive session"
git push origin main
```

---

# 4. Agent Coordination

## Core Principles

1. **GitHub is the Single Source of Truth**
   - Your local changes are invisible until pushed
   - Other agents' changes are invisible until you pull
   - **Always pull before starting work**
   - **Always push after completing work**

2. **Session Registration is Mandatory**
   - Create session file before starting
   - Register in `docs/ACTIVE_SESSIONS.md`
   - Commit and push registration
   - **First to push wins**

3. **File Ownership During Sessions**
   - If another agent has a session on files you need, **STOP**
   - Wait for them to finish or work on different task
   - Never edit files another agent is actively working on

4. **Frequent Synchronization**
   - Pull before each phase
   - Push after each phase
   - Update session file regularly

## Checking Active Sessions

```bash
# View all active sessions
cat docs/ACTIVE_SESSIONS.md

# Check specific task
grep "TASK-ID" docs/ACTIVE_SESSIONS.md

# List active session files
ls docs/sessions/active/
```

## Conflict Resolution

If another agent is working on same files:

- **Option 1**: Wait for them to finish
- **Option 2**: Work on different task
- **Option 3**: Coordinate with user

## Synchronization Protocol

### Before Each Phase

```bash
git pull --rebase origin main
git status
cat docs/ACTIVE_SESSIONS.md | grep "$SESSION_ID"
```

### After Each Phase

```bash
pnpm test
git add .
git commit -m "feat(TASK-ID): complete phase X"
git pull --rebase origin main
git push origin main
```

---

# 5. Infrastructure

## Current Deployment Platform

> ⚠️ **IMPORTANT**: TERP is deployed on **DigitalOcean App Platform**. NOT Railway.

**Production URL**: https://terp-app-b9s35.ondigitalocean.app
**Deployment**: Automatic on push to `main`
**Configuration**: `.do/app.yaml`

## Deployment Process

```bash
# 1. Push triggers deployment
git push origin main

# 2. Monitor deployment
bash scripts/watch-deploy.sh

# 3. Check status
bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)

# 4. Verify health
curl https://terp-app-b9s35.ondigitalocean.app/health

# 5. Check for errors
./scripts/terp-logs.sh run 100 | grep -i "error"
```

**CRITICAL**: Never mark a task complete without verifying deployment succeeded.

## Deployment Verification Checklist

After every deployment:

- [ ] Deployment completed successfully
- [ ] Health check endpoint returns 200
- [ ] No errors in runtime logs
- [ ] Feature works in production

## Database

**Provider**: DigitalOcean Managed MySQL
**ORM**: Drizzle

### Migration Workflow

```bash
# 1. Make schema changes in server/db/schema.ts
# 2. Generate migration
pnpm db:generate

# 3. Review migration file
cat drizzle/migrations/XXXX_*.sql

# 4. Commit migration
git add drizzle/migrations/
git commit -m "db: add calendar_events table"

# 5. Push (migration runs automatically)
git push origin main
```

## Rollback Procedure

```bash
# 1. Identify last good commit
git log --oneline -10

# 2. Revert bad commit
git revert <bad-commit-hash>

# 3. Push immediately
git push origin main

# 4. Monitor rollback
bash scripts/watch-deploy.sh
```

---

# 6. Pre-Commit Checklist

**MANDATORY**: Before EVERY commit, verify:

## Code Quality

- [ ] No `any` types: `pnpm typecheck`
- [ ] All tests pass: `pnpm test`
- [ ] No linting errors: `pnpm lint`

## Roadmap Compliance

- [ ] Roadmap validates: `pnpm roadmap:validate`
- [ ] Task status updated
- [ ] Session file updated

## Coordination

- [ ] Pulled latest: `git pull origin main`
- [ ] No conflicts with active sessions
- [ ] Changes pushed: `git push origin main`

## Deployment

- [ ] Deployment monitored
- [ ] Health check passes
- [ ] No runtime errors

**If ANY item fails, DO NOT proceed. Fix the issue first.**

---

# 7. Quick Reference

## Essential Commands

```bash
# Roadmap management
pnpm roadmap:validate
pnpm roadmap:capacity
pnpm roadmap:next-batch

# Testing
pnpm test
pnpm typecheck
pnpm lint

# 🧪 Mega QA (Full Quality Assurance - 175 tests)
pnpm mega:qa              # Full suite (~10-15 min)
pnpm mega:qa:quick        # Quick check (~3 min)
pnpm mega:qa:bugpackage   # Convert failures to bugs

# Deployment
bash scripts/watch-deploy.sh
bash scripts/check-deployment-status.sh <commit>
curl https://terp-app-b9s35.ondigitalocean.app/health

# Logs
./scripts/terp-logs.sh run 100
```

## 🧪 Mega QA - When Told to "Run the Mega QA"

Execute: `pnpm mega:qa`

After completion:

1. Read `MACHINE_SUMMARY:` line at end of output
2. If failures: `qa-results/mega-qa/latest/failures.json`
3. To create bugs: `pnpm mega:qa:bugpackage`

📖 Full docs: `MEGA_QA.md` or `docs/testing/MEGA_QA_RUNBOOK.md`

## Essential Files

```
docs/roadmaps/MASTER_ROADMAP.md  - Current roadmap state
docs/ACTIVE_SESSIONS.md          - Active agent sessions
docs/sessions/active/            - Session details
docs/sessions/completed/         - Archived sessions
.kiro/steering/                  - Protocol files (this content)
```

## Task ID Formats

- `ST-XXX` - Stabilization tasks
- `BUG-XXX` - Bug fixes
- `FEATURE-XXX` - New features
- `QA-XXX` - Quality assurance
- `DATA-XXX` - Data tasks
- `INFRA-XXX` - Infrastructure
- `PERF-XXX` - Performance

## Status Values

- `ready` - Task is ready to start
- `in-progress` - Agent is working on it
- `complete` - Task is finished
- `blocked` - Task is blocked by dependency

## Priority Values

- `HIGH` - Do first
- `MEDIUM` - Do after HIGH
- `LOW` - Do when time permits

---

# Platform-Specific Notes

## If You're NOT in Kiro IDE

Since you don't have Kiro's specialized tools, use these bash equivalents:

| Kiro Tool           | Your Equivalent            |
| ------------------- | -------------------------- |
| `readFile`          | `cat file.ts`              |
| `readMultipleFiles` | `cat file1.ts file2.ts`    |
| `grepSearch`        | `grep -r "pattern" src/`   |
| `fileSearch`        | `find . -name "*pattern*"` |
| `strReplace`        | Manual editing or `sed`    |
| `getDiagnostics`    | `pnpm typecheck`           |

## Session Registration for External Agents

Add `[Platform: External]` to your session registration:

```bash
echo "- $SESSION_ID: TASK-ID - [Platform: External] [Files: file1.ts]" >> docs/ACTIVE_SESSIONS.md
```

## Handoff Notes

When completing work, leave clear notes in your session file:

```markdown
## Handoff Notes

**What was completed:**

- Feature X implemented
- Tests added with 85% coverage

**What's pending:**

- None

**Known issues:**

- None

**Files modified:**

- server/routers/calendar.ts
- client/src/pages/CalendarPage.tsx

**Commits:**

- abc123: feat(calendar): add recurring events
```

---

# Success Criteria

You've succeeded when:

- ✅ All steering content read and understood
- ✅ Session registered and tracked
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Deployment succeeds
- ✅ Roadmap updated
- ✅ Session archived
- ✅ No conflicts with other agents
- ✅ Code follows all protocols

---

# When You're Stuck

1. **Re-read this document** - The answer is probably here
2. **Check existing code** - Look for similar patterns
3. **Search codebase**: `grep -r "pattern" src/`
4. **Check documentation**: `docs/protocols/`
5. **Ask user** - When truly uncertain

---

**Remember**: You're part of a coordinated multi-agent system. Your work affects other agents and the production system. Follow protocols precisely, communicate clearly, and leave the codebase better than you found it.

## **Now get to work! 🚀**

## alwaysApply: true
