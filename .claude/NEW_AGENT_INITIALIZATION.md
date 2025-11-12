# 🚀 New Agent Initialization Prompt
## Copy/Paste This Entire Prompt to Initialize Any New Agent

**Purpose:** Load complete TERP context into any new AI agent in one prompt
**Time to Execute:** ~2-3 minutes
**Result:** Agent fully integrated with TERP workflow system

---

## 📋 THE PROMPT (Copy Everything Below)

```
You are now a TERP development agent. Your first task is to initialize yourself by reading the complete onboarding system.

CRITICAL INSTRUCTIONS:

1. Read MANDATORY_READING.md (15 minutes of reading, execute in 2-3 minutes)
2. Follow the reading order exactly as specified
3. After initialization, confirm you understand ALL rules and constraints
4. DO NOT start any work until initialization is complete

ABSOLUTE CONSTRAINTS (NEVER VIOLATE):

❌ NO PLACEHOLDERS - Never write "TODO", "coming soon", "will be implemented", "X goes here", or any placeholder text
❌ NO PSEUDOCODE - Only production-ready, working code
❌ NO STUBS - Every function must be fully implemented with tests
❌ TDD MANDATORY - Write tests FIRST, then code (Red-Green-Refactor)
❌ STATUS UPDATES MANDATORY - Update every 30 minutes, commit + push to GitHub immediately
❌ 100% COMPLETION REQUIRED - Don't report "done" unless actually 100% complete with all tests passing

WORKFLOW REQUIREMENTS:

1. Check docs/ACTIVE_SESSIONS.md BEFORE starting any work (avoid conflicts)
2. Check docs/roadmaps/MASTER_ROADMAP.md for priorities
3. Create session file: docs/sessions/active/Session-[ID].md
4. Branch naming: claude/task-name-SESSIONID
5. Update status every 30 minutes (commit + push to GitHub)
6. All code must have tests (80%+ coverage)
7. Zero TypeScript errors allowed
8. Pre-commit hooks must pass (DO NOT use --no-verify)

QUALITY GATES (ENFORCED):

- Pre-commit hook checks: TypeScript, tests, linting, prohibited patterns
- All tests must pass before commit
- Zero TypeScript errors before commit
- NO TODOs, FIXMEs, console.logs, debugger statements
- NO @ts-ignore or @ts-expect-error
- Production-ready code only

INITIALIZATION CHECKLIST:

After reading, confirm you understand:
- [ ] NO placeholders/stubs/pseudocode rule
- [ ] TDD is mandatory (tests first, always)
- [ ] Status updates every 30 minutes with GitHub sync
- [ ] Check ACTIVE_SESSIONS.md before starting
- [ ] 100% completion required before reporting done
- [ ] All code must be production-ready
- [ ] Pre-commit hooks enforce quality (never bypass)
- [ ] MASTER_ROADMAP.md is the ONLY roadmap
- [ ] Session-based parallel development (3-4 concurrent agents)
- [ ] Individual session files (no merge conflicts)

START INITIALIZATION:

1. Read MANDATORY_READING.md from project root
2. Follow the 15-minute onboarding path
3. Read .claude/AGENT_ONBOARDING.md completely
4. Confirm initialization complete
5. Ask user: "What would you like me to work on?"

DO NOT:
- Skip any reading
- Start work before initialization
- Assume you know the system
- Violate any constraints listed above

EFFICIENCY REQUIREMENTS:
- Read efficiently but completely
- Don't skip sections to save time
- Quality over speed
- Never sacrifice completeness for efficiency
- Full task completion is mandatory

After initialization, you will:
- Build in 100% alignment with TERP's system
- Never create placeholders or incomplete code
- Always follow TDD
- Update status properly
- Check requirements before reporting completion
- Work efficiently without sacrificing quality

INITIALIZE NOW by reading MANDATORY_READING.md
```

---

## 🎯 What This Prompt Does

**Loads Complete Context:**
1. TERP workflow system
2. All protocols and constraints
3. Quality requirements
4. Development workflow
5. Status tracking system

**Enforces Standards:**
- NO placeholders/stubs
- TDD mandatory
- 100% completion
- Status updates
- Quality gates

**Enables Efficiency:**
- Single prompt initialization
- Complete context load
- No follow-up questions needed
- Ready to work immediately

---

## ✅ Usage Instructions

### For the User:

1. Start new Claude session
2. Copy the entire prompt above (between the triple backticks)
3. Paste into Claude
4. Wait for Claude to initialize (~2-3 minutes)
5. Confirm Claude understands all constraints
6. Assign work

### For the Agent:

1. Receive this prompt
2. Read MANDATORY_READING.md
3. Follow onboarding path
4. Confirm understanding
5. Ask: "What would you like me to work on?"

---

## 🔍 Verification Questions

**After initialization, the agent should be able to answer:**

1. What is TDD and why is it mandatory?
2. How often must status be updated?
3. Where do I check for conflicts before starting work?
4. What is the branch naming convention?
5. What happens if I use a placeholder or TODO?
6. What does "100% completion" mean?
7. Can I use `git commit --no-verify`?
8. Where is the ONLY roadmap located?
9. What are the pre-commit hooks checking?
10. How many concurrent agents can work in parallel?

**Correct answers indicate successful initialization.**

---

## 🚀 Expected Output After Initialization

**Agent should respond:**

```
✅ Initialization Complete

I have read and understood:
- MANDATORY_READING.md (complete onboarding path)
- .claude/AGENT_ONBOARDING.md (full workflow guide)
- docs/QUICK_REFERENCE.md (system overview)
- docs/roadmaps/MASTER_ROADMAP.md (priorities)
- docs/DEVELOPMENT_PROTOCOLS.md Section 16 (GitHub sync)

I understand and will follow:
✅ NO placeholders, stubs, or pseudocode
✅ TDD mandatory (tests first, always)
✅ Status updates every 30 minutes → commit + push to GitHub
✅ Check ACTIVE_SESSIONS.md before starting (avoid conflicts)
✅ 100% completion before reporting done
✅ All code production-ready with tests
✅ Pre-commit hooks must pass (never bypass)
✅ Branch naming: claude/task-name-SESSIONID
✅ Session file: docs/sessions/active/Session-[ID].md

I am ready to work efficiently while maintaining full quality and compliance.

What would you like me to work on?
- I can check MASTER_ROADMAP.md for priorities
- Or you can assign a specific task
```

---

## 💡 Pro Tips

### For Users:

**Save this prompt** - Use it for every new Claude session

**Verify initialization** - Ask 1-2 verification questions

**Start small** - Assign one task first to confirm agent understands

**Check work** - First few commits should show proper workflow

### For Agents:

**Read completely** - Don't skim the documentation

**Ask clarification** - If anything is unclear after reading

**Follow protocols** - They exist for good reasons

**Update status** - Don't forget every 30 minutes

---

## 🔄 Updating This Prompt

**When to update:**
- New protocols added
- Workflow changes
- New constraints identified
- Common issues discovered

**How to update:**
- Edit this file
- Update the prompt section
- Test with new agent
- Verify initialization works

---

## 📊 Success Metrics

**Initialization is successful when:**

✅ Agent reads all required documentation
✅ Agent confirms understanding of all constraints
✅ Agent checks ACTIVE_SESSIONS.md before starting
✅ Agent creates proper session file
✅ Agent uses correct branch naming
✅ Agent writes tests first (TDD)
✅ Agent updates status every 30 minutes
✅ Agent produces production-ready code
✅ Agent never uses placeholders/stubs
✅ Agent reports 100% completion only when actually complete

---

## 🆘 Troubleshooting

### Issue: Agent starts work without initialization

**Solution:** Stop immediately, provide this prompt, wait for initialization

### Issue: Agent creates placeholders/TODOs

**Solution:** Pre-commit hook will block this. Agent should re-read constraints.

### Issue: Agent doesn't update status

**Solution:** Remind about 30-minute rule and GitHub sync requirement

### Issue: Agent reports "done" but work is incomplete

**Solution:** Remind about 100% completion requirement. Review checklist.

### Issue: Agent bypasses pre-commit hooks

**Solution:** This violates protocols. Hook will block commit anyway.

---

## ✨ Final Notes

**This prompt is:**
- Comprehensive (loads complete context)
- Efficient (one-time initialization)
- Enforceable (automated checks)
- Maintainable (single source of truth)

**Result:**
Every agent, regardless of session, works in 100% alignment with TERP's system, protocols, and quality standards.

---

**Last Updated:** November 12, 2025
**Version:** 1.0
**Maintained By:** TERP Development Team
