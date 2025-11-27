# How to Add a Task to the Roadmap

**Version:** 2.0  
**Last Updated:** November 26, 2025

---

## ⚠️ CRITICAL: Validator-Required Field Formats

Before adding any task, you MUST understand the exact formats the validator expects:

### Status (use exact lowercase values)
| Valid | Invalid |
|-------|---------|
| `ready` | ~~📋 PLANNED~~, ~~Not Started~~ |
| `in-progress` | ~~⏳ IN PROGRESS~~, ~~In Progress~~ |
| `complete` | ~~✅ COMPLETE~~, ~~Complete (date)~~ |
| `blocked` | ~~🚫 BLOCKED~~ |

### Priority (use exact uppercase values)
| Valid | Invalid |
|-------|---------|
| `HIGH` | ~~P0 (CRITICAL)~~, ~~🔴 P0~~ |
| `MEDIUM` | ~~P2 (MEDIUM)~~, ~~🟢 P2~~ |
| `LOW` | ~~P3 (LOW)~~ |

### Estimate (use compact notation)
| Valid | Invalid |
|-------|---------|
| `4-8h` | ~~4-8 hours~~ |
| `16h` | ~~2 days (16 hours)~~ |
| `2d` | ~~2 days~~ |
| `1w` | ~~1 week~~ |

---

## Process

### Step 1: Create Branch (optional for roadmap-only changes)

```bash
git checkout main
git pull origin main
git checkout -b add-task-ST-XXX
```

### Step 2: Use Template

Copy the task template:
```bash
cp docs/templates/TASK_TEMPLATE.md docs/tasks/ST-XXX-draft.md
```

### Step 3: Fill Template with Correct Formats

**Edit:** `docs/tasks/ST-XXX-draft.md`

**Required Fields (MUST use these exact formats):**

```markdown
### ST-XXX: Your Task Title

**Status:** ready              # Use: ready, in-progress, complete, blocked
**Priority:** HIGH             # Use: HIGH, MEDIUM, LOW
**Estimate:** 4-8h             # Use: 4-8h, 16h, 2d, 1w
**Module:** `path/to/module`
**Dependencies:** None
**Prompt:** `docs/prompts/ST-XXX.md`

**Problem:**
[Description of the problem]

**Objectives:**

1. First objective (MINIMUM 3 REQUIRED)
2. Second objective
3. Third objective

**Deliverables:**

- [ ] First deliverable (MINIMUM 5 REQUIRED)
- [ ] Second deliverable
- [ ] Third deliverable
- [ ] Fourth deliverable
- [ ] Fifth deliverable
```

### Step 4: Create Prompt File

```bash
cp docs/templates/PROMPT_TEMPLATE.md docs/prompts/ST-XXX.md
```

**Edit:** `docs/prompts/ST-XXX.md`

**IMPORTANT:** The prompt file MUST contain a `## Implementation Guide` section for validation to pass.

### Step 5: Add to Roadmap

**Edit:** `docs/roadmaps/MASTER_ROADMAP.md`

Add the task to the appropriate section.

### Step 6: Validate BEFORE Committing

```bash
pnpm roadmap:validate
```

**If validation fails, DO NOT COMMIT.** Fix the formatting issues first.

Common validation errors:
- `Invalid value for Status` → Use lowercase: ready, in-progress, complete, blocked
- `Invalid value for Priority` → Use uppercase: HIGH, MEDIUM, LOW
- `Invalid estimate format` → Use: 4-8h, 16h, 2d, 1w
- `Must have at least 3 objectives` → Add more objectives
- `Must have at least 5 deliverables` → Add more deliverables
- `Prompt file not found` → Create the prompt file
- `Missing "## Implementation Guide" section` → Add this section to the prompt

### Step 7: Commit and Push

```bash
git add docs/roadmaps/MASTER_ROADMAP.md docs/prompts/ST-XXX.md
git commit -m "Add task: ST-XXX [TASK_TITLE]"
git push origin main
```

---

## Quick Reference: Valid Field Values

| Field | Valid Values |
|-------|-------------|
| Status | `ready`, `in-progress`, `complete`, `blocked` |
| Priority | `HIGH`, `MEDIUM`, `LOW` |
| Estimate | `4-8h`, `16h`, `2d`, `1w` (no decimals, no "hours/days" text) |

---

## Troubleshooting

### "Invalid value for Status"
```markdown
# ❌ WRONG
**Status:** ✅ COMPLETE
**Status:** 📋 PLANNED
**Status:** Complete (2025-11-14)

# ✅ CORRECT
**Status:** complete
**Status:** ready
```

### "Invalid value for Priority"
```markdown
# ❌ WRONG
**Priority:** P0 (CRITICAL)
**Priority:** 🔴 P1 (HIGH)

# ✅ CORRECT
**Priority:** HIGH
```

### "Invalid estimate format"
```markdown
# ❌ WRONG
**Estimate:** 3 days (24 hours)
**Estimate:** 1.5-2 hours
**Estimate:** 0.5h

# ✅ CORRECT
**Estimate:** 24h
**Estimate:** 1-2h
**Estimate:** 1h
```
