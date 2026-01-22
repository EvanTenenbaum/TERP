# Agent Prompt v5.0 (Ironclad Edition)

**Objective:** To ensure all development work is tracked, tested, and follows established protocols.

---

## 🚨 CRITICAL: YOU MUST FOLLOW THIS WORKFLOW 🚨

This system uses **technical enforcement**, not just instructions. If you do not follow this workflow, your commits and pull requests will be **BLOCKED**.

---

## ✅ Verification Over Persuasion (Mandatory)

No change is correct unless **verified** through deterministic checks.

**Choose a mode (escalate if unsure):**

- **SAFE MODE**: isolated, low-risk changes → targeted tests + typecheck
- **STRICT MODE** (default): shared/core logic, DB interactions, UI flows → full verification loop
- **RED MODE**: auth/RBAC, payments, migrations, integrations → adversarial tests + E2E + rollback plan

**Definition of Done requires** lint, typecheck, tests, build, and E2E (when UI flows change).  
Read: `.kiro/steering/08-adaptive-qa-protocol.md`
STRICT/RED mode requires a **Redhat QA-style self-review** before completion.

### 🔴 MANDATORY: Use Gemini API for Code Generation

**IF YOU ARE ON THE MANUS PLATFORM, YOU MUST USE GEMINI API FOR:**

1. **All code generation** - Writing new code, refactoring, creating scripts
2. **Complex reasoning** - Multi-step analysis, architectural decisions
3. **Bulk operations** - Processing multiple files, generating tests

```python
import os
from google import genai
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
MODEL_ID = "gemini-2.0-flash-exp"
```

**Full instructions:** `docs/GEMINI_API_USAGE.md`

**This is non-negotiable.** Do not write code manually when Gemini can generate it.

---

### The Golden Rule: Always Start with `pnpm start-task`

This is the **only** way to begin work. Do not use `git checkout -b` manually.

---

## Workflow

### Step 1: Analyze User Request

- **Is it a planned task with an ID?** (e.g., "Work on FEAT-001")
- **Is it an ad-hoc task without an ID?** (e.g., "Fix the login bug")

### Step 2: Start the Task

#### Option A: Planned Task

```bash
# Example: User says "Work on FEAT-001"
pnpm start-task "FEAT-001"
```

#### Option B: Ad-Hoc Task

```bash
# Example: User says "Fix the login bug"
pnpm start-task --adhoc "Fix login bug" --category bug
```

**What this script does:**

- Auto-generates a task ID (for ad-hoc tasks)
- Adds the task to the roadmap
- Creates a Git branch with the correct name
- Creates a session file
- Commits and pushes everything to GitHub

### Step 3: Write Code

- Implement the feature or fix the bug.
- Write tests for your code.
- Select SAFE/STRICT/RED mode and follow its verification requirements.

### Step 4: Commit Your Work

```bash
git add .
git commit -m "feat: add login functionality"
```

**What happens:** The `pre-commit` hook runs automatically and checks:

- Branch name format
- For new `any` types
- For large files
- For hardcoded credentials

If any check fails, your commit will be **BLOCKED**. Read the error message to fix it.

**Before declaring done, you MUST run:**

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm test:e2e   # when UI/business flows change
```

If any required command cannot run, mark verification as **UNSURE** and provide a local/CI plan. Do **not** claim correctness.

### Step 5: Push Your Work

```bash
git push
```

**What happens:** The `pre-push` hook runs automatically and checks:

- You are not pushing to `main`
- Your branch name is valid

If any check fails, your push will be **BLOCKED**.

### Step 6: Create a Pull Request

- Go to GitHub and create a pull request to merge your branch into `main`.

**What happens:** The `pre-merge.yml` GitHub Action runs automatically and checks:

- The `Test Status` of your task in the roadmap

If the status is not `✅ Fully Tested`, your merge will be **BLOCKED**.

### Step 7: Monitor Deployment Logs (MANDATORY)

**🚨 CRITICAL:** After your PR is merged and deployment starts, you MUST track logs.

```bash
# Monitor build logs
./scripts/terp-logs.sh build --follow

# Monitor deploy logs
./scripts/terp-logs.sh deploy --follow

# Check for runtime errors
./scripts/terp-logs.sh run 100 | grep -i "error"
```

**Required Actions:**

1. Watch deployment complete successfully
2. Verify no errors in runtime logs
3. Test the deployed feature in production
4. Document any issues in session notes

**If deployment fails:**

- Investigate logs immediately
- Fix the issue
- Create a hotfix PR with `[HOTFIX]` in title

**Never report task completion without verifying deployment succeeded.**

**See:** `docs/LOGGING_ACCESS_GUIDE.md` for complete instructions.

---

## Troubleshooting

### "Commit blocked: Invalid branch name" (pre-commit)

- **Cause:** You created your branch manually.
- **Fix:** Use `pnpm start-task` to create a proper branch.

### "Push blocked: Direct push to main is not allowed" (pre-push)

- **Cause:** You are trying to push directly to `main`.
- **Fix:** Create a feature branch with `pnpm start-task` and use a PR.

### "Merge blocked: Feature is untested" (GitHub Action)

- **Cause:** The `Test Status` for your task in `MASTER_ROADMAP.md` is not `✅ Fully Tested`.
- **Fix:**
  1. Complete all required tests.
  2. Update the `Test Status` in `MASTER_ROADMAP.md` to `✅ Fully Tested`.
  3. Commit and push the change.

### "Merge blocked: Could not extract Task ID" (GitHub Action)

- **Cause:** Your branch name is incorrect.
- **Fix:** Re-create your branch using `pnpm start-task`.

---

## Ad-Hoc Task Categories

When using `pnpm start-task --adhoc`, use the `--category` flag to classify your work:

| Category      | Use Case                     |
| ------------- | ---------------------------- |
| `bug`         | Fixing a bug                 |
| `feature`     | Adding new functionality     |
| `performance` | Optimizing code              |
| `refactor`    | Improving code structure     |
| `docs`        | Writing documentation        |
| `test`        | Adding or fixing tests       |
| `chore`       | Maintenance tasks (e.g., CI) |

---

## Conclusion

This system is designed to be **self-enforcing**. The easiest way to work is to follow the protocol. The system will guide you through the process.

**Your primary command is `pnpm start-task`. Use it for everything.**
