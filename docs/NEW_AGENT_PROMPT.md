# 🚨 MANDATORY PROMPT FOR ALL TERP DEVELOPMENT AGENTS (v3.0)

**Objective:** To ensure every agent strictly follows the TERP workflow system for every task. This prompt must be used at the start of every new development session.

---

## 📋 PHASE 1: PRE-FLIGHT CHECK (MANDATORY)

**Before you write a single line of code, you MUST complete this checklist.**

1.  **Clone the Repo (if first time):**
    - **Action:** `gh repo clone EvanTenenbaum/TERP && cd TERP`
    - **Confirmation:** `[ ] I am inside the TERP repository.`

2.  **Read the Quick Reference Guide:**
    - **Action:** Read `docs/QUICK_REFERENCE.md`.
    - **Purpose:** To refresh your memory on the 3-step workflow and the 4 files that matter.
    - **Confirmation:** `[ ] I have read and understood the Quick Reference Guide.`

3.  **Review the Master Roadmap:**
    - **Action:** Read `docs/roadmaps/MASTER_ROADMAP.md`.
    - **Purpose:** To identify the highest priority task in the "Current Sprint" that is marked as `(Unassigned)`.
    - **Confirmation:** `[ ] I have identified a high-priority, unassigned task from the Master Roadmap.`

4.  **Check Active Sessions:**
    - **Action:** Read `docs/ACTIVE_SESSIONS.md`.
    - **Purpose:** To ensure no other agent is currently working on the same module as your chosen task. If there is a conflict, choose a different task.
    - **Confirmation:** `[ ] I have verified that my chosen task does not conflict with any active sessions.`

5.  **Declare Your Task:**
    - **Action:** State the task you will be working on.
    - **Format:** "I will now work on the task: [Your Task Name from Roadmap]"
    - **Confirmation:** `[ ] I have declared the task I will be working on.`

**You may not proceed until all five checklist items are complete.**

---

## 🚀 PHASE 2: SESSION STARTUP & AUTOMATION

**Once you have declared your task, the system will automatically perform the following actions. You must verify they complete successfully.**

1.  **Session Creation:**
    - **Automation:** A unique `Session-ID` will be generated.
    - **Automation:** A new session file will be created at `docs/sessions/active/Session-[ID].md`.
    - **Verification:** Confirm that the session file has been created.

2.  **Branch Creation:**
    - **Automation:** A new Git branch will be created with the format `claude/task-slug-SESSION_ID`.
    - **Verification:** Confirm that you are on the new feature branch.

3.  **Roadmap Update:**
    - **Automation:** The `MASTER_ROADMAP.md` will be updated to mark your task as `[~] In progress (Claude-Session-ID)`.
    - **Automation:** The change will be committed and pushed to GitHub immediately.
    - **Verification:** Confirm that the roadmap has been updated on GitHub.

4.  **Active Sessions Update:**
    - **Automation:** The `aggregate-sessions.sh` script will run to update `docs/ACTIVE_SESSIONS.md`.
    - **Automation:** The change will be committed and pushed to GitHub immediately.
    - **Verification:** Confirm that your new session is visible in the Active Sessions table on GitHub.

**Report any failures in this phase immediately. Do not proceed with failing automation.**

---

## 💻 PHASE 3: DEVELOPMENT (TDD & PUSH-TO-MAIN)

**Follow these protocols strictly during development.**

1.  **Test-Driven Development (TDD):**
    - **Requirement:** You MUST write a failing test _before_ writing implementation code. Follow the Red-Green-Refactor cycle.
    - **Requirement:** All new code must be covered by tests.

2.  **Code Quality:**
    - **Requirement:** Adhere to all quality standards defined in `CLAUDE_WORKFLOW.md` (no `any` types, no files over 500 lines, no N+1 queries, etc.).

3.  **Commit & Push Frequently:**
    - **Requirement:** Commit your changes with clear, conventional commit messages.
    - **Requirement:** Push to your feature branch frequently to back up your work.

4.  **Deployment for Review:**
    - **Action:** When your feature is ready for review, **push your feature branch to GitHub.**
    - **Automation:** The `deploy-and-monitor.ts` script will automatically deploy your feature branch to a unique preview URL.
    - **Requirement:** You MUST wait for the deployment to complete and report the preview URL to the user for testing.

---

## ✅ PHASE 4: COMPLETION & MERGE (MANDATORY CHECKLIST)

**Before you can report your task as "done," you MUST complete this final checklist.**

1.  **User Approval:**
    - **Requirement:** The user has tested the feature on the preview URL and given explicit approval (e.g., "Looks good, merge it").
    - **Confirmation:** `[ ] User has approved the changes.`

2.  **Final Checks:**
    - **Action:** Run `pnpm test` and `pnpm check` one last time.
    - **Confirmation:** `[ ] All tests are passing and there are zero TypeScript errors.`

3.  **Merge to Main:**
    - **Action:** Merge your feature branch into the `main` branch.
    - **Automation:** This will trigger the final production deployment, which will be monitored by the system.
    - **Confirmation:** `[ ] I have merged my branch into main.`

4.  **Update Roadmap:**
    - **Action:** Update the `MASTER_ROADMAP.md` to mark your task as `[x] Completed`.
    - **Automation:** Commit and push this change to GitHub.
    - **Confirmation:** `[ ] The Master Roadmap is updated.`

5.  **Update Session File:**
    - **Action:** Move your session file from `docs/sessions/active/` to `docs/sessions/completed/`.
    - **Automation:** Commit and push this change to GitHub.
    - **Confirmation:** `[ ] My session file has been archived.`

6.  **Final Report:**
    - **Action:** Provide a final summary report to the user, confirming that the task is complete, deployed, and all documentation has been updated.

**Your task is not complete until all items in this checklist are done.**
