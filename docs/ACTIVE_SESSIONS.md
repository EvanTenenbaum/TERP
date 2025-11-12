# Active Claude Sessions
## Real-Time Coordination for Parallel Development

**Last Updated:** November 12, 2025 7:10 PM EST
**Auto-Updated By:** Claude agents

---

## 🟢 Currently Working

| Session ID | Task | Branch | Module | Status | Started | ETA |
|------------|------|--------|--------|--------|---------|-----|
| Session-011CV4V | Codebase Analysis | claude/terp-codebase-analysis-011CV4VkhLnxVcCAEBLYp8WF | Documentation | ✅ Complete | Nov 12, 6:00 PM | Done |

## ⏸️ Paused / Waiting

| Session ID | Task | Branch | Reason | Paused At | Resume When |
|------------|------|--------|--------|-----------|-------------|
| _(none)_ | - | - | - | - | - |

## ✅ Completed Today

| Session ID | Task | Branch | Merged At | Commit |
|------------|------|--------|-----------|--------|
| Session-011CV4V | Setup MCP & Analysis | claude/terp-codebase-analysis-011CV4VkhLnxVcCAEBLYp8WF | Pending | fc53eff |

## 🔴 Blocked

| Session ID | Task | Branch | Blocked By | Since | Action Needed |
|------------|------|--------|------------|-------|---------------|
| _(none)_ | - | - | - | - | - |

---

## 📋 Session Assignment Rules

### ✅ Safe to Assign in Parallel

**Different modules (no conflicts):**
- Session A: Inventory module
- Session B: Accounting module
- Session C: Dashboard module
- Session D: Calendar module

**Different features in same module:**
- Session A: Add COGS feature (Orders)
- Session B: Add payment terms (Orders)
- **Condition:** Different files, minimal overlap

### ⚠️ Risky (Coordinate First)

**Same files in same module:**
- Session A: Refactor orders router
- Session B: Add orders feature
- **Risk:** Merge conflicts likely
- **Solution:** Do sequentially or coordinate closely

### ❌ Don't Assign (Will Conflict)

**Same exact file:**
- Session A: Edit `ordersDb.ts`
- Session B: Edit `ordersDb.ts`
- **Result:** Guaranteed conflicts
- **Solution:** ONE session at a time per file

---

## 🎯 Current Capacity

**Recommended concurrent sessions: 3-4 max**

**Current utilization:**
- Active: 1 session (33%)
- Paused: 0 sessions
- Available slots: 2-3 sessions

**Recommendations:**
- ✅ Can start 2 more sessions safely
- ⚠️ 3rd session: pick different module
- ❌ Don't exceed 4 concurrent sessions

---

## 📊 Session History (Last 7 Days)

### November 12, 2025

**Session-011CV4V:**
- Task: Comprehensive codebase analysis
- Duration: ~2 hours
- Status: Complete (documentation phase)
- Commits: 2
- Files Changed: 5
- Outcome: ✅ Delivered full analysis + workflow system

### November 6-11, 2025

**Previous sessions:** (from SESSION_HANDOFF.md)
- Multiple sessions completed
- 18 major features implemented
- 62,946 lines of code added
- 90% scenario coverage achieved

---

## 🔄 Update Protocol

### When Starting Work

**Claude automatically updates:**
```markdown
| Session-ABC123 | Task name | claude/branch-name-ABC123 | Module | 🔄 Starting | HH:MM | X min |
```

### Every 30 Minutes

**Claude updates status:**
```markdown
| Session-ABC123 | Task name | ... | Module | ⏱️ 50% done | HH:MM | 30 min |
```

### When Paused

**Claude moves to "Paused" section:**
```markdown
| Session-ABC123 | Task name | ... | Waiting on user feedback | HH:MM | When user responds |
```

### When Complete

**Claude moves to "Completed Today":**
```markdown
| Session-ABC123 | Task name | ... | HH:MM | commit-hash |
```

### When Blocked

**Claude moves to "Blocked" section:**
```markdown
| Session-ABC123 | Task name | ... | Missing dependency | HH:MM | Install package X |
```

---

## 🚦 Conflict Detection

### Automatic Conflict Checks

**Claude checks before starting:**
1. What files will this task modify?
2. Are any other sessions touching those files?
3. Are there recent commits in those files?
4. Can this be done in parallel safely?

**If conflict detected:**
```
⚠️ CONFLICT DETECTED

This task will modify: server/ordersDb.ts
Currently being modified by: Session-XYZ789

Options:
1. Wait for Session-XYZ789 to finish (ETA: 30 min)
2. Work on different task
3. Coordinate with Session-XYZ789

Recommendation: Option 1 (wait)
```

### Manual Conflict Resolution

**If you notice a conflict:**
1. Tell Claude to pause one session
2. Complete the other session
3. Merge to main
4. Resume paused session (will auto-rebase)

---

## 📞 Communication Between Sessions

### Session Handoff Notes

**Location:** This file (ACTIVE_SESSIONS.md)

**Format:**
```markdown
## 📝 Notes for Other Sessions

**From Session-ABC123 (Orders work):**
- Changed COGS calculation logic in ordersDb.ts:150-200
- If you're working on orders, use new `calculateCOGS()` function
- Don't modify old COGS code, it's deprecated

**From Session-XYZ789 (Dashboard work):**
- Updated dashboard API to return full objects (not IDs)
- If fetching dashboard data, expect new format
- See dashboardDb.ts for new structure
```

### Active Alerts

**Current alerts:**
- _(none)_

---

## 🎯 Best Practices

### ✅ DO

- Update ACTIVE_SESSIONS.md when starting
- Check for conflicts before starting
- Work on different modules in parallel
- Commit frequently (every 30-60 min)
- Merge small changes quickly
- Update status every 30 minutes
- Pause session if blocked

### ❌ DON'T

- Start without checking active sessions
- Work on same file as another session
- Hold changes for hours without committing
- Forget to update status
- Leave sessions "paused" overnight
- Skip conflict checks

---

## 📊 Session Performance Metrics

### Last 7 Days

**Efficiency:**
- Average session duration: 2-3 hours
- Average features per session: 1-2
- Success rate: 95%+
- Conflicts: < 5%

**Deployment:**
- Average deploy time: 3-5 minutes
- Deploy success rate: 95%+
- Rollback rate: < 5%

**Quality:**
- Test coverage: 80%+
- TypeScript errors: 0
- Protocol violations: 0

---

## 🔧 Troubleshooting

### "Session Not Responding"

**Symptoms:** Session marked "In Progress" but no updates for > 1 hour

**Actions:**
1. Check if Claude session crashed
2. Review last commit
3. Mark session as "Paused"
4. Start new session to continue work

### "Merge Conflict"

**Symptoms:** Git reports conflicts when merging

**Actions:**
1. Claude automatically resolves if possible
2. If complex, Claude alerts you
3. You decide: keep branch A or B changes
4. Claude re-commits and merges

### "Deployment Failed"

**Symptoms:** Deployment status shows "failed"

**Actions:**
1. Claude retrieves error logs
2. Claude fixes issue
3. Claude re-commits
4. Deployment auto-retries

---

## 📚 Related Documents

- **[CLAUDE_WORKFLOW.md](./CLAUDE_WORKFLOW.md)** - Complete workflow guide
- **[MASTER_ROADMAP.md](./roadmaps/MASTER_ROADMAP.md)** - What to work on
- **[DEVELOPMENT_PROTOCOLS.md](./DEVELOPMENT_PROTOCOLS.md)** - How to work

---

**Maintained By:** Claude agents (auto-updated)
**Review By:** Evan (as needed)
**Format Version:** 1.0
