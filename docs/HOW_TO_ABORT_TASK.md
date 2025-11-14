# How to Abort a Task

If you start a task but need to stop for any reason.

## Process

### Step 1: Update Roadmap

**Edit:** `docs/roadmaps/MASTER_ROADMAP.md`

Change the status of the task back to `ready`.

### Step 2: Move Session File

Move your session file from `docs/sessions/active/` to `docs/sessions/abandoned/`.

### Step 3: Update ACTIVE_SESSIONS.md

Remove your session from the `docs/ACTIVE_SESSIONS.md` file.

### Step 4: Delete Feature Branch

```bash
git branch -D [your-feature-branch]
```

### Step 5: Commit Changes

Commit the changes to the roadmap and session files.

### Step 6: Notify User

Inform the user that the task has been aborted and the roadmap has been cleaned up.
