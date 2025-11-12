# Claude Workflow Guide
## The Perfect System for Working with AI Agents on TERP

**Version:** 1.0
**Last Updated:** November 12, 2025
**Purpose:** Define the single source of truth, parallel development, and deployment workflow

---

## 📋 Table of Contents

1. [Quick Start: Your 3-Step Workflow](#quick-start-your-3-step-workflow)
2. [Single Source of Truth (SSOT)](#single-source-of-truth-ssot)
3. [The Backlog: Things on Hold](#the-backlog-things-on-hold)
4. [Parallel Development: Multiple Claudes](#parallel-development-multiple-claudes)
5. [Deployment & Review Cycle](#deployment--review-cycle)
6. [Git Workflow (Simplified)](#git-workflow-simplified)
7. [Development Rules (Always Follow)](#development-rules-always-follow)

---

## Quick Start: Your 3-Step Workflow

### Step 1: Tell Claude What to Do
```
"Add feature X to the inventory module"
"Fix bug Y in the accounting system"
"Improve the dashboard performance"
```

### Step 2: Claude Works & Deploys
- Claude creates a feature branch automatically
- Writes code following all protocols
- Runs tests
- Commits changes
- Pushes to GitHub
- **Automatically deploys to live site**
- Verifies deployment succeeded

### Step 3: You Review on Live Site
- Claude gives you the URL: `https://terp-app-b9s35.ondigitalocean.app`
- You test and provide feedback
- Say "merge it" when ready, or "fix X" for changes

**That's it!** Everything else is automated.

---

## Single Source of Truth (SSOT)

### 📍 The Master Roadmap

**Location:** `docs/roadmaps/MASTER_ROADMAP.md`

This is **THE ONLY roadmap** that matters. All others are archived.

**Structure:**
```markdown
# TERP Master Roadmap

## 🎯 Current Sprint (This Week)
- [ ] Task 1 (Assigned to: Claude-Session-A)
- [x] Task 2 (Completed)
- [ ] Task 3 (Blocked by: X)

## 🔜 Next Sprint (Next 1-2 Weeks)
- [ ] Feature A
- [ ] Feature B

## 📦 Backlog (On Hold - Don't Forget)
- [ ] Feature C (Waiting for: user feedback)
- [ ] Feature D (Nice to have: low priority)

## ✅ Completed (Last 30 Days)
- [x] Feature X (Deployed: 2025-11-10)
- [x] Feature Y (Deployed: 2025-11-08)
```

### 📊 Status Indicators

**Task States:**
- `[ ]` - Not started
- `[~]` - In progress (Claude working on it)
- `[x]` - Completed
- `[!]` - Blocked (waiting on something)
- `[?]` - Needs clarification

**Assignment Format:**
```markdown
- [~] Add strain matching algorithm (Claude-Session-123) 🔴 HIGH PRIORITY
- [ ] Improve dashboard load time (Unassigned) 🟡 MEDIUM
- [?] Payment gateway integration (Needs: user decision) 🔵 LOW
```

### 🔄 Update Protocol

**Claude updates the roadmap automatically:**
1. **Before starting:** Marks task as `[~]` in progress
2. **After completing:** Marks task as `[x]` completed, adds deployment date
3. **If blocked:** Marks as `[!]`, documents blocker

**You update the roadmap when:**
- Adding new tasks
- Changing priorities
- Moving things to backlog

---

## The Backlog: Things on Hold

### 📦 Backlog Location

**File:** `docs/roadmaps/MASTER_ROADMAP.md` (Backlog section)

### 📝 Backlog Format

```markdown
## 📦 Backlog (On Hold - Don't Forget)

### User Decision Required
- [ ] **Payment Gateway Integration**
  - Reason: Waiting on which provider to use
  - Context: Need to decide between Stripe, Square, or PayPal
  - Priority: Medium
  - Added: 2025-11-10

### Low Priority Features
- [ ] **Email Notifications**
  - Reason: Nice to have, not urgent
  - Context: Send email alerts for low inventory
  - Priority: Low
  - Added: 2025-11-05

### Future Phases
- [ ] **Mobile App**
  - Reason: Phase 3 feature
  - Context: Native mobile app for iOS/Android
  - Priority: Low
  - Added: 2025-10-15
```

### 🔄 Backlog Review

**Every 2 weeks:**
1. Review backlog items
2. Move high-value items to "Next Sprint"
3. Remove items no longer relevant
4. Update priorities based on business needs

---

## Parallel Development: Multiple Claudes

### 🚀 How Multiple Claude Instances Work

**The System:**
- Each Claude instance works on a separate git branch
- Branches are automatically named: `claude/feature-name-SESSION_ID`
- Branches deploy to the SAME live site
- Last merge wins (most recent changes go live)
- No conflicts because branches are isolated

### 📋 Coordination System

**Location:** `docs/ACTIVE_SESSIONS.md`

```markdown
# Active Claude Sessions

**Last Updated:** 2025-11-12 10:30 AM

## 🟢 Currently Working

| Session ID | Task | Branch | Status | Started |
|------------|------|--------|--------|---------|
| Session-A  | Add COGS improvements | claude/cogs-improvements-ABC123 | In Progress | 10:00 AM |
| Session-B  | Fix dashboard bug | claude/dashboard-fix-XYZ789 | Testing | 09:30 AM |

## ⏸️ Paused

| Session ID | Task | Branch | Reason | Paused At |
|------------|------|--------|--------|-----------|
| Session-C  | Strain matching | claude/strain-matching-DEF456 | Waiting on feedback | 09:00 AM |

## ✅ Completed Today

| Session ID | Task | Branch | Merged At |
|------------|------|--------|-----------|
| Session-D  | Payment terms | claude/payment-terms-GHI012 | 08:45 AM |
```

### 🎯 Assignment Rules

**To start a new Claude session:**
1. Pick a task from MASTER_ROADMAP.md
2. Tell Claude: "Work on task X from the roadmap"
3. Claude automatically:
   - Creates branch with unique session ID
   - Updates ACTIVE_SESSIONS.md
   - Marks task as in-progress in roadmap

**To avoid conflicts:**
- Don't assign same module to 2 Claudes
- ✅ Good: Claude-A on inventory, Claude-B on accounting
- ❌ Bad: Claude-A and Claude-B both on inventory

### 🔀 Merge Order

**Last merge wins:**
- Session-A merges at 10:00 AM → Goes live
- Session-B merges at 10:30 AM → Goes live (replaces Session-A if same files)

**To be safe:**
- Merge completed work frequently
- Review live site after each merge
- If conflict detected, Claude will alert you

---

## Deployment & Review Cycle

### 🚀 Automatic Deployment Flow

**What happens automatically:**

```
Claude writes code
     ↓
Runs tests locally
     ↓
Commits to feature branch
     ↓
Pushes to GitHub (triggers CI/CD)
     ↓
GitHub Actions runs tests
     ↓
DigitalOcean builds & deploys
     ↓
Claude monitors deployment
     ↓
Deployment completes (3-5 minutes)
     ↓
Claude verifies success
     ↓
Claude reports: "✅ Deployed! Ready for review"
```

### 👀 Your Review Process

**Step 1: Claude provides summary**
```
✅ DEPLOYMENT COMPLETE

Feature: COGS improvements
Branch: claude/cogs-improvements-ABC123
Deployed: 2025-11-12 10:35 AM
Live URL: https://terp-app-b9s35.ondigitalocean.app

Changes:
- Added COGS range mode
- Improved margin calculations
- Updated UI for COGS display

Test These:
1. Go to Orders → Create Order
2. Add items and check margin display
3. Try overriding COGS on an item
```

**Step 2: You test on live site**
- Open the URL
- Follow Claude's test steps
- Try to break it
- Check if it works as expected

**Step 3: Provide feedback**
- ✅ "Looks good, merge it"
- ❌ "The margin isn't showing correctly, fix it"
- 🤔 "Can you also add feature Y?"

### 🔄 Merge Process (Automated)

**When you say "merge it":**

```
Claude runs final checks
     ↓
Merges branch to main
     ↓
Deletes feature branch
     ↓
Main branch deploys (automatic)
     ↓
Claude verifies main deployment
     ↓
Updates roadmap: marks task [x] completed
     ↓
Updates ACTIVE_SESSIONS.md: moves to completed
     ↓
Claude reports: "✅ Merged and live on main!"
```

**Deployment Monitoring:**
- Claude checks database for deployment status
- Polls every 30 seconds until "success" or "failed"
- Reports deployment time and any errors

---

## Git Workflow (Simplified)

### 🌳 Branch Strategy

**You don't need to understand git deeply. Here's what happens:**

```
main (live production site)
 ├── claude/feature-a-ABC123 (Session A working here)
 ├── claude/feature-b-XYZ789 (Session B working here)
 └── claude/feature-c-DEF456 (Session C working here)
```

**Key Concepts (Simplified):**

| Term | What It Means | What You Do |
|------|---------------|-------------|
| **Branch** | A separate copy where Claude works | Nothing - automatic |
| **Commit** | Saving changes with a message | Nothing - Claude does it |
| **Push** | Sending code to GitHub | Nothing - Claude does it |
| **Deploy** | Publishing to live site | Nothing - automatic |
| **Merge** | Moving code from branch to main | Say "merge it" |
| **PR (Pull Request)** | NOT USED (we merge directly) | Nothing |

### ✅ What Claude Does Automatically

**Every time Claude completes work:**
1. ✅ Writes code following all protocols
2. ✅ Runs tests (80% coverage minimum)
3. ✅ Commits with descriptive message
4. ✅ Pushes to feature branch
5. ✅ Monitors deployment
6. ✅ Verifies deployment succeeded
7. ✅ Reports status to you

**When you approve:**
1. ✅ Merges to main branch
2. ✅ Deletes feature branch
3. ✅ Verifies main deployment
4. ✅ Updates all documentation

### 🚫 What You Never Need to Do

- ❌ Create branches
- ❌ Write commit messages
- ❌ Push code
- ❌ Monitor deployments
- ❌ Check test status
- ❌ Worry about conflicts (Claude handles it)

### 🎯 Your Only Git Actions

**Approve merges:**
```
You: "merge it"
You: "looks good, ship it"
You: "merge to production"
```

**Request changes:**
```
You: "fix the bug with X before merging"
You: "add feature Y then merge"
You: "looks broken, revert it"
```

**That's it!**

---

## Development Rules (Always Follow)

### 📖 The Bible: DEVELOPMENT_PROTOCOLS.md

**Location:** `docs/DEVELOPMENT_PROTOCOLS.md`

Claude **MUST** follow these rules **100% of the time**:

### ✅ Mandatory Rules

**1. Testing Protocol**
- ✅ Write tests BEFORE code (TDD)
- ✅ 80% minimum test coverage
- ✅ All tests must pass before pushing
- ❌ NEVER use `--no-verify` to skip tests

**2. Code Quality**
- ✅ Zero TypeScript errors
- ✅ No TODO or FIXME comments in code
- ✅ Production-ready code only
- ✅ Proper error handling everywhere
- ❌ No placeholders or stubs

**3. Database Changes**
- ✅ Use Drizzle ORM migrations
- ✅ Additive changes only (no breaking changes)
- ✅ Test migrations before committing
- ❌ Never delete columns or tables

**4. Deployment Verification**
- ✅ Monitor every deployment
- ✅ Verify deployment status = "success"
- ✅ Check commit SHA matches
- ✅ Confirm site is accessible
- ❌ NEVER report "done" without verification

**5. Architecture Patterns**
- ✅ Use `authProvider` / `dataProvider` abstractions
- ✅ Thin routers (< 50 lines per procedure)
- ✅ Business logic in `*Db.ts` files
- ✅ Return full objects (not just IDs)
- ❌ No direct `getDb()` calls in new code

**6. Security**
- ✅ RBAC permissions on all endpoints
- ✅ Input validation with Zod
- ✅ SQL injection protection (Drizzle ORM)
- ✅ Never commit secrets
- ❌ No hardcoded API keys

### 🚨 Breaking Protocol = Stop Immediately

**If Claude breaks any protocol:**
1. 🛑 Stop and alert you
2. 🔍 Review what went wrong
3. 🔧 Fix the violation
4. ✅ Verify compliance before continuing

### 📋 Pre-Push Checklist

**Claude verifies EVERY TIME before pushing:**

```markdown
- [ ] All tests pass (pnpm test)
- [ ] Zero TypeScript errors (pnpm check)
- [ ] Code follows protocols
- [ ] No secrets in code
- [ ] Migration tested (if DB changes)
- [ ] Documentation updated
- [ ] Roadmap updated
```

**Only pushes when ALL boxes checked.**

---

## 🎯 Example Workflow

### Scenario: Add a New Feature

**You:** "Add a product recommendation feature to the order page"

**Claude:**
1. ✅ Creates branch: `claude/product-recommendations-XYZ789`
2. ✅ Updates ACTIVE_SESSIONS.md
3. ✅ Marks task in-progress in roadmap
4. ✅ Writes tests first (TDD)
5. ✅ Implements feature
6. ✅ Runs tests (all pass)
7. ✅ Commits and pushes
8. ✅ Monitors deployment (3-5 min)
9. ✅ Verifies deployment success
10. ✅ Reports: "✅ Ready for review!"

**You:** (Test on live site for 5 minutes)

**You:** "Looks great! Also add a filter by price range"

**Claude:**
11. ✅ Adds price filter to same branch
12. ✅ Tests + commits + pushes
13. ✅ Monitors deployment
14. ✅ Reports: "✅ Price filter added!"

**You:** "Perfect, merge it"

**Claude:**
15. ✅ Merges to main
16. ✅ Deletes feature branch
17. ✅ Verifies main deployment
18. ✅ Updates roadmap: [x] Product recommendations
19. ✅ Updates ACTIVE_SESSIONS.md
20. ✅ Reports: "✅ Merged to production!"

**Total time:** 30-45 minutes
**Your active time:** 5 minutes testing
**Claude's active time:** Fully automated

---

## 🔧 Troubleshooting

### "Deployment Failed"

**Claude automatically:**
1. Retrieves error logs from database
2. Identifies the issue
3. Fixes the code
4. Re-commits and pushes
5. Monitors new deployment
6. Reports: "✅ Fixed and redeployed!"

**You do:** Nothing (unless Claude needs clarification)

### "Tests Failed"

**Claude automatically:**
1. Reviews test failures
2. Fixes the code
3. Re-runs tests
4. Commits when all pass

**You do:** Nothing

### "Merge Conflict"

**Claude automatically:**
1. Fetches latest main
2. Rebases feature branch
3. Resolves conflicts
4. Tests everything
5. Pushes resolved code

**You do:** Nothing (unless complex business logic conflict)

### "Site is Broken"

**You:** "The order page is broken, revert it"

**Claude:**
1. ✅ Identifies last merge
2. ✅ Reverts commit
3. ✅ Pushes revert to main
4. ✅ Monitors deployment
5. ✅ Verifies site is fixed
6. ✅ Reports: "✅ Reverted and fixed!"

---

## 📁 File Structure Reference

```
TERP/
├── docs/
│   ├── DEVELOPMENT_PROTOCOLS.md      ← The Bible (rules)
│   ├── CLAUDE_WORKFLOW.md            ← This file (workflow)
│   ├── ACTIVE_SESSIONS.md            ← Active Claude sessions
│   └── roadmaps/
│       ├── MASTER_ROADMAP.md         ← Single source of truth
│       └── archive/                  ← Old roadmaps (ignore)
├── .mcp.json                         ← DigitalOcean MCP config
└── .github/workflows/                ← CI/CD automation
```

---

## 🎓 Quick Reference Card

**Start new work:**
```
You: "Work on X from the roadmap"
Claude: Creates branch, updates docs, starts working
```

**Check progress:**
```
You: "What are you working on?"
Claude: Shows current task, branch, progress
```

**Review work:**
```
Claude: "✅ Deployed! Ready for review at https://..."
You: Test on live site
```

**Approve:**
```
You: "merge it"
Claude: Merges, deploys, updates docs
```

**Request changes:**
```
You: "fix X before merging"
Claude: Fixes, re-deploys, reports when ready
```

**Multiple sessions:**
```
Session-A: Working on inventory
Session-B: Working on accounting
Both deploy to same site, no conflicts
```

---

## 🚀 Advanced: Parallel Sessions Example

**Monday 9:00 AM:**

**You:** (Open 3 Claude sessions)

**Session A:** "Add COGS improvements from roadmap"
- Branch: `claude/cogs-improvements-ABC`
- Working on: Orders module

**Session B:** "Fix dashboard performance from roadmap"
- Branch: `claude/dashboard-perf-XYZ`
- Working on: Dashboard module

**Session C:** "Add strain matching algorithm from roadmap"
- Branch: `claude/strain-matching-DEF`
- Working on: Matching module

**10:00 AM:** Session B finishes
- You test, approve, merge
- Dashboard improvements go live

**10:30 AM:** Session A finishes
- You test, approve, merge
- COGS improvements go live (includes dashboard changes)

**11:00 AM:** Session C finishes
- You test, approve, merge
- Strain matching goes live (includes previous changes)

**Result:** 3 features completed in parallel, merged sequentially, all live by 11 AM!

---

## 📞 Communication Protocol

### Claude Reports Status

**Every 15-30 minutes:**
```
📊 STATUS UPDATE

Task: Product recommendations
Branch: claude/product-recs-XYZ
Status: 70% complete

Completed:
✅ Database schema
✅ API endpoints
✅ Tests (85% coverage)

In Progress:
🔄 Frontend UI

Next:
- Complete UI
- Deploy for review

ETA: 20 minutes
```

**When blocked:**
```
🚨 BLOCKED

Task: Payment gateway
Branch: claude/payment-gateway-ABC
Blocked on: Which provider to use?

Options:
1. Stripe (most features)
2. Square (simpler)
3. PayPal (most familiar)

Need: Your decision to continue
```

### You Provide Feedback

**Specific feedback:**
```
✅ Good: "The margin calculation is wrong for consignment orders"
❌ Vague: "Something is broken"

✅ Good: "Add a search filter for product grade"
❌ Vague: "Make it better"
```

**Priorities:**
```
🔴 "Fix the login bug ASAP" (Claude drops everything)
🟡 "Add this when you have time" (Claude adds to roadmap)
🟢 "Nice to have" (Claude adds to backlog)
```

---

## 🎯 Success Metrics

**Your workflow is working when:**

✅ You spend < 10 minutes per feature review
✅ Features go live same day
✅ You can run 3+ Claude sessions in parallel
✅ Zero merge conflicts
✅ Roadmap is always accurate
✅ Nothing is forgotten in the backlog
✅ Deployments succeed 95%+ of the time
✅ You understand what's happening without knowing git

**If any metric fails, tell Claude to optimize the workflow.**

---

## 📚 Related Documents

- **[DEVELOPMENT_PROTOCOLS.md](./DEVELOPMENT_PROTOCOLS.md)** - The rules (The Bible)
- **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** - System overview
- **[SESSION_HANDOFF.md](./SESSION_HANDOFF.md)** - Session continuity
- **[MASTER_ROADMAP.md](./roadmaps/MASTER_ROADMAP.md)** - Current priorities

---

**Last Updated:** November 12, 2025
**Maintained By:** Claude + Evan
**Status:** Production-ready workflow
