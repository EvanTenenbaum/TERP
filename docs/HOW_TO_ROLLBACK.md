# How to Rollback a Task

When a completed task causes issues and needs to be reverted.

## Process

### Step 1: Identify Problem

Determine which task and PR caused the issue.

### Step 2: Create Revert Branch

```bash
git checkout main
git pull origin main
git checkout -b revert-ST-XXX
```

### Step 3: Revert Commits

```bash
git revert -m 1 <merge-commit-hash>
```

### Step 4: Update Roadmap

**Edit:** `docs/roadmaps/MASTER_ROADMAP.md`

Change the task status to `reverted` and add the reason.

### Step 5: Create Revert PR

Commit your changes and create a pull request with a clear explanation of the revert.

### Step 6: Create Fix Task

Add a new task to the roadmap to address the original problem with a revised approach.
