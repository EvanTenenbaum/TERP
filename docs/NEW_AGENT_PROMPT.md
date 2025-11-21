# 🚨 MANDATORY PROMPT FOR ALL TERP AGENTS (v4.0)

**Objective:** To ensure every agent strictly follows the TERP workflow system for every task, including integrated testing protocols.

---

## 📋 PHASE 1: PRE-FLIGHT CHECK (MANDATORY)

**Before you start, you MUST complete this checklist.**

1.  **Repo & Workflow Check:**
    - `[ ]` I am inside the TERP repository.
    - `[ ]` I have read `docs/QUICK_REFERENCE.md`.

2.  **Task Identification:**
    - **Option A: User provided a specific task ID**
      - `[ ]` I have reviewed the roadmap and identified the task.
      - `[ ]` I will use: `pnpm start-task "TASK_ID"`
    
    - **Option B: User gave an ad-hoc instruction**
      - `[ ]` The user said something like "Fix X" or "Add Y" without a task ID.
      - `[ ]` I will use: `pnpm start-task --adhoc "User's instruction"`
      - `[ ]` I will optionally add `--category bug|feature|performance|refactor|test|docs`

3.  **Conflict Check:**
    - `[ ]` I have read `docs/ACTIVE_SESSIONS.md` and verified my task does not conflict with active sessions.

4.  **Task Declaration:**
    - `[ ]` I have declared my task: "I will now work on [TASK_ID]: [Task Name]"

**You may not proceed until all checklist items are complete.**

---

## 🚀 PHASE 2: SESSION STARTUP & AUTOMATION

**Verify the following automated actions complete successfully.**

1.  **Session & Branch Creation:**
    - `[ ]` Session file created in `docs/sessions/active/`.
    - `[ ]` New Git branch created and checked out.

2.  **Roadmap Updates:**
    - `[ ]` `MASTER_ROADMAP.md` or `TESTING_ROADMAP.md` updated with your session ID.
    - `[ ]` `ACTIVE_SESSIONS.md` updated with your new session.
    - `[ ]` All changes have been committed and pushed to GitHub.

**Report any failures immediately.**

---

## 💻 PHASE 3: DEVELOPMENT & TESTING

**Follow these protocols strictly.**

### If Your Task is FEATURE DEVELOPMENT (from MASTER_ROADMAP):

1.  **Write Code (TDD):**
    - Follow Test-Driven Development: Write a failing test, then write code to make it pass.

2.  **Create Test Task:**
    - **MANDATORY:** After writing the feature code, you MUST create a corresponding test task.
    - **Action:** Add a new task to `docs/roadmaps/TESTING_ROADMAP.md`.
    - **Link:** Link the test task to your feature ID.
    - **Status:** Set test task status to `Not Started`.

3.  **Update Feature Test Status:**
    - **Action:** In `MASTER_ROADMAP.md`, update your feature's `Test Status` to `⚪ Untested`.

4.  **Commit & Deploy for Review:**
    - Commit all changes (code, tests, and roadmap updates) to your feature branch.
    - Push to GitHub to trigger deployment for review.

### If Your Task is TEST DEVELOPMENT (from TESTING_ROADMAP):

1.  **Write Tests:**
    - Write the tests as defined in the test task scope.

2.  **Run Tests & Check Coverage:**
    - Run `pnpm test` and verify all tests pass.
    - Check code coverage. If below 80%, add more tests.

3.  **Update Test & Feature Status:**
    - **Action:** In `TESTING_ROADMAP.md`, update your test task's status to `✅ Tested`.
    - **Action:** In `MASTER_ROADMAP.md`, find the linked feature and update its `Test Status` to `✅ Fully Tested`.

4.  **Update Coverage Map:**
    - **Action:** Run the coverage update script to refresh `docs/roadmaps/TEST_COVERAGE_MAP.md`.

5.  **Commit & Push:**
    - Commit all roadmap and coverage map updates.

### If Your Task is LIVE QA (User Command: "live qa"):

1.  **Load QA Prompt:** Read `docs/agent_prompts/live_qa/live_qa_prompt.md`.
2.  **Follow QA Workflow:** Execute the 4-phase QA process defined in the template.
3.  **Deliver Report:** Provide a comprehensive QA report and update `QA_TASKS_BACKLOG.md`.

---

## ✅ PHASE 4: COMPLETION & MERGE

**Before merging, you MUST complete this final checklist.**

1.  **User Approval:**
    - `[ ]` User has approved the changes on the preview URL.

2.  **Final Checks:**
    - `[ ]` All tests pass (`pnpm test`).
    - `[ ]` No linting or type errors (`pnpm check`).

3.  **Test Status Check (Pre-Merge Gate):**
    - `[ ]` I have verified the feature's `Test Status` in `MASTER_ROADMAP.md`.
    - **If `⚪ Untested` or `🟡 Partially Tested`:** WARN the user before merging.
    - **If `🔴 Tests Failing`:** BLOCK the merge.
    - **If `✅ Fully Tested`:** Proceed with merge.

4.  **Merge to Main:**
    - `[ ]` I have merged my branch into `main`.

5.  **Final Roadmap & Session Updates:**
    - `[ ]` `MASTER_ROADMAP.md` or `TESTING_ROADMAP.md` task marked as `[x] Completed`.
    - `[ ]` Session file moved to `docs/sessions/completed/`.
    - `[ ]` All changes committed and pushed to GitHub.

6.  **Final Report:**
    - `[ ]` I have provided a final summary report to the user.

**Your task is not complete until all items in this checklist are done.**
