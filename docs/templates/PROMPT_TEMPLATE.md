# [TASK_ID]: [TASK_TITLE]

<!-- METADATA (for validation) -->
<!-- TASK_ID: [TASK_ID] -->
<!-- TASK_TITLE: [TASK_TITLE] -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: YYYY-MM-DD -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** [TASK_ID]  
**Estimated Time:** [ESTIMATE]  
**Module:** [MODULE]

⚠️ **SECURITY WARNING**
- NEVER include real secrets in this prompt
- Use placeholders like: `YOUR_API_KEY_HERE`
- Secrets belong in `.env` file only

---

## 📋 Table of Contents

1. [Context](#context)
2. [Phase 1: Pre-Flight Check](#phase-1-pre-flight-check)
3. [Phase 2: Session Startup](#phase-2-session-startup)
4. [Phase 3: Development](#phase-3-development)
5. [Phase 4: Completion](#phase-4-completion)
6. [Quick Reference](#quick-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Context

**Background:**
[Provide a brief background of the task.]

**Goal:**
[State the primary goal of the task.]

**Success Criteria:**
- [Success criterion 1]
- [Success criterion 2]
- [Success criterion 3]

---

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-[DATE]-[NUMBER].md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your session details.

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

**This step prevents race conditions. Follow it exactly.**

1.  `git pull origin main` (to get the latest `ACTIVE_SESSIONS.md`)
2.  Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3.  If clear, add your session to the file.
4.  Commit and push **immediately**:
    ```bash
    git add docs/ACTIVE_SESSIONS.md
    git commit -m "Register session for [TASK_ID]"
    git push origin main
    ```
5.  **If the push fails due to a conflict, another agent registered first.** STOP, pull again, and re-evaluate. Do not proceed until your session is successfully pushed to `main`.

### Step 1.3: Verify Environment

Run these commands:
```bash
node --version
pnpm --version
git status
```

### Step 1.4: Verify Permissions

Test your push access before starting work:
`git push --dry-run origin main`
If this command fails, you do not have the required permissions. STOP and ask the user for write access to the repository.

---

## Phase 2: Session Startup

**Objective:** Set up your workspace and update the roadmap.

### Step 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b [TASK_ID]-feature-branch
```

### Step 2.2: Update Roadmap Status

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Change the status of your task to `in-progress`.

### Step 2.3: Update Session File Progress

Update your session file with your progress.

---

## Phase 3: Development

**Objective:** Complete the task following TDD.

[Provide specific, step-by-step instructions for the development phase.]

---

## Phase 4: Completion

**Objective:** Finalize your work and submit it for review.

### Step 4.1: Verify All Deliverables

Ensure all deliverables listed in the roadmap have been completed.

### Step 4.2: Create Completion Report

Use the template at `docs/templates/COMPLETION_REPORT_TEMPLATE.md`.

### Step 4.3: Update Roadmap to `review`

Change the status of your task to `review` in `docs/roadmaps/MASTER_ROADMAP.md`.

### Step 4.4: Update ACTIVE_SESSIONS.md

Mark your session as complete.

### Step 4.5: Create Pull Request

Create a pull request from your feature branch to `main`.

### Step 4.6: Notify User

Inform the user that the task is complete and the PR is ready for review.

---

## ⚡ Quick Reference

[Add any relevant commands or file paths here.]

---

## 🆘 Troubleshooting

[Add any potential issues and their solutions here.]
