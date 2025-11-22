# Natural Language Commands Guide

**Purpose:** Execute swarm agents using natural language commands via GitHub  
**Last Updated:** November 21, 2025

---

## 🎯 Overview

You can now give natural language instructions that any agent can execute by simply editing a file in GitHub. The system automatically:

1. **Parses** your natural language command
2. **Converts** it to swarm execute commands
3. **Executes** the agents automatically
4. **Updates** the command status

**Works from anywhere:**
- GitHub web UI
- GitHub API
- Any git client
- Any agent that can edit files

---

## 📝 How to Use

### Step 1: Edit the Commands File

Edit `.github/AGENT_COMMANDS.md` and add your command:

```markdown
## 🎯 Pending Commands

- [ ] **Command:** Work through Phase 2.5
  - **Status:** Pending
  - **Added:** 2025-11-21
```

### Step 2: Commit and Push

```bash
git add .github/AGENT_COMMANDS.md
git commit -m "Add command: Work through Phase 2.5"
git push origin main
```

### Step 3: Automatic Execution

The GitHub Actions workflow will:
- Detect the change (within 5 minutes or immediately on push)
- Parse your command
- Execute the swarm agents
- Mark command as complete
- Update the file

---

## 💬 Supported Command Formats

### Work Through a Phase

```markdown
- [ ] **Command:** Work through Phase 2.5
- [ ] **Command:** Complete all tasks in Phase 2.5
- [ ] **Command:** Execute Phase 2.5
- [ ] **Command:** Phase 2.5 tasks
```

**What it does:** Executes all pending tasks in the specified phase.

### Work Until a Task

```markdown
- [ ] **Command:** Work until BUG-007 is complete
- [ ] **Command:** Complete all tasks up to BUG-007
- [ ] **Command:** Execute until WF-004
- [ ] **Command:** Until BUG-007
```

**What it does:** Executes all pending tasks until the specified task is complete.

### Execute Specific Tasks

```markdown
- [ ] **Command:** Run BUG-002, BUG-003, and BUG-007
- [ ] **Command:** Execute BUG-002 and BUG-003
- [ ] **Command:** Start agents for BUG-004 and BUG-005
```

**What it does:** Executes only the specified tasks.

### Auto-Select Recommended

```markdown
- [ ] **Command:** Execute recommended tasks
- [ ] **Command:** Run auto-selected tasks
- [ ] **Command:** Start swarm with auto mode
```

**What it does:** Executes high-priority recommended tasks automatically.

---

## 🔄 Workflow Process

1. **You add command** to `.github/AGENT_COMMANDS.md`
2. **You commit and push** to GitHub
3. **GitHub Actions triggers** (on push or every 5 minutes)
4. **Command is parsed** by `scripts/parse-natural-commands.ts`
5. **Swarm executes** the appropriate command
6. **Command is marked complete** in the file
7. **Status is updated** automatically

---

## 📊 Command Status

Commands go through these states:

- **Pending** - Waiting to be executed
- **Executing** - Currently running
- **Complete** - Finished successfully
- **Failed** - Execution failed

Completed commands are automatically moved to the "✅ Completed Commands" section.

---

## 🎯 Examples

### Example 1: Complete a Phase

```markdown
- [ ] **Command:** Work through Phase 2.5
  - **Status:** Pending
  - **Added:** 2025-11-21
```

**Result:** All tasks in Phase 2.5 will be executed in batches until complete.

### Example 2: Work Until Milestone

```markdown
- [ ] **Command:** Work until BUG-007 is complete
  - **Status:** Pending
  - **Added:** 2025-11-21
```

**Result:** All tasks up to and including BUG-007 will be executed.

### Example 3: Specific Tasks

```markdown
- [ ] **Command:** Run BUG-002, BUG-003, and BUG-007
  - **Status:** Pending
  - **Added:** 2025-11-21
```

**Result:** Only these three tasks will be executed.

---

## 🔍 Monitoring

### Check Command Status

```bash
# View commands file
cat .github/AGENT_COMMANDS.md

# Check GitHub Actions
# Go to: https://github.com/EvanTenenbaum/TERP/actions
# Look for "Execute Natural Language Commands" workflow
```

### View Execution Logs

1. Go to GitHub Actions
2. Click on "Execute Natural Language Commands" workflow
3. View the logs for each step

---

## 🛠️ Advanced Usage

### Multiple Commands

You can add multiple commands at once:

```markdown
## 🎯 Pending Commands

- [ ] **Command:** Work through Phase 2.5
  - **Status:** Pending
  - **Added:** 2025-11-21

- [ ] **Command:** Execute BUG-002 and BUG-003
  - **Status:** Pending
  - **Added:** 2025-11-21
```

Commands will be executed in order.

### Command Priority

Commands are executed in the order they appear in the file. The first pending command is executed first.

---

## 🚨 Troubleshooting

### Command Not Executing

**Check:**
1. Is the command in the "Pending Commands" section?
2. Is the checkbox `- [ ]` (not `- [x]`)?
3. Did you commit and push the file?
4. Check GitHub Actions for errors

**Fix:**
- Verify command format matches examples
- Check workflow logs for parsing errors
- Ensure command is in correct section

### Command Parsed Incorrectly

**Check:**
- Command format matches supported patterns
- Task IDs are correct (e.g., "BUG-007" not "bug-007")
- Phase names match roadmap (e.g., "Phase 2.5")

**Fix:**
- Use exact task IDs from roadmap
- Use phase names as they appear in roadmap
- Check parsing logs in GitHub Actions

### Command Stuck in Pending

**Check:**
- GitHub Actions workflow is running
- No errors in workflow logs
- Command format is correct

**Fix:**
- Manually trigger workflow: Actions → Execute Natural Language Commands → Run workflow
- Check for syntax errors in command
- Verify swarm manager is working

---

## 📋 Command Template

Use this template when adding commands:

```markdown
- [ ] **Command:** [Your natural language instruction here]
  - **Status:** Pending
  - **Added:** YYYY-MM-DD
```

**Examples:**
```markdown
- [ ] **Command:** Work through Phase 2.5
  - **Status:** Pending
  - **Added:** 2025-11-21

- [ ] **Command:** Work until BUG-007 is complete
  - **Status:** Pending
  - **Added:** 2025-11-21

- [ ] **Command:** Run BUG-002, BUG-003, and BUG-007
  - **Status:** Pending
  - **Added:** 2025-11-21
```

---

## 🔗 Related Files

- **Commands File:** `.github/AGENT_COMMANDS.md`
- **Parser Script:** `scripts/parse-natural-commands.ts`
- **Workflow:** `.github/workflows/execute-natural-commands.yml`
- **Swarm Manager:** `scripts/manager.ts`
- **Manual Start Guide:** `docs/SWARM_MANUAL_START_GUIDE.md`

---

## 💡 Tips

1. **Be Specific:** Use exact task IDs and phase names from the roadmap
2. **One Command at a Time:** Start with one command, then add more
3. **Check Status:** Monitor GitHub Actions to see execution progress
4. **Use Examples:** Follow the format of the examples above
5. **Be Patient:** Commands execute within 5 minutes (or immediately on push)

---

**Last Updated:** November 21, 2025

