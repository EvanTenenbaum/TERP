# Roadmap Task Addition System - Design

**Purpose:** Ensure any agent told "add to TERP roadmap X" automatically follows complete protocol.

---

## 🎯 Design Goals

1. **Zero Manual Steps** - Agent follows checklist automatically
2. **Impossible to Skip** - Validation enforces all requirements
3. **Self-Documenting** - Agent creates complete task definition
4. **Immediately Usable** - New task ready for deployment after addition

---

## 🏗️ System Architecture

### 1. Entry Point: Agent Onboarding Document

**Location:** `.claude/AGENT_ONBOARDING.md`

**Add prominent section:**

```markdown
## 🚨 ADDING TASKS TO ROADMAP

**If user says:** "Add [task description] to TERP roadmap"

**YOU MUST:**

1. STOP immediately
2. Run: `pnpm roadmap:add-task`
3. Follow the interactive wizard
4. DO NOT manually edit MASTER_ROADMAP.md
5. DO NOT skip any steps

**Why:** The roadmap system has strict validation. Manual edits will be rejected.
```

### 2. Interactive Wizard: `pnpm roadmap:add-task`

**Command:** `tsx scripts/roadmap.ts add-task`

**Workflow:**

```
Step 1: Task ID
  → Prompt: "Enter task ID (e.g., ST-013):"
  → Validate: Must be ST-XXX format, not already exist
  → Auto-suggest: Next available ID

Step 2: Title
  → Prompt: "Enter task title:"
  → Validate: 10-100 characters, descriptive

Step 3: Priority
  → Prompt: "Select priority: (H)IGH, (M)EDIUM, (L)OW:"
  → Validate: Must be H, M, or L

Step 4: Estimate
  → Prompt: "Enter estimate (e.g., 4-6h, 2d, 1w):"
  → Validate: Must match format, reasonable range

Step 5: Module
  → Prompt: "Enter module path (e.g., server/routers/orders.ts):"
  → Validate: Path format, warn if doesn't exist

Step 6: Dependencies
  → Prompt: "Enter dependencies (comma-separated task IDs, or 'None'):"
  → Validate: All IDs exist, no circular deps

Step 7: Objectives
  → Prompt: "Enter objective 1 of 3:"
  → Repeat 3 times minimum
  → Validate: At least 3 objectives

Step 8: Deliverables
  → Prompt: "Enter deliverable 1 of 5:"
  → Repeat 5 times minimum
  → Validate: At least 5 deliverables

Step 9: Implementation Guide
  → Prompt: "Do you want to fill implementation guide now? (y/n):"
  → If yes: Open editor
  → If no: Create placeholder (agent will fill later)

Step 10: Review & Confirm
  → Show complete task definition
  → Prompt: "Add this task to roadmap? (y/n):"
  → If yes: Add to MASTER_ROADMAP.md, generate prompt file
  → If no: Discard

Step 11: Validation
  → Run: `pnpm roadmap validate`
  → If fails: Show errors, ask to fix
  → If passes: Commit changes

Step 12: Success
  → Print: "✅ Task ST-XXX added successfully"
  → Print: "📝 Prompt file: docs/prompts/ST-XXX.md"
  → Print: "🔄 Run 'pnpm roadmap:next-batch' to see if it's in next batch"
```

### 3. Validation Enforcement

**Pre-commit hook:** `.husky/pre-commit`

```bash
# If MASTER_ROADMAP.md changed, validate
if git diff --cached --name-only | grep -q "MASTER_ROADMAP.md"; then
  echo "🔍 Validating MASTER_ROADMAP.md..."
  pnpm roadmap validate || {
    echo "❌ Roadmap validation failed"
    echo "💡 Use 'pnpm roadmap:add-task' to add tasks"
    exit 1
  }
fi
```

**Result:** Impossible to commit invalid roadmap.

### 4. Documentation Updates

**Update these files:**

1. **`.claude/AGENT_ONBOARDING.md`**
   - Add "Adding Tasks to Roadmap" section at top
   - Make it impossible to miss

2. **`docs/ROADMAP_SYSTEM_GUIDE.md`**
   - Add "Adding New Tasks" section
   - Document wizard workflow

3. **`docs/templates/TASK_TEMPLATE.md`**
   - Show exact format for manual reference
   - Note: "Use pnpm roadmap:add-task instead of copying this"

---

## 🔒 Enforcement Mechanisms

### Level 1: Documentation (Awareness)

- Prominent section in AGENT_ONBOARDING.md
- Clear instructions: "DO NOT manually edit"

### Level 2: Tooling (Guidance)

- Interactive wizard (`pnpm roadmap:add-task`)
- Step-by-step prompts
- Auto-validation at each step

### Level 3: Validation (Prevention)

- Pre-commit hook blocks invalid roadmaps
- Clear error messages
- Suggests correct command

### Level 4: CI/CD (Backup)

- GitHub Actions validates on PR
- Blocks merge if validation fails

---

## 📊 Success Criteria

**Agent Experience:**

1. Agent sees "add to roadmap" in user message
2. Agent checks AGENT_ONBOARDING.md
3. Agent sees prominent "ADDING TASKS TO ROADMAP" section
4. Agent runs `pnpm roadmap:add-task`
5. Wizard guides through all steps
6. Validation passes automatically
7. Task added successfully

**Failure Prevention:**

- ❌ Can't skip wizard (documentation says "MUST use")
- ❌ Can't commit invalid roadmap (pre-commit hook)
- ❌ Can't merge invalid roadmap (CI/CD check)
- ❌ Can't forget fields (wizard prompts for all)

---

## 🎯 Implementation Checklist

- [ ] Create `add-task` command in roadmap.ts
- [ ] Implement interactive wizard with validation
- [ ] Update pre-commit hook
- [ ] Add CI/CD workflow
- [ ] Update AGENT_ONBOARDING.md
- [ ] Update ROADMAP_SYSTEM_GUIDE.md
- [ ] Test complete workflow
- [ ] Document edge cases

---

## 🚀 Future Enhancements

1. **AI-Assisted Task Creation**
   - Parse user's description
   - Auto-generate objectives/deliverables
   - Agent reviews and confirms

2. **Task Templates by Type**
   - "Add database migration task"
   - "Add API endpoint task"
   - Pre-filled common fields

3. **Dependency Suggestions**
   - Analyze task description
   - Suggest likely dependencies
   - Detect potential conflicts

---

**Status:** Design complete, ready for adversarial QA
