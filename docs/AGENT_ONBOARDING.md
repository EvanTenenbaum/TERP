# TERP Agent Onboarding

**Purpose:** Quick start guide for new development agents working on TERP.

**Last Updated:** October 27, 2025

---

## Welcome!

You're about to work on **TERP**, a modern ERP system redesign focused on simplicity and exceptional UX/UI. This document will get you oriented quickly.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Read These Files (In Order)

1. **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** (5 min)
   - Understand the overall system architecture
   - See what's already built
   - Learn the tech stack

2. **[DEVELOPMENT_PROTOCOLS.md](./DEVELOPMENT_PROTOCOLS.md)** (10 min)
   - **This is "The Bible"** - all development rules and standards
   - MUST follow these protocols for all work
   - Zero TypeScript errors, production-ready code only

3. **[roadmaps/ACTIVE.md](./roadmaps/ACTIVE.md)** (2 min)
   - See what you're working on right now
   - Check current phase and tasks

4. **[notes/user-feedback.md](./notes/user-feedback.md)** (2 min)
   - **Check this EVERY session** - owner's latest feedback
   - See if there are any new instructions or thoughts

5. **[HANDOFF_CONTEXT.md](./HANDOFF_CONTEXT.md)** (2 min)
   - See what the last agent did
   - Understand current state and next steps

---

## 📋 Your Workflow

### At Start of Every Session

```
1. ✅ Read notes/user-feedback.md (new feedback?)
2. ✅ Read HANDOFF_CONTEXT.md (what did last agent do?)
3. ✅ Read roadmaps/ACTIVE.md (what am I working on?)
4. ✅ Review DEVELOPMENT_PROTOCOLS.md (refresh on standards)
5. ✅ Clone repo if needed: gh repo clone EvanTenenbaum/TERP
```

### During Work

```
1. ✅ Follow DEVELOPMENT_PROTOCOLS.md strictly
2. ✅ Update roadmap file as you complete tasks
3. ✅ Commit changes regularly with clear messages
4. ✅ Run `pnpm run check` before committing (zero TS errors)
5. ✅ Test your changes thoroughly
```

### Before Ending Session

```
1. ✅ Update roadmap with current status
2. ✅ Update HANDOFF_CONTEXT.md with:
   - What you completed
   - What's next
   - Any blockers or issues
3. ✅ Update CHANGELOG.md with completed work
4. ✅ Commit and push all changes
5. ✅ Verify zero TypeScript errors
```

---

## 📁 Documentation Structure

```
/docs/
├── AGENT_ONBOARDING.md          ← You are here
├── PROJECT_CONTEXT.md            ← Overall project state
├── DEVELOPMENT_PROTOCOLS.md      ← "The Bible" - development rules
├── HANDOFF_CONTEXT.md            ← Latest session handoff
├── CHANGELOG.md                  ← Completed work history
│
├── roadmaps/                     ← All implementation roadmaps
│   ├── README.md                 ← Master index
│   ├── ACTIVE.md                 ← Current roadmap (start here!)
│   └── [specific-roadmaps].md
│
├── notes/                        ← Owner's feedback and thoughts
│   ├── README.md                 ← How to use notes
│   ├── user-feedback.md          ← CHECK THIS EVERY SESSION!
│   ├── feature-ideas.md          ← Future features
│   └── known-issues.md           ← Bugs and issues
│
└── specs/                        ← Detailed specifications
    └── [various-specs].md
```

---

## ⚠️ Critical Rules

### Must Do
- ✅ **Always check `notes/user-feedback.md` first** - this is how the owner communicates with you
- ✅ **Follow DEVELOPMENT_PROTOCOLS.md** - no exceptions
- ✅ **Zero TypeScript errors** - run `pnpm run check` before committing
- ✅ **Update roadmap as you work** - keep it current
- ✅ **Update HANDOFF_CONTEXT.md before finishing** - next agent needs to know what you did

### Never Do
- ❌ **Never skip reading user-feedback.md** - you might miss critical instructions
- ❌ **Never commit TypeScript errors** - must be zero errors
- ❌ **Never use placeholders or stubs** - production-ready code only
- ❌ **Never forget to update HANDOFF_CONTEXT.md** - next agent will be lost
- ❌ **Never expose pricing/COGS data to clients** - security critical

---

## 🎯 Current Focus

**Active Roadmap:** Default Values Implementation

**Current Phase:** Phase 1 - Master Data & Foundation

**Your Job:**
1. Read the full roadmap: [roadmaps/defaults-implementation.md](./roadmaps/defaults-implementation.md)
2. Read the specifications: [roadmaps/defaults-specifications.md](./roadmaps/defaults-specifications.md)
3. Start with Phase 1 tasks
4. Update roadmap as you complete tasks

**Critical Security Note:**
⚠️ Pricing profiles, markup percentages, and COGS adjustments must be completely hidden from client-facing views. Triple check all client-facing code.

---

## 🛠️ Tech Stack Quick Reference

**Frontend:**
- React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- Vite (build tool), pnpm (package manager)

**Backend:**
- Node.js, tRPC, Drizzle ORM
- MySQL 8.0 database

**Development:**
```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server
pnpm run check        # Check TypeScript (must be zero errors)
pnpm test             # Run tests
pnpm db:push          # Push schema changes to database
```

---

## 📚 Key Documents by Purpose

**Understanding the Project:**
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - What TERP is and what's built
- [TERP_DESIGN_SYSTEM.md](./TERP_DESIGN_SYSTEM.md) - UI/UX design principles

**Development Standards:**
- [DEVELOPMENT_PROTOCOLS.md](./DEVELOPMENT_PROTOCOLS.md) - **THE BIBLE** - all rules

**Current Work:**
- [roadmaps/ACTIVE.md](./roadmaps/ACTIVE.md) - What you're working on
- [notes/user-feedback.md](./notes/user-feedback.md) - Owner's latest thoughts

**Handoffs:**
- [HANDOFF_CONTEXT.md](./HANDOFF_CONTEXT.md) - What last agent did
- [CHANGELOG.md](./CHANGELOG.md) - History of completed work

**Specifications:**
- [specs/](./specs/) - Detailed specs for various modules

---

## 🤝 Communication with Owner

**Owner → You:**
- Owner adds feedback to `notes/user-feedback.md`
- You check it at start of every session
- Follow any instructions or incorporate feedback

**You → Owner:**
- Update roadmap with progress
- Update HANDOFF_CONTEXT.md with status
- Add issues to `notes/known-issues.md`
- Commit changes so owner can review

---

## ❓ Common Questions

**Q: Where do I start?**
A: Read this file, then PROJECT_CONTEXT.md, then DEVELOPMENT_PROTOCOLS.md, then roadmaps/ACTIVE.md

**Q: What am I working on?**
A: Check `roadmaps/ACTIVE.md` - it always points to the current roadmap

**Q: How do I know what the last agent did?**
A: Read `HANDOFF_CONTEXT.md`

**Q: Where does the owner leave feedback?**
A: `notes/user-feedback.md` - check it every session!

**Q: How do I update the roadmap?**
A: Edit the roadmap file directly, check off completed tasks with `- [x]`, commit changes

**Q: What if I find a bug?**
A: Add it to `notes/known-issues.md` with details

**Q: What if I have a question?**
A: Add it to `notes/user-feedback.md` and the owner will respond

---

## ✅ Checklist: Am I Ready?

Before you start coding, make sure you've:

- [ ] Read PROJECT_CONTEXT.md
- [ ] Read DEVELOPMENT_PROTOCOLS.md (The Bible)
- [ ] Read roadmaps/ACTIVE.md
- [ ] Read notes/user-feedback.md
- [ ] Read HANDOFF_CONTEXT.md
- [ ] Cloned the repo (if needed)
- [ ] Understand what you're working on
- [ ] Know the current phase and tasks

If you've checked all boxes, you're ready to start! 🚀

---

## 🎓 Pro Tips

1. **Always check user-feedback.md first** - saves time and prevents rework
2. **Update roadmap as you go** - don't wait until the end
3. **Commit frequently** - small commits are easier to review
4. **Run `pnpm run check` often** - catch TypeScript errors early
5. **Read DEVELOPMENT_PROTOCOLS.md multiple times** - it's that important
6. **Update HANDOFF_CONTEXT.md thoroughly** - help the next agent

---

## 🆘 If You Get Stuck

1. Re-read DEVELOPMENT_PROTOCOLS.md
2. Check if there's a spec in `docs/specs/`
3. Review similar existing code in the repo
4. Add a question to `notes/user-feedback.md` for the owner
5. Document the blocker in HANDOFF_CONTEXT.md

---

**You're all set! Start with `roadmaps/ACTIVE.md` and happy coding! 🚀**

