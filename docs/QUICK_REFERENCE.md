# TERP Quick Reference v3.0 (Ironclad Edition)

---

## 🚀 Core Workflow

**The only command you need to start work is `pnpm start-task`**

### Planned Tasks
```bash
# Work on a task from the roadmap
pnpm start-task "FEAT-001"
```

### Ad-Hoc Tasks
```bash
# Fix a bug on the fly
pnpm start-task --adhoc "Fix login button" --category bug

# Add a new feature on the fly
pnpm start-task --adhoc "Add dark mode" --category feature
```

---

## 🚨 Troubleshooting

### "Commit blocked: Invalid branch name"
- **Cause:** You didn\'t use `pnpm start-task`.
- **Fix:** Create a new branch with `pnpm start-task` and move your changes.

### "Push blocked: Direct push to main"
- **Cause:** You tried to `git push origin main`.
- **Fix:** Use a Pull Request.

### "Merge blocked: Feature is untested"
- **Cause:** `Test Status` in `MASTER_ROADMAP.md` is not `✅ Fully Tested`.
- **Fix:** Complete tests, then update the roadmap.

### "Merge blocked: Hotfix bypass"
- **Cause:** You added `[HOTFIX]` to your PR title.
- **Fix:** This is not an error. This is a bypass for emergencies.

---

## 🗺️ Roadmap System

- **MASTER_ROADMAP.md:** Tracks all features and their test status.
- **TESTING_ROADMAP.md:** Tracks all test tasks.
- **TEST_COVERAGE_MAP.md:** Visualizes test coverage.

---

## ✅ Live QA Workflow

- **Command:** `live qa`
- **Action:** Loads `docs/agent_prompts/live_qa/live_qa_prompt.md`
- **Outcome:** Comprehensive QA report in `QA_TASKS_BACKLOG.md`

---

## 🗂️ Ad-Hoc Categories

| Category      | Use Case                     |
|---------------|------------------------------|
| `bug`         | Fixing a bug                 |
| `feature`     | Adding new functionality     |
| `performance` | Optimizing code              |
| `refactor`    | Improving code structure     |
| `docs`        | Writing documentation        |
| `test`        | Adding or fixing tests       |
| `chore`       | Maintenance tasks (e.g., CI) |

---

##  Git Hooks & Automation

- **Pre-commit:** Checks branch name, `any` types, file size, credentials.
- **Pre-push:** Blocks push to `main` and invalid branches.
- **Pre-merge (GitHub):** Blocks merge of untested code.
