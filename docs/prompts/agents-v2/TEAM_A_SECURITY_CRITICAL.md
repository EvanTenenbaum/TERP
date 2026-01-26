# Agent Team A: Security Critical

You are Agent Team A working on the TERP project. You MUST follow all protocols exactly as specified.

**Mode:** RED (highest scrutiny)
**Branch:** `claude/team-a-security-critical-{SESSION_ID}`
**Estimate:** 32-40 hours
**Dependencies:** None - START IMMEDIATELY

---

## YOUR TASKS

| Task      | Description                            | Estimate | Module                                 |
| --------- | -------------------------------------- | -------- | -------------------------------------- |
| SEC-027   | Protect Admin Setup Endpoints          | 1h       | `server/routers/adminSetup.ts`         |
| SEC-028   | Remove/Restrict Debug Endpoints        | 1h       | `server/routers/debug.ts`              |
| SEC-029   | Fix Default Permission Grants          | 2h       | `server/services/permissionService.ts` |
| SEC-030   | Fix VIP Portal Token Validation        | 2h       | `server/routers/vipPortal.ts`          |
| ST-050    | Fix Silent Error Handling              | 4h       | `server/ordersDb.ts`                   |
| ST-051    | Add Transaction Boundaries             | 8h       | `server/ordersDb.ts`, `orders.ts`      |
| ARCH-001  | Create OrderOrchestrator Service       | 8h       | `server/services/` (new)               |
| FIN-001   | Fix Invoice Number Race Condition      | 2h       | `server/arApDb.ts`                     |
| INV-003   | Add FOR UPDATE Lock                    | 2h       | `server/routers/orders.ts`             |
| ORD-001   | Fix Invoice Creation Timing            | 4h       | `server/ordersDb.ts`                   |
| ST-053    | Eliminate `any` Types (critical paths) | 8h       | Multiple                               |
| TERP-0014 | Token invalidation + rate limiting     | 6-12h    | `server/_core/simpleAuth.ts`           |

---

## MANDATORY PROTOCOLS

### PHASE 1: Pre-Flight (15 minutes)

```bash
# 1. Clone and Setup
gh repo clone EvanTenenbaum/TERP && cd TERP && pnpm install

# 2. Read ALL Protocol Documents (DO NOT SKIP)
cat CLAUDE.md
cat docs/TERP_AGENT_INSTRUCTIONS.md
cat .kiro/steering/08-adaptive-qa-protocol.md
cat docs/roadmaps/MASTER_ROADMAP.md

# 3. Generate Session ID
SESSION_ID="Session-$(date +%Y%m%d)-TEAM-A-SECURITY-$(openssl rand -hex 4)"
echo "Session ID: $SESSION_ID"

# 4. Pull Latest
git pull --rebase origin main
```

### PHASE 2: Session Registration (10 minutes)

```bash
# 1. Create Session File
cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
# Team A: Security Critical

**Session ID:** ${SESSION_ID}
**Agent:** Team A
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress
**Mode:** RED

## Tasks
- [ ] SEC-027: Protect Admin Setup Endpoints
- [ ] SEC-028: Remove/Restrict Debug Endpoints
- [ ] SEC-029: Fix Default Permission Grants
- [ ] SEC-030: Fix VIP Portal Token Validation
- [ ] ST-050: Fix Silent Error Handling
- [ ] ST-051: Add Transaction Boundaries
- [ ] ARCH-001: Create OrderOrchestrator Service
- [ ] FIN-001: Fix Invoice Number Race Condition
- [ ] INV-003: Add FOR UPDATE Lock
- [ ] ORD-001: Fix Invoice Creation Timing
- [ ] ST-053: Eliminate `any` Types (critical paths)
- [ ] TERP-0014: Token invalidation + rate limiting

## Progress Notes
Starting security hardening work...
EOF

# 2. Register in ACTIVE_SESSIONS.md
echo "- Team-A: ${SESSION_ID} - Security Critical" >> docs/ACTIVE_SESSIONS.md

# 3. Update Roadmap tasks to in-progress
# Edit docs/roadmaps/MASTER_ROADMAP.md for each task

# 4. Create Feature Branch
git checkout -b "claude/team-a-security-critical-${SESSION_ID}"

# 5. Commit and Push Registration
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md docs/roadmaps/MASTER_ROADMAP.md
git commit -m "chore: register Team A Security Critical session"
git push -u origin "claude/team-a-security-critical-${SESSION_ID}"
```

### PHASE 3: Implementation

#### Execution Order (CRITICAL - follow exactly)

```
1. SEC-027 + SEC-028 (parallel, 2h)
   - Remove immediate attack surface
   - Convert publicProcedure → protectedProcedure

2. SEC-029 + SEC-030 (parallel, 2h)
   - Fix auth vulnerabilities

3. ST-050 (4h)
   - Fix silent errors BEFORE adding transactions
   - Convert all catch-and-continue to rethrow

4. ST-051 (8h)
   - Add transaction boundaries
   - Ensure atomicity for multi-step operations

5. ARCH-001 (8h) ⭐ CRITICAL PATH
   - Create OrderOrchestrator service
   - Use transaction patterns from ST-051
   - SIGNAL TEAM B WHEN COMPLETE

6. FIN-001 + INV-003 + ORD-001 (parallel, 4h)
   - Race condition fixes
   - Use SELECT ... FOR UPDATE

7. ST-053 (8h)
   - Type safety in critical paths only
   - Focus: orders, inventory, accounting

8. TERP-0014 (6-12h)
   - Token blacklist implementation
   - Rate limiting for auth endpoints
```

#### For Each Task:

1. **Understand Requirements** - Read task in MASTER_ROADMAP.md
2. **Write Adversarial Tests FIRST** (RED mode requirement)
3. **Implement Fix** - No `any` types, proper error handling
4. **Test Thoroughly** - Include attack vector tests
5. **Commit with Evidence**

```bash
git add [files]
git commit -m "[TASK-ID]: [Description]

Verified:
- pnpm check: PASS
- pnpm test: PASS
- Adversarial test: [test name] passes"
git push
```

### PHASE 4: Testing & Validation (RED MODE)

```bash
# 1. TypeScript Compilation
pnpm check  # MUST be ZERO errors

# 2. All Tests
pnpm test  # ALL tests MUST pass

# 3. Lint
pnpm lint

# 4. Build
pnpm build

# 5. Security-Specific Tests
# Run adversarial tests for each security fix
pnpm test server/routers/adminSetup.test.ts
pnpm test server/routers/debug.test.ts
pnpm test server/routers/vipPortal.test.ts
pnpm test server/_core/simpleAuth.test.ts
```

### RED MODE Requirements Checklist

- [ ] Regression tests for each security fix
- [ ] Adversarial tests documenting attack vectors
- [ ] Risk register with rollback plan
- [ ] E2E verification for auth flows
- [ ] RedHat QA self-review completed

### PHASE 5: ARCH-001 Completion Signal

**CRITICAL:** When ARCH-001 is complete, signal Team B:

```bash
echo "ARCH-001 COMPLETE - Team B unlocked at $(date)" >> docs/sessions/active/coordinator.md
git add docs/sessions/active/coordinator.md
git commit -m "signal: ARCH-001 complete, Team B unlocked"
git push
```

### PHASE 6: Completion

```bash
# 1. Update Roadmap to Complete
# For EACH task in docs/roadmaps/MASTER_ROADMAP.md:
# - Change Status to: complete
# - Add Completed: [date]
# - Add Key Commits: [hashes]

# 2. Archive Session
mv "docs/sessions/active/${SESSION_ID}.md" docs/sessions/completed/

# 3. Remove from ACTIVE_SESSIONS.md

# 4. Final Commit
git add docs/roadmaps/MASTER_ROADMAP.md docs/sessions/ docs/ACTIVE_SESSIONS.md
git commit -m "complete: Team A Security Critical

Tasks completed:
- SEC-027, SEC-028, SEC-029, SEC-030
- ST-050, ST-051, ARCH-001
- FIN-001, INV-003, ORD-001
- ST-053, TERP-0014

All tests passing, deployment verified."
git push
```

---

## Required Output Format

```markdown
## Team A Verification Results

✅ **Verified:**

- pnpm check: PASS (0 errors)
- pnpm lint: PASS
- pnpm test: PASS (X/Y tests)
- pnpm build: PASS

🧪 **Tests Added:**

- server/routers/adminSetup.test.ts: adversarial tests for SEC-027
- server/routers/debug.test.ts: removed/protected in SEC-028
- server/services/orderOrchestrator.test.ts: ARCH-001 tests

⚠️ **Risk Notes:**

- Token blacklist needs Redis/DB storage for scale
- Rate limiting may need tuning for production load

🔁 **Rollback Plan:**

- Revert commits: [list hashes]
- If auth breaks: restore simpleAuth.ts from [commit]

🟥 **RedHat QA Self-Review:**

- Attack vectors tested: admin endpoint abuse, debug info leak, race conditions
- Silent failures: All converted to throw
- Rollback path: All changes revertible via git
```

---

## Protocol Violations (Work Rejected If)

- Skipping protocol document reading
- Not registering session before work
- Not updating roadmap to in-progress
- Using `any` types in new code
- Skipping adversarial tests (RED mode)
- Marking complete without verification
- Not signaling Team B when ARCH-001 complete
