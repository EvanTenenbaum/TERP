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
