# 🚀 REL Sprint Agent Prompt

> **Copy this entire prompt to a new Claude Code or agent session to immediately start work on the Reliability Sprint.**

---

## Your Mission

You are executing the **REL Sprint** - a coordinated effort to fix 250+ systemic reliability issues in TERP discovered through deep codebase analysis. This sprint uses parallel subagent execution across 3 work streams.

---

## Immediate Setup (Do This First)

```bash
# 1. Pull latest and read the protocol
git pull origin main
cat CLAUDE.md | head -500

# 2. Read the execution plan
cat docs/roadmaps/REL-sprint-execution-plan.md

# 3. Check for active sessions (avoid conflicts)
cat docs/ACTIVE_SESSIONS.md

# 4. Read the deep analysis for context
cat .audit/deep-systemic-analysis-2026-01-31.md
```

---

## Which Stream Are You?

**Answer this question: Which agent number are you?**

### If Agent 1 (Backend/Financial - Stream A):
Your tasks in order:
1. **REL-001**: Standardize null money handling (4h)
2. **REL-003**: Add transaction rollback to payments (4h)
3. **REL-004**: Add Decimal.js for financial precision (8h)
4. **REL-006**: Wrap order confirmation in transaction (4h)
5. **REL-009**: Add relation loading to orders queries (4h)
6. **REL-010**: Standardize raw SQL usage (8h)
7. **REL-011**: Add soft delete to critical tables (8h)

**Start command:**
```bash
# Create your session
SESSION_ID="Session-$(date +%Y%m%d)-REL-001-$(openssl rand -hex 3)"
mkdir -p docs/sessions/active
cat > docs/sessions/active/$SESSION_ID.md << 'EOF'
# Session: REL-001 - Standardize Null Money Handling

**Status**: In Progress
**Started**: $(date)
**Agent**: Claude Code Agent 1
**Mode**: STRICT
**Stream**: A - Backend/Financial

## Tasks
- [ ] REL-001: Null money handling
- [ ] REL-003: Transaction rollback
- [ ] REL-004: Decimal.js precision

## Progress
Starting REL-001...
EOF

echo "- $SESSION_ID: REL-001-004 - Stream A Backend" >> docs/ACTIVE_SESSIONS.md
git add docs/sessions/active/$SESSION_ID.md docs/ACTIVE_SESSIONS.md
git commit -m "chore: register Stream A session $SESSION_ID"
git push origin main
```

### If Agent 2 (Frontend Safety - Stream B):
Your tasks in order:
1. **REL-002**: Fix unsafe toFixed calls (4h)
2. **REL-014**: Add localStorage error handling (4h)
3. **REL-015**: Add query enabled checks (4h)
4. **REL-016**: Fix map on undefined arrays (4h)
5. **REL-008**: Add range validation to Zod schemas (4h)

**Start command:** Same pattern, use `REL-002-016 - Stream B Frontend`

### If Agent 3 (Schema/Database - Stream C):
Your tasks in order:
1. **REL-005**: Add optimistic locking (8h) - WAIT for REL-001 complete
2. **REL-007**: Add notNull to money fields (8h)
3. **REL-012**: Standardize decimal precision (16h)
4. **REL-013**: Complete vendor deprecation (40h)

**Start command:** Same pattern, use `REL-005-013 - Stream C Schema`

---

## Task Execution Template

For EACH task, follow this exact pattern:

### 1. Load Task Details
```bash
# Find the task in MASTER_ROADMAP
grep -A 30 "REL-00X:" docs/roadmaps/MASTER_ROADMAP.md
```

### 2. Check Dependencies
```bash
# Verify dependencies are complete
grep "REL-00Y" docs/roadmaps/MASTER_ROADMAP.md | grep -i status
```

### 3. Implement Following Deliverables
- Read each deliverable checkbox
- Implement in order
- Commit after each deliverable

### 4. Verify
```bash
pnpm check
pnpm lint
pnpm test
pnpm build
```

### 5. Update Roadmap
```bash
# Mark task complete in MASTER_ROADMAP.md
# Add: **Completed:** 2026-01-XX
# Add: **Key Commits:** abc1234
# Change: **Status:** ready → **Status:** complete
```

### 6. Push and Verify Deployment
```bash
git push origin main
./scripts/watch-deploy.sh
curl https://terp-app-b9s35.ondigitalocean.app/health
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Agent protocol - READ FIRST |
| `docs/roadmaps/MASTER_ROADMAP.md` | Task definitions |
| `docs/roadmaps/REL-sprint-execution-plan.md` | Parallel execution plan |
| `.audit/deep-systemic-analysis-2026-01-31.md` | Root cause analysis |
| `.audit/audit-history.json` | Tracked patterns |

---

## Critical Rules

1. **Never work on a file another agent is editing** - Check ACTIVE_SESSIONS.md
2. **RED mode for schema changes** - REL-005, REL-007, REL-011, REL-012 require explicit approval
3. **Pull before each task** - `git pull --rebase origin main`
4. **Verify before marking complete** - All 8 Definition of Done criteria must pass
5. **Coordinate at checkpoints** - After P0 (Day 3), P1 (Day 7), Sprint Complete (Day 12)

---

## P0 Tasks (CRITICAL - Do First)

These 4 tasks fix the most critical bugs:

| Task | Problem | Fix |
|------|---------|-----|
| REL-001 | $0 display bug | Standardize parseFloat null handling |
| REL-002 | UI crashes | Safe toFixed wrapper |
| REL-003 | Data corruption | Transaction rollback |
| REL-004 | Penny errors | Decimal.js precision |

**All P0 tasks have no dependencies - Agents 1 and 2 can start immediately in parallel.**

---

## Communication Protocol

If you encounter:
- **Blocked by another task**: Update roadmap status to `blocked`, note the blocker
- **Found new bug**: Add to `.audit/audit-history.json`, create new task if needed
- **Need schema migration**: Alert other agents, coordinate timing
- **Tests failing**: Fix before proceeding, don't skip

---

## Success Criteria

Sprint is complete when:
- [ ] All 16 REL tasks status = `complete`
- [ ] `pnpm check && pnpm lint && pnpm test && pnpm build` all pass
- [ ] `pnpm test:schema` passes
- [ ] No "NaN" or unexpected "$0.00" in UI
- [ ] Concurrent edit conflict is detected (REL-005 test)
- [ ] Vendor references reduced by 80%+ (REL-013)

---

## Start Now

1. Decide which agent number you are (1, 2, or 3)
2. Run the setup commands above
3. Create your session file
4. Start your first task
5. Follow the task execution template for each task

**Good luck! Verification over persuasion. 🎯**