# TERP Roadmap System - GitHub-Native Design V3.2 (FINAL)

**Date:** 2025-11-13  
**Version:** 3.2 (Production Ready)  
**Status:** Final Design - Incorporates Expert & Adversarial QA

**Constraint:** Must work for ANY AI agent (Claude.ai, ChatGPT, Cursor, etc.) using ONLY GitHub.

**Changes from V3.1:**

- ✅ **CRITICAL FIX:** Implemented atomic session registration to prevent race conditions.
- ✅ **CRITICAL FIX:** Added `CODEOWNERS` for mandatory reviews on roadmap changes.
- ✅ **CRITICAL FIX:** Added automated prompt safety scanning for dangerous commands.
- ✅ **CRITICAL FIX:** Implemented auto-cleanup for stale/zombie sessions.
- ✅ **CRITICAL FIX:** Enhanced validation to check for invalid dependencies.
- ✅ Added new `review` status for tasks with open PRs.
- ✅ Added automated validation for commands and links in prompts.
- ✅ Added check for dependents before deprecating a task.
- ✅ Added a formal `HOW_TO_ABORT_TASK.md` workflow.
- ✅ Added repository security guide and permissions checks.

---

## 🎯 Core Principle: GitHub is the Source of Truth

This entire system is designed to be **100% platform-agnostic and self-contained within a GitHub repository.** It requires no external tools, services, or specific AI agent capabilities. Any AI agent with basic Git and file system access can clone the repository and immediately become a productive contributor, guided by a system of documentation, templates, and automated enforcement.

**The agent's journey begins here:**

1.  Clone `https://github.com/EvanTenenbaum/TERP`
2.  Read `.claude/AGENT_ONBOARDING.md`
3.  Follow the documented workflows to execute tasks.

---

## 🏗️ System Architecture: The Four Layers

The system is built on four layers of control, moving from high-level guidance to strict, automated enforcement.

| Layer | Component         | Description                                                 | Purpose                                                             |
| :---- | :---------------- | :---------------------------------------------------------- | :------------------------------------------------------------------ |
| **1** | **Documentation** | The `MASTER_ROADMAP.md` and workflow guides.                | The human- and AI-readable source of truth for all tasks.           |
| **2** | **Prompts**       | Self-contained, versioned markdown files for each task.     | Provides exact, step-by-step instructions for task execution.       |
| **3** | **Workflows**     | Standard Operating Procedures (SOPs) for all major actions. | Ensures consistency for adding, aborting, or deprecating tasks.     |
| **4** | **Enforcement**   | GitHub-native features like branch protection and Actions.  | Provides automated, non-bypassable guardrails to ensure compliance. |

### Layer 1: The Master Roadmap

**Location:** `docs/roadmaps/MASTER_ROADMAP.md`

This is the central hub. It is archived periodically to keep it lean, with completed and deprecated tasks moved to separate files.

**Key Features in V3.2:**

- **New `review` Status:** Tasks with an open PR are marked as `status: review`, preventing other agents from picking them up and providing a clearer state.
- **Granular Modules:** The `Module` field now encourages specifying exact file paths (e.g., `server/db/schema/users.ts`) instead of just directories to prevent false-positive conflicts.
- **Task Statuses:** `ready`, `in-progress`, `review`, `blocked`, `complete`, `deprecated`, `reverted`.

```markdown
# TERP Master Roadmap

**Last Updated:** 2025-11-13

## 🚀 Ready for Deployment

### ST-007: Implement System-Wide Pagination

**Status:** ready
**Priority:** HIGH
**Module:** `server/routers/`
**Dependencies:** None
**Prompt:** [📄 docs/prompts/ST-007.md](../prompts/ST-007.md)

## review: Awaiting PR Approval

### ST-005: Add Missing Database Indexes

**Status:** review
**Priority:** HIGH
**Module:** `server/db/schema/`
**PR:** #123
**Session File:** [docs/sessions/active/Session-2025-11-13-002.md](...)
```

### Layer 2: Self-Contained Prompts

**Location:** `docs/prompts/ST-XXX.md`

Each prompt is a complete, standalone guide to executing a task, now with enhanced safety and validation.

**Key Features in V3.2:**

- **Atomic Session Registration:** The pre-flight check now includes a critical, atomic step to register a session, preventing race conditions where two agents might start the same task.
- **Permissions Check:** A new step in the pre-flight check verifies the agent has push access before starting work.
- **Safety & Validation:** Prompts are automatically scanned for dangerous commands (`rm -rf`, `DROP DATABASE`, etc.) and stale commands/links.

````markdown
<!-- METADATA (for validation) -->
<!-- TASK_ID: ST-005 -->
<!-- PROMPT_VERSION: 1.1 -->
<!-- LAST_VALIDATED: 2025-11-13 -->

## Phase 1: Pre-Flight Check

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

**This step prevents race conditions. Follow it exactly.**

1.  `git pull origin main` (to get the latest `ACTIVE_SESSIONS.md`)
2.  Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3.  If clear, add your session to the file.
4.  Commit and push **immediately**:
    ```bash
    git add docs/ACTIVE_SESSIONS.md
    git commit -m "Register session for ST-005"
    git push origin main
    ```
5.  **If the push fails due to a conflict, another agent registered first.** STOP, pull again, and re-evaluate. Do not proceed until your session is successfully pushed to `main`.

### Step 1.5: Verify Permissions

Test your push access before starting work:
`git push --dry-run origin main`
If this command fails, you do not have the required permissions. STOP and ask the user for write access to the repository.
````

### Layer 3: Documented Workflows

**Location:** `docs/HOW_TO_*.md`

These are the official SOPs for managing the roadmap. They guide agents through complex processes, ensuring consistency.

**Key Additions in V3.2:**

- `docs/HOW_TO_ABORT_TASK.md`: A clear workflow for an agent to safely stop a task, clean up its session files, and reset the roadmap status.
- `docs/HOW_TO_DEPRECATE_TASK.md` is updated to include a mandatory check for dependent tasks, preventing broken dependency chains.

### Layer 4: GitHub-Native Enforcement

This is the most critical layer, providing automated, non-bypassable guardrails.

**Key Features in V3.2:**

- **.github/CODEOWNERS:** Changes to the roadmap, prompts, or workflows now require approval from designated maintainers, preventing unauthorized or un-reviewed modifications.
  ```
  # All roadmap, prompt, and workflow changes require review
  docs/roadmaps/ @EvanTenenbaum
  docs/prompts/ @EvanTenenbaum
  docs/HOW_TO_*.md @EvanTenenbaum
  ```
- **Required GitHub Actions (`.github/workflows/roadmap-validation.yml`):** The validation workflow is now mandatory and includes new, powerful checks.

| Validation Script         | Purpose                                                                     | Fixes Addressed |
| :------------------------ | :-------------------------------------------------------------------------- | :-------------- |
| `validate-roadmap.js`     | Ensures all tasks have required fields and valid dependencies.              | Attack #10      |
| `check-circular-deps.js`  | Detects circular dependencies within the current branch and against `main`. | Attack #6       |
| `validate-prompts.js`     | Checks for prompt staleness, length, and valid commands/links.              | Attack #7, #9   |
| `check-secrets.js`        | Scans prompts for accidentally committed secrets.                           | Edge Case #14   |
| `check-prompt-safety.js`  | **(New)** Scans for dangerous commands (`rm -rf`, etc.).                    | Attack #5       |
| `clean-stale-sessions.js` | **(New)** Runs daily to automatically clean up abandoned sessions.          | Attack #8       |

- **Branch Protection:** `main` branch protection is configured to be non-bypassable, even by admins, without a documented override process. It requires all status checks (including the validation workflow) to pass and at least one review from a `CODEOWNER`.

---

## 🔒 Hardened Security & Edge Case Handling

The V3.2 design incorporates all findings from the adversarial QA, resulting in a more resilient and secure system.

**Key Security Enhancements:**

1.  **Atomic Operations:** Race conditions during session registration and roadmap updates are mitigated by a strict `pull -> edit -> commit -> push` sequence, with failure handling.
2.  **Malicious Code Prevention:** Automated scanning for dangerous commands in prompts and mandatory PR reviews from `CODEOWNERS` provide strong defenses against malicious code injection.
3.  **Access Control:** The combination of branch protection, `CODEOWNERS`, and GitHub's native secret scanning creates a robust, multi-layered security posture.

**Key Edge Cases Handled:**

1.  **Zombie Sessions:** A daily GitHub Action now automatically archives session files that haven't been updated in over 24 hours, preventing them from blocking modules indefinitely.
2.  **Rejected PRs:** The new `review` status accurately reflects the state of a task, preventing it from being considered `complete` until the PR is actually merged.
3.  **Task Aborts:** Agents now have a clear, documented protocol for safely aborting a task and cleaning up the repository state.

---

## 📁 Final File Structure

The file structure is organized for clarity and discoverability.

```
TERP/
├── .github/
│   ├── CODEOWNERS                      # NEW: Mandatory reviewers
│   └── workflows/
│       └── roadmap-validation.yml        # Required GitHub Actions
├── .claude/
│   └── AGENT_ONBOARDING.md               # Entry point for all agents
├── docs/
│   ├── roadmaps/
│   │   ├── MASTER_ROADMAP.md             # Active & ready tasks
│   │   ├── COMPLETED_TASKS.md            # Archive
│   │   └── DEPRECATED_TASKS.md           # Archive
│   ├── prompts/                          # All task prompts
│   ├── sessions/                         # Session tracking
│   ├── completion-reports/               # Post-task summaries
│   ├── templates/                        # All official templates
│   ├── HOW_TO_ADD_TASK.md                # SOPs for core workflows
│   ├── HOW_TO_DEPRECATE_TASK.md
│   ├── HOW_TO_ROLLBACK.md
│   ├── HOW_TO_ABORT_TASK.md              # NEW: Abort workflow
│   ├── ROADMAP_SYSTEM_OVERVIEW.md        # Human-friendly guide
│   └── REPOSITORY_SECURITY.md            # NEW: Security policies
├── scripts/
│   ├── validate-roadmap.js               # All validation scripts
│   ├── check-circular-deps.js
│   ├── validate-prompts.js
│   ├── check-secrets.js
│   ├── check-prompt-safety.js            # NEW: Safety scanner
│   └── clean-stale-sessions.js           # NEW: Zombie session cleaner
└── README.md                              # Points agents to onboarding
```

---

## ✅ Final Verification

This V3.2 design has been systematically verified against all user requirements, expert QA feedback, and adversarial QA attacks. It represents a production-ready, secure, and platform-agnostic system for managing a complex roadmap with a distributed team of AI agents.

**The system is now ready for implementation.**
