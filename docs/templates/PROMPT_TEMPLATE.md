# {{TASK_ID}}: {{TITLE}}

> **Auto-generated from:** MASTER_ROADMAP.md  
> **Version:** {{VERSION}}  
> **Last updated:** {{TIMESTAMP}}  
> **Status:** Ready

## Quick Start

```bash
git clone https://github.com/EvanTenenbaum/TERP.git
cd TERP
pnpm install
```

## Task Context

- **Task ID:** {{TASK_ID}}
- **Estimate:** {{ESTIMATE}}
- **Module:** `{{MODULE}}`
- **Dependencies:** {{DEPENDENCIES}}
- **Priority:** {{PRIORITY}}

## Objectives

{{OBJECTIVES}}

## Parallel Coordination

{{COORDINATION}}

## Implementation Guide

### Phase 1: Setup (X min)

**Goal:** Prepare development environment and understand requirements

```bash
# Review existing code
ls -lh {{MODULE}}

# Check dependencies
pnpm list | grep [relevant-packages]
```

**Steps:**

1. Read task objectives and deliverables carefully
2. Review related files in `{{MODULE}}`
3. Check ACTIVE_SESSIONS.md for coordination needs
4. Create feature branch: `git checkout -b claude/{{TASK_ID}}-Session-[ID]`

---

### Phase 2: Implementation (X hours)

**Goal:** Complete core functionality

[FILL IN: Step-by-step implementation instructions with code examples]

**Example:**

```typescript
// Example code structure
export function newFeature() {
  // Implementation
}
```

---

### Phase 3: Testing (X min)

**Goal:** Ensure all tests pass and no regressions

```bash
# Run tests
pnpm test {{MODULE}}

# Run full test suite
pnpm test --run

# Check TypeScript
pnpm check
```

**Test Requirements:**

- Minimum 10 tests for new functionality
- 100% coverage of new code
- All existing tests still passing
- Zero TypeScript errors

---

### Phase 4: Documentation (X min)

**Goal:** Document changes and complete deliverables

**Required Documentation:**

- Update relevant .md files
- Add inline code comments
- Update MASTER_ROADMAP.md status
- Create completion report (if needed)

---

## Deliverables Checklist

{{DELIVERABLES}}

- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings
- [ ] Documentation updated
- [ ] Session file archived
- [ ] MASTER_ROADMAP.md updated to "✅ Complete"

## Completion

When complete:

1. **Update roadmap status:**

   ```bash
   # Edit docs/roadmaps/MASTER_ROADMAP.md
   # Change: **Status:** 📋 Ready
   # To:     **Status:** ✅ Complete
   ```

2. **Archive session file:**

   ```bash
   mv docs/sessions/active/Session-*.md docs/sessions/completed/
   ```

3. **Push to GitHub:**
   ```bash
   git add -A
   git commit -m "feat: Complete {{TASK_ID}}"
   git push origin main
   ```

---

**Need help?** Check `.claude/AGENT_ONBOARDING.md` for protocols.
