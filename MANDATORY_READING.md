# 📚 MANDATORY READING - Start Here
## Required Documentation for All TERP Development Agents

**⚠️ STOP! This is your entry point. Read this BEFORE doing anything else.**

---

## 🎯 Purpose

This document is your **complete index** of all required reading. Following these documents ensures you build in alignment with TERP's systems, protocols, and quality standards.

---

## 📋 Reading Order (20 minutes total)

### Phase 1: Onboarding (5 minutes)

**1. Agent Onboarding (.claude/AGENT_ONBOARDING.md)** - ⏱️ 5 min
```
Read first: .claude/AGENT_ONBOARDING.md
```
- Complete workflow overview
- Your responsibilities
- Common pitfalls
- Checklists

---

### Phase 2: Quick Start (7 minutes)

**2. Quick Reference (docs/QUICK_REFERENCE.md)** - ⏱️ 2 min
```
Read second: docs/QUICK_REFERENCE.md
```
- 2-minute system overview
- 15 real-world examples
- Essential commands
- Your only 3 commands

**3. Master Roadmap (docs/roadmaps/MASTER_ROADMAP.md)** - ⏱️ 3 min
```
Read third: docs/roadmaps/MASTER_ROADMAP.md
```
- What to work on RIGHT NOW
- Current sprint priorities
- What's on hold (backlog)
- What NOT to build (excluded items)

**4. Development Protocols - Section 16 (docs/DEVELOPMENT_PROTOCOLS.md#16)** - ⏱️ 2 min
```
Read fourth: docs/DEVELOPMENT_PROTOCOLS.md (Section 16 only)
```
- GitHub sync protocol (MANDATORY)
- Status update requirements
- Commit and push procedures

---

### Phase 3: Code Quality Standards (5 minutes) - **NEW**

**5. Code Standards Protocol (docs/protocols/CODE_STANDARDS.md)** - ⏱️ 2 min
```
Read fifth: docs/protocols/CODE_STANDARDS.md
```
- TypeScript strictness (NO `any` types)
- React component patterns (memo, useCallback, useMemo)
- Error handling standards
- Naming conventions

**6. Testing Quality Protocol (docs/protocols/TESTING_QUALITY.md)** - ⏱️ 2 min
```
Read sixth: docs/protocols/TESTING_QUALITY.md
```
- Coverage requirements by tier
- Test quality standards
- Forbidden test patterns
- Integration test requirements

**7. All Protocols Index (docs/protocols/README.md)** - ⏱️ 1 min
```
Read seventh: docs/protocols/README.md
```
- Database standards
- Performance standards
- Accessibility standards
- ADR (Architecture Decision Records) system

---

### Phase 4: System Understanding (3 minutes)

**8. QA System Overview (.claude/QA_SYSTEM_README.md)** - ⏱️ 2 min
```
Read: .claude/QA_SYSTEM_README.md
```
- Quality gates
- Pre-commit hooks
- QA tools
- Common issues

**9. Active Sessions (docs/ACTIVE_SESSIONS.md)** - ⏱️ 1 min
```
Read: docs/ACTIVE_SESSIONS.md
```
- Who's working on what RIGHT NOW
- Avoid conflicts
- Check before starting work

---

## 🚨 Critical Constraints (NEVER VIOLATE)

### Absolute Rules

1. **NO PLACEHOLDERS**
   - ❌ "This will be implemented later"
   - ❌ "TODO: Add feature X"
   - ❌ "Coming soon"
   - ❌ "Stub implementation"
   - ❌ "X will go here"
   - ✅ Only production-ready code

2. **NO PSEUDOCODE**
   - ❌ "// Logic for calculating price goes here"
   - ❌ "// TODO: Implement validation"
   - ✅ Real, working, tested code only

3. **NO STUBS**
   - ❌ `function calculatePrice() { return 0; } // Stub`
   - ❌ `const component = () => <div>Placeholder</div>`
   - ✅ Full implementation with tests

4. **TDD MANDATORY**
   - ❌ Code first, tests later
   - ❌ No tests
   - ✅ Tests FIRST, then code

5. **STATUS UPDATES MANDATORY**
   - ❌ Work locally without updating GitHub
   - ❌ Batch updates
   - ✅ Update every 30 minutes, commit + push immediately

6. **COMPLETE BEFORE REPORTING**
   - ❌ "95% done, just need to..."
   - ❌ "Almost finished, except..."
   - ✅ 100% complete with tests passing

---

## ✅ Pre-Work Checklist

**Before starting ANY task, verify:**

- [ ] I have read .claude/AGENT_ONBOARDING.md (5 min)
- [ ] I have read docs/QUICK_REFERENCE.md (2 min)
- [ ] I have read docs/roadmaps/MASTER_ROADMAP.md (3 min)
- [ ] I have read DEVELOPMENT_PROTOCOLS.md Section 16 (2 min)
- [ ] I have read docs/protocols/CODE_STANDARDS.md (2 min)
- [ ] I have read docs/protocols/TESTING_QUALITY.md (2 min)
- [ ] I have checked docs/ACTIVE_SESSIONS.md (no conflicts)
- [ ] I understand: NO placeholders, NO stubs, NO pseudocode
- [ ] I understand: NO `any` types, proper React.memo usage
- [ ] I understand: TDD is mandatory with quality standards
- [ ] I understand: Status updates every 30 minutes
- [ ] I understand: 100% completion before reporting
- [ ] I understand: All code must be production-ready

**If ALL boxes are checked, you're ready to start!**

---

## 📖 Reference Documentation (Read as Needed)

### Code Quality Protocols (docs/protocols/)

- **CODE_STANDARDS.md** - TypeScript, React, error handling patterns
- **TESTING_QUALITY.md** - Test coverage requirements and quality standards
- **DATABASE_STANDARDS.md** - Schema design, naming, migrations
- **PERFORMANCE_STANDARDS.md** - React optimization, query performance
- **ACCESSIBILITY_STANDARDS.md** - WCAG 2.1 AA compliance

### Architecture Decisions (docs/adr/)

- **README.md** - ADR system overview and index
- **Individual ADRs** - Document significant architectural choices

### Workflow System

- **CLAUDE_WORKFLOW.md** - Complete workflow guide (20 pages)
- **CONFLICT_RESOLUTION.md** - Handling merge conflicts
- **SESSION_TEMPLATE.md** - Template for session files

### Legacy Protocols

- **DEVELOPMENT_PROTOCOLS.md** - The Bible (being migrated to docs/protocols/)
- **QA_FINDINGS.md** - Latest QA analysis
- **PROJECT_CONTEXT.md** - System architecture

### Quality Assurance

- **Multiple QA Reports** (docs/*QA*.md) - Past audits and findings
- **.github/PULL_REQUEST_TEMPLATE.md** - PR checklist
- **.github/ISSUE_TEMPLATE/** - Issue templates

---

## 🎯 Your Workflow (Every Session)

### 1. Check for Conflicts
```bash
cat docs/ACTIVE_SESSIONS.md
# OR
./scripts/aggregate-sessions.sh
```

### 2. Pick a Task
```bash
cat docs/roadmaps/MASTER_ROADMAP.md
# Choose from Current Sprint section
```

### 3. Start Work
- Claude creates session automatically
- Branch: `claude/task-name-SESSIONID`
- Session file: `docs/sessions/active/Session-[ID].md`

### 4. Develop (TDD)
```bash
# Write test FIRST
vim test/feature.test.ts

# Run test (should fail - RED)
pnpm test feature.test.ts

# Write code to pass (GREEN)
vim src/feature.ts

# Refactor
# Repeat
```

### 5. Update Status (Every 30 min)
```bash
# Update session file
vim docs/sessions/active/Session-[ID].md

# Commit + Push
git add docs/sessions/
git commit -m "status: Session-[ID] progress (X%)"
git push origin [branch]
```

### 6. Complete & Report
```bash
# Ensure 100% done
pnpm test        # All passing
pnpm check       # Zero errors

# Move session to completed
mv docs/sessions/active/Session-[ID].md docs/sessions/completed/

# Commit + Push
git add .
git commit -m "feat: complete task"
git push origin [branch]

# Report to user
"✅ Task complete. Ready for review."
```

---

## 🚫 Common Mistakes (DON'T DO THESE)

### Mistake 1: Incomplete Work
❌ **Wrong:**
```typescript
function calculatePrice(order: Order) {
  // TODO: Implement complex pricing logic
  return 0;
}
```

✅ **Right:**
```typescript
function calculatePrice(order: Order): number {
  const basePrice = order.items.reduce((sum, item) => sum + item.price, 0);
  const tax = basePrice * order.taxRate;
  const discount = calculateDiscount(order);
  return basePrice + tax - discount;
}

// Plus comprehensive tests
```

### Mistake 2: No Tests
❌ **Wrong:**
```bash
# Write code
vim src/feature.ts
git commit -m "feat: add feature"
```

✅ **Right:**
```bash
# Write test FIRST
vim test/feature.test.ts
pnpm test  # Should fail (RED)

# Write code
vim src/feature.ts
pnpm test  # Should pass (GREEN)

# Commit
git commit -m "feat: add feature with tests"
```

### Mistake 3: Missing Status Updates
❌ **Wrong:**
```bash
# Work for 2 hours locally
# Push everything at the end
```

✅ **Right:**
```bash
# Work for 30 minutes
git add docs/sessions/
git commit -m "status: Session-[ID] update (25%)"
git push origin [branch]

# Work for 30 more minutes
git add docs/sessions/
git commit -m "status: Session-[ID] update (50%)"
git push origin [branch]

# Etc.
```

---

## 📊 Quality Standards

### Code Quality
- ✅ Zero TypeScript errors
- ✅ All tests passing
- ✅ 80%+ test coverage
- ✅ No TODOs or FIXMEs
- ✅ No console.logs
- ✅ Production-ready

### Protocol Compliance
- ✅ TDD used
- ✅ Status updated every 30 min
- ✅ GitHub always current
- ✅ Session file complete
- ✅ No placeholders/stubs
- ✅ 100% completion

### Git Workflow
- ✅ Branch naming: `claude/*`
- ✅ Session file exists
- ✅ Commits pushed immediately
- ✅ Pre-commit hooks pass
- ✅ No `--no-verify`

---

## 🎓 Advanced Topics

### Parallel Development
- Read: docs/CLAUDE_WORKFLOW.md (Section 4)
- Check ACTIVE_SESSIONS.md before starting
- Work on different modules

### Conflict Resolution
- Read: docs/CONFLICT_RESOLUTION.md
- Comprehensive guide with examples
- Step-by-step procedures

### Deployment Verification
- Use: `scripts/verify-deployment.sh`
- Monitor deployment status
- Verify before reporting complete

---

## 🆘 Help & Support

### Quick Answers
- Check: docs/QUICK_REFERENCE.md
- 15 real-world examples
- Common commands
- Fast lookup

### Detailed Explanations
- Check: docs/CLAUDE_WORKFLOW.md
- 20-page complete guide
- All scenarios covered
- In-depth documentation

### Conflict Issues
- Check: docs/CONFLICT_RESOLUTION.md
- Merge conflict guide
- Resolution strategies
- Examples

---

## ✅ Final Checklist (Before Starting Work)

**I certify that I have:**

- [ ] Read all mandatory documentation (15 minutes)
- [ ] Understand NO placeholders/stubs/pseudocode rule
- [ ] Understand TDD is mandatory
- [ ] Understand status updates every 30 minutes
- [ ] Understand 100% completion requirement
- [ ] Checked ACTIVE_SESSIONS.md for conflicts
- [ ] Reviewed MASTER_ROADMAP.md for priorities
- [ ] Understand all code must be production-ready
- [ ] Will follow DEVELOPMENT_PROTOCOLS.md (all 16 sections)
- [ ] Will commit + push status updates immediately

**If ALL boxes are checked: You're ready! 🚀**

**If ANY box is unchecked: Go back and read that section!**

---

## 🎯 TL;DR (Too Long; Didn't Read)

**If you only remember 5 things:**

1. **NO PLACEHOLDERS** - Production-ready code only
2. **TDD MANDATORY** - Tests first, always
3. **STATUS UPDATES** - Every 30 min, commit + push
4. **CHECK CONFLICTS** - Read ACTIVE_SESSIONS.md first
5. **100% COMPLETE** - Don't report done unless actually done

---

**Start Here:** `.claude/AGENT_ONBOARDING.md`

**Questions?** Check `docs/QUICK_REFERENCE.md`

**Ready to work?** Check `docs/roadmaps/MASTER_ROADMAP.md`

---

**Last Updated:** November 12, 2025
**Version:** 1.0
**Maintained By:** TERP Development Team
