'''
# How to Deprecate a Task

When a task becomes obsolete or is replaced by a different approach.

## Process

### Step 1: Create Branch

```bash
git checkout main
git pull origin main
git checkout -b deprecate-ST-XXX
```

### Step 2: Update Roadmap

**Edit:** `docs/roadmaps/MASTER_ROADMAP.md`

Move the task to the "🗑️ Deprecated" section and update its status.

### Step 2.5: Check for Dependents

Search the roadmap for tasks that depend on the one you are deprecating and update them.

### Step 3: Archive Prompt

```bash
mkdir -p docs/prompts/deprecated
git mv docs/prompts/ST-XXX.md docs/prompts/deprecated/
```

### Step 4: Add Deprecation Notice to Prompt

Add a deprecation notice to the top of the prompt file.

### Step 5: Commit and PR

Commit your changes and create a pull request.
'''
