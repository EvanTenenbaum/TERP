'''
# How to Add a Task to the Roadmap

**NEVER edit MASTER_ROADMAP.md directly on the main branch**

## Process

### Step 1: Create Branch

```bash
git checkout main
git pull origin main
git checkout -b add-task-ST-XXX
```

### Step 2: Use Template

```bash
cp docs/templates/TASK_TEMPLATE.md docs/tasks/ST-XXX-draft.md
```

### Step 3: Fill Template

**Edit:** `docs/tasks/ST-XXX-draft.md`

**Required Fields:**
- Task ID (get next number from roadmap)
- Title (clear, concise)
- Status (usually "ready")
- Priority (HIGH/MEDIUM/LOW)
- Estimate (hours)
- Module (which files/folders)
- Dependencies (task IDs or "None")
- Objectives (3-5 bullet points)
- Deliverables (checkbox list)
- Tags (for searchability)

### Step 4: Create Prompt

```bash
cp docs/templates/PROMPT_TEMPLATE.md docs/prompts/ST-XXX.md
```

**Edit:** `docs/prompts/ST-XXX.md`

**Update metadata:**
```markdown
<!-- TASK_ID: ST-051 -->
<!-- TASK_TITLE: Implement Email Notifications -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-13 -->
```

**Fill in all sections:**
- Context
- Phase 1: Pre-Flight Check
- Phase 2: Session Startup
- Phase 3: Development (specific steps)
- Phase 4: Completion
- Quick Reference
- Troubleshooting

### Step 5: Add to Roadmap

**Edit:** `docs/roadmaps/MASTER_ROADMAP.md`

Add the task to the "🚀 Ready for Deployment" section.

### Step 6: Validate Locally (Optional)

```bash
node scripts/validate-roadmap.js
node scripts/check-circular-deps.js
node scripts/validate-prompts.js
node scripts/check-secrets.js
```

### Step 7: Commit and Push

```bash
git add docs/roadmaps/MASTER_ROADMAP.md docs/prompts/ST-XXX.md docs/tasks/ST-XXX-draft.md
git commit -m "Add task: ST-XXX [TASK_TITLE]"
git push origin add-task-ST-XXX
```

### Step 8: Create PR

Create a pull request on GitHub from your branch to `main`.

### Step 9: Announce

Notify the team that a new task has been added to the roadmap.
'''
