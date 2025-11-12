# TERP Quick Reference Card
## Everything You Need in One Place

**Print this out or keep it open in a tab!**

---

## 🎯 Your Only 3 Commands

```
1. "Work on X from the roadmap"     → Claude starts working
2. (Claude deploys, you test)       → Test on live site
3. "Merge it" or "Fix Y first"      → Claude merges or fixes
```

**That's literally it.**

---

## 📁 The 4 Files That Matter

| File | What It's For | When To Check |
|------|---------------|---------------|
| **[MASTER_ROADMAP.md](roadmaps/MASTER_ROADMAP.md)** | What needs to be done | Start of day |
| **[ACTIVE_SESSIONS.md](ACTIVE_SESSIONS.md)** | Who's working on what | Before starting new work |
| **[CLAUDE_WORKFLOW.md](CLAUDE_WORKFLOW.md)** | How everything works | Reference when needed |
| **[DEVELOPMENT_PROTOCOLS.md](DEVELOPMENT_PROTOCOLS.md)** | The rules | Claude follows automatically |

---

## 🚀 Start New Work

```
You: "Add feature X to inventory module"

Claude:
✅ Creates branch: claude/feature-x-ABC123
✅ Updates ACTIVE_SESSIONS.md
✅ Marks roadmap task in-progress
✅ Writes tests
✅ Writes code
✅ Commits + pushes
✅ Monitors deployment (3-5 min)
✅ Reports: "Ready for review at https://..."
```

**Your time:** 0 minutes
**Claude's time:** 30-60 minutes

---

## 👀 Review Work

**Claude gives you:**
```
✅ DEPLOYED!

Live URL: https://terp-app-b9s35.ondigitalocean.app
Branch: claude/feature-x-ABC123
Deployed: 2:30 PM

Test This:
1. Go to Inventory page
2. Click "Add Product"
3. Check if new field appears
```

**You do:**
1. Open URL
2. Test the thing (5 min)
3. Give feedback

---

## ✅ Approve Work

**If it works:**
```
You: "Looks good, merge it"
You: "Ship it"
You: "Merge to production"
```

**Claude:**
```
✅ Merging to main...
✅ Deploying...
✅ Verifying...
✅ Complete! Live in production.
```

**If it doesn't work:**
```
You: "The button is broken, fix it"
You: "Also add feature Y while you're at it"
```

**Claude:**
```
✅ Fixed button
✅ Added feature Y
✅ Deployed for review
```

---

## 🔄 Multiple Claudes (Parallel Work)

**Safe to run in parallel:**
```
Claude A: Working on Inventory
Claude B: Working on Accounting
Claude C: Working on Dashboard
```

**They don't conflict because different modules.**

**How to start:**
1. Open 3 terminal tabs
2. Each tab: "Work on X from roadmap"
3. Each Claude works independently
4. Each deploys to same site
5. You merge them one at a time
6. Last merge includes all previous work

**Danger: Same module**
```
❌ Claude A: Editing ordersDb.ts
❌ Claude B: Also editing ordersDb.ts
Result: CONFLICT!
```

**Check ACTIVE_SESSIONS.md before starting!**

---

## 🚨 When Things Break

### "Site is Broken"

```
You: "The order page is broken, revert it"

Claude:
✅ Identifies last merge
✅ Reverts changes
✅ Pushes revert
✅ Site fixed in 2 minutes
```

### "Deployment Failed"

```
Claude (automatically):
✅ Gets error logs
✅ Fixes the issue
✅ Re-deploys
✅ Reports: "Fixed and deployed!"
```

**You do:** Nothing (unless Claude needs info)

### "Tests Failed"

```
Claude (automatically):
✅ Sees which test failed
✅ Fixes the code
✅ Re-runs tests
✅ Commits when all pass
```

**You do:** Nothing

---

## 📊 Check Status

**What's being worked on?**
```
Open: docs/ACTIVE_SESSIONS.md
```

**What needs to be done?**
```
Open: docs/roadmaps/MASTER_ROADMAP.md
```

**How's the system doing?**
```
Ask Claude: "Show me system status"

Claude reports:
- Active sessions: 2
- Pending tasks: 5
- Last deployment: 10 min ago
- Test status: ✅ All passing
- TypeScript errors: 0
```

---

## 🎯 Priority Levels

| Priority | When | Example |
|----------|------|---------|
| 🔴 HIGH | Do this sprint (this week) | Critical bug, blocks work |
| 🟡 MEDIUM | Do next sprint (next 1-2 weeks) | Performance improvement |
| 🟢 LOW | Do eventually (backlog) | Nice to have feature |
| ⚫ EXCLUDED | Never do this | User said no |

**To change priority:**
```
You: "Make task X high priority"
You: "Move task Y to backlog"
```

Claude updates MASTER_ROADMAP.md

---

## 📦 The Backlog (Don't Forget)

**Location:** MASTER_ROADMAP.md → Backlog section

**What goes here:**
- Features on hold (waiting for decision)
- Nice-to-have (low priority)
- Future phases (Phase 3+)

**Review:** Every 2 weeks
- Move important items to sprint
- Remove items no longer relevant

---

## 🔒 The Rules (Automatic)

**Claude ALWAYS:**
- ✅ Writes tests first (TDD)
- ✅ Runs all tests before pushing
- ✅ Monitors every deployment
- ✅ Verifies deployment succeeded
- ✅ Zero TypeScript errors
- ✅ No TODO comments in code
- ✅ Updates roadmap automatically
- ✅ Follows all protocols

**You NEVER need to:**
- ❌ Write git commands
- ❌ Monitor deployments
- ❌ Run tests manually
- ❌ Check for errors
- ❌ Worry about breaking things

---

## 🌐 Important URLs

**Production Site:**
```
https://terp-app-b9s35.ondigitalocean.app
```

**GitHub Repo:**
```
https://github.com/EvanTenenbaum/TERP
```

**DigitalOcean Dashboard:**
```
Ask Claude: "Show me deployment status"
(Uses DigitalOcean MCP server)
```

---

## ⏱️ Time Estimates

| Task Type | Claude Time | Your Time |
|-----------|-------------|-----------|
| Small bug fix | 15-30 min | 2 min review |
| New feature | 1-2 hours | 5 min review |
| Major feature | 3-6 hours | 10 min review |
| Refactoring | 2-4 hours | 5 min review |

**Total time savings: 90%+**

---

## 💡 Pro Tips

### Tip 1: Be Specific
```
✅ "The margin isn't calculating correctly for consignment orders"
❌ "Something is broken"
```

### Tip 2: Test Thoroughly
```
✅ Try to break it
✅ Test edge cases
✅ Use different data
```

### Tip 3: Give Context
```
✅ "This should work like the vendor intake flow"
❌ "Make it better"
```

### Tip 4: Batch Feedback
```
✅ "Fix X, Y, and Z, then merge"
❌ "Fix X" ... "Now fix Y" ... "Now fix Z"
```

### Tip 5: Use Priorities
```
✅ "Fix login bug ASAP, add search filter when you have time"
```

---

## 🆘 Emergency Commands

**Stop everything:**
```
You: "Stop all work, site is broken"
Claude: Pauses all sessions, investigates
```

**Revert last change:**
```
You: "Revert the last merge"
Claude: Reverts and redeploys in 2 minutes
```

**Check system health:**
```
You: "Run diagnostics"
Claude: Checks tests, deployments, errors
```

---

## 📞 Communication Templates

### Start Work
```
You: "Work on [TASK] from the roadmap"
You: "Add [FEATURE] to [MODULE]"
You: "Fix [BUG] in [LOCATION]"
```

### Give Feedback
```
You: "Looks good, merge it"
You: "Fix [X] before merging"
You: "Also add [Y] while you're at it"
You: "This is broken: [SPECIFIC ISSUE]"
```

### Check Status
```
You: "What are you working on?"
You: "Show me progress"
You: "What's left to do?"
```

### Change Priority
```
You: "Make [TASK] high priority"
You: "Move [TASK] to backlog"
You: "Pause work on [TASK]"
```

---

## 📖 15 Real-World Examples

### Example 1: Start Work on Backlog Item

```
You: "Work on the email notifications feature from the backlog"

Claude:
✅ Found task in MASTER_ROADMAP.md backlog
✅ Moved to current sprint
✅ Created branch: claude/email-notifications-ABC123
✅ Started implementation
```

### Example 2: Change Task Priority Mid-Work

```
You: "Actually, pause that. The login bug is more urgent"

Claude:
✅ Paused email notifications work
✅ Updated session status to "paused"
✅ Started login bug fix (new session)
✅ Will resume email notifications after
```

### Example 3: Pause for Urgent Task

```
Claude: Working on dashboard improvements (50% done)

You: "Pause that, site is down!"

Claude:
✅ Saved progress in session file
✅ Marked as paused in ACTIVE_SESSIONS.md
✅ Switched to emergency investigation
✅ Dashboard work ready to resume anytime
```

### Example 4: Resume Paused Work

```
You: "Resume the dashboard improvements from yesterday"

Claude:
✅ Found paused session: Session-20251111-dashboard-XYZ789
✅ Read handoff notes (was 50% done)
✅ Continued from line 45 in dashboardDb.ts
✅ Completed remaining 50%
```

### Example 5: Handle Merge Conflict

```
Claude: ⚠️  Merge conflict detected in ordersDb.ts

Two sessions modified the same function:
- Session A: Added wholesale COGS
- Session B: Added retail COGS

Which should I keep?

You: "Merge both - we need separate functions for each"

Claude:
✅ Created calculateWholesaleCOGS()
✅ Created calculateRetailCOGS()
✅ Kept both features
✅ Conflict resolved, deploying...
```

### Example 6: Abandon Work Cleanly

```
You: "Actually, stop work on that feature. We're going a different direction"

Claude:
✅ Documented progress in session file:
   - Completed: Database schema
   - In progress: API endpoints (60% done)
   - Not started: UI components
✅ Moved session to docs/sessions/abandoned/
✅ Kept branch: claude/feature-x-ABC123 (can cherry-pick later)
✅ Updated roadmap: Task moved to backlog
```

### Example 7: Check Other Sessions

```
You: "What are the other Claude sessions working on?"

Claude:
📊 Active Sessions:

Session A (Session-20251112-inventory-ABC123):
- Task: Add batch expiry tracking
- Module: Inventory
- Progress: 75% (finalizing tests)
- ETA: 30 minutes

Session B (Session-20251112-accounting-XYZ789):
- Task: Implement tax reports
- Module: Accounting
- Progress: 40% (building UI)
- ETA: 1 hour

✅ No conflicts - different modules
```

### Example 8: Emergency Site Rollback

```
You: "Emergency! The order page is broken, revert the last merge immediately!"

Claude:
✅ Identified last merge: commit a1b2c3d (COGS improvements)
✅ Running git revert...
✅ Tests passing
✅ Pushing revert...
✅ Deployment started (2-3 min)
✅ Site restored!

The broken COGS change is reverted. Want me to fix it and redeploy?
```

### Example 9: Multiple Claudes on Same Module

```
Claude A: Working on Orders module (ordersDb.ts)

You start Claude B: "Add recurring orders feature"

Claude B:
⚠️  WARNING: Potential conflict detected

Session A (ABC123) is currently working on Orders module
Files being modified: ordersDb.ts, orders.tsx

Recommendations:
1. Wait for Session A to finish (ETA: 30 min) ✅ RECOMMENDED
2. Work on different module (Inventory, Accounting)
3. Coordinate: Work on different files in Orders

What would you like to do?
```

### Example 10: Handoff to Another Agent

```
Your Session Ends (must leave)

You: "I need to go. Document your progress for the next Claude"

Claude:
✅ Updated session file with handoff notes:

## Handoff Notes
**Status:** 60% complete

**Completed:**
- ✅ Database schema for recurring orders
- ✅ API endpoints: create, list, update
- ✅ Tests for all API endpoints (passing)

**In Progress:**
- ⏱️ UI components (50% done)
- File: client/src/components/RecurringOrders.tsx
- Next: Complete the edit form (lines 150-200)

**Not Started:**
- ❌ Notification system
- ❌ Integration with existing orders

**Next Steps:**
1. Finish UI edit form
2. Test full flow end-to-end
3. Add notifications
4. Deploy and verify

**Blockers:** None
**Branch:** claude/recurring-orders-ABC123
```

### Example 11: Review Backlog Weekly

```
You: "Let's review the backlog. Show me what's there"

Claude:
📦 Backlog Review (12 items)

**High value / Low effort (consider promoting):**
1. Email notifications (2-3 days)
2. CSV export for reports (1 day)

**Waiting on decisions:**
3. Payment gateway integration (Which provider?)
4. Internal messaging (User said no internal, only email)

**Low priority / Nice to have:**
5-8. [4 items listed]

**Should probably remove:**
9. Tax reporting automation (User explicitly said no)

**Recommendations:**
- Promote #1 and #2 to next sprint
- Remove #9 (explicitly excluded)
- Get decision on #3 and #4
```

### Example 12: Move Task to Backlog

```
You: "Move the mobile app task to the backlog. Not ready for that yet"

Claude:
✅ Moved task from "Next Sprint" to "Backlog"
✅ Updated MASTER_ROADMAP.md:

## 📦 Backlog
- [ ] Mobile Native App (Phase 5+)
  - Reason: Not ready yet, PWA sufficient for now
  - Review: Q2 2026
  - Priority: Low
  - Estimate: 2-3 months

✅ Committed and pushed to GitHub
```

### Example 13: Debug Deployment Failure

```
Claude: Deployment failed!

Claude (automatically):
✅ Retrieved error logs from database
✅ Error: "Module not found: @/components/NewComponent"

Analysis: Import path incorrect (should be relative, not alias)

✅ Fixed import: ./components/NewComponent
✅ Committed fix
✅ Pushing... deployment restarted
✅ Monitoring... deployment succeeded!

Issue was a TypeScript import path. Fixed and deployed.
```

### Example 14: Verify All Tests Pass

```
You: "Before we merge, run all tests and show me the results"

Claude:
🧪 Running full test suite...

✅ Unit tests: 145/145 passed
✅ Integration tests: 23/23 passed
✅ Coverage: 84% (above 80% minimum)
✅ TypeScript: 0 errors
✅ Linting: 0 warnings
✅ Build: Successful

📊 Test Summary:
- Duration: 45 seconds
- Files tested: 68
- Assertions: 892
- Flaky tests: 0
- Skipped tests: 0

✅ All checks passed - safe to merge!
```

### Example 15: Quick Status Check

```
You: "Status check"

Claude:
📊 TERP System Status

**Active Work:**
- Session-ABC123: Dashboard improvements (90% done, deploying)

**Recent Deployments:**
- 10 min ago: COGS improvements ✅ Success
- 2 hours ago: Sample management ✅ Success

**System Health:**
- ✅ All tests passing (168 tests)
- ✅ TypeScript: 0 errors
- ✅ Last deployment: Successful
- ✅ Site: https://terp-app-b9s35.ondigitalocean.app (online)
- ✅ GitHub sync: Up-to-date

**Roadmap:**
- Current sprint: 3/5 tasks complete
- Next sprint: 4 tasks planned
- Backlog: 12 items

**Recommendation:** System healthy, ready for more work!
```

---

## 🎓 When To Read Full Docs

**Read CLAUDE_WORKFLOW.md when:**
- First time using system
- Want to understand parallel development
- Need to troubleshoot something
- Want to optimize workflow

**Read MASTER_ROADMAP.md when:**
- Starting a new week
- Planning priorities
- Reviewing completed work

**Read ACTIVE_SESSIONS.md when:**
- Starting new Claude session
- Want to check conflicts
- Need to coordinate work

**Read DEVELOPMENT_PROTOCOLS.md when:**
- Never (Claude follows it automatically)
- Only if you're curious about the rules

---

## ✅ Success Checklist

**Your workflow is working when:**

- [ ] You spend < 10 min reviewing features
- [ ] Features go live same day
- [ ] You run 3+ Claudes in parallel
- [ ] No merge conflicts
- [ ] Roadmap is always accurate
- [ ] Nothing is forgotten
- [ ] 95%+ deployment success
- [ ] You understand what's happening

**If any fail, optimize the workflow!**

---

## 🎯 Remember

**The System Does Everything:**
- Creates branches ✅
- Writes tests ✅
- Writes code ✅
- Runs tests ✅
- Commits ✅
- Pushes ✅
- Deploys ✅
- Monitors ✅
- Verifies ✅
- Updates docs ✅

**You Do Two Things:**
1. Tell Claude what to build
2. Review on live site

**That's it!**

---

## 📚 Document Index

- **[CLAUDE_WORKFLOW.md](CLAUDE_WORKFLOW.md)** - Full workflow (20 min read)
- **[MASTER_ROADMAP.md](roadmaps/MASTER_ROADMAP.md)** - What to build (5 min review)
- **[ACTIVE_SESSIONS.md](ACTIVE_SESSIONS.md)** - Who's working (2 min check)
- **[DEVELOPMENT_PROTOCOLS.md](DEVELOPMENT_PROTOCOLS.md)** - The rules (reference)
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - This file (2 min review)

---

**Last Updated:** November 12, 2025
**Print-Friendly:** Yes
**Bookmark This:** Yes
