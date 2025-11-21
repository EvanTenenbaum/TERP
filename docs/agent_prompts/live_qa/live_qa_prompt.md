# 🚨 MANDATORY PROMPT FOR LIVE PRODUCTION SITE QA AGENTS (v2.0)

**Objective:** To systematically test assigned modules on the live production site, identify all bugs and UI/UX issues, and report them in a structured format for the development team. This prompt ensures a rigorous, repeatable, and effective QA process.

---

## 📋 PHASE 1: PRE-FLIGHT CHECK (MANDATORY)

**Before you begin testing, you MUST complete this checklist.**

1.  **Clone the Repo (if first time):**
    -   **Action:** `gh repo clone EvanTenenbaum/TERP && cd TERP`
    -   **Confirmation:** `[ ] I am inside the TERP repository.`

2.  **Read the Workflow & Protocol Guides:**
    -   **Action:** Read `docs/CLAUDE_WORKFLOW.md` and `docs/QUICK_REFERENCE.md`.
    -   **Purpose:** To understand the overall development and QA workflow.
    -   **Confirmation:** `[ ] I have read and understood the core workflow documents.`

3.  **Identify Your Assigned Modules:**
    -   **Action:** Review the `MASTER_ROADMAP.md` to identify the QA task assigned to you (e.g., "QA-Inventory-Module").
    -   **Purpose:** To define the exact scope of your testing session.
    -   **Confirmation:** `[ ] I have identified my assigned modules from the Master Roadmap.`

4.  **Check Active Sessions:**
    -   **Action:** Read `docs/ACTIVE_SESSIONS.md`.
    -   **Purpose:** To ensure no other QA agent is currently testing the same modules.
    -   **Confirmation:** `[ ] I have verified that my assigned modules do not conflict with any active QA sessions.`

5.  **Verify Production Site Access:**
    -   **Action:** Navigate to the production URL: [https://terp-app-b9s35.ondigitalocean.app](https://terp-app-b9s35.ondigitalocean.app)
    -   **Purpose:** To ensure the live site is accessible.
    -   **Confirmation:** `[ ] I have successfully accessed the live production site.`

6.  **Verify Test Data Availability (CRITICAL):**
    -   **Action:** Browse key modules (e.g., Inventory, Orders, Clients) to confirm they are populated with realistic data.
    -   **Purpose:** To ensure testing is performed against representative data, not an empty database.
    -   **If Missing:** STOP and report that test data needs to be seeded before QA can proceed.
    -   **Confirmation:** `[ ] I have verified that test data is available and realistic.`

7.  **Verify Testing Environment:**
    -   **Browser:** Use Chrome/Chromium for consistency.
    -   **Action:** Open browser DevTools (F12) and keep the **Console** and **Network** tabs visible.
    -   **Purpose:** To monitor for JavaScript errors and slow network requests during testing.
    -   **Confirmation:** `[ ] I have DevTools open and ready.`

8.  **Declare Your QA Session:**
    -   **Action:** State the QA task you will be working on.
    -   **Format:** "I will now begin QA testing for the task: [Your QA Task Name from Roadmap]"
    -   **Confirmation:** `[ ] I have declared the QA task I will be working on.`

**You may not proceed until all eight checklist items are complete.**

---

## 🚀 PHASE 2: SESSION STARTUP & AUTOMATION

**Once you have declared your task, the system will automatically perform the following actions. You must verify they complete successfully.**

1.  **Session Creation:**
    -   **Automation:** A unique `Session-ID` will be generated for your QA session.
    -   **Automation:** A new session file will be created at `docs/sessions/active/QA-Session-[ID].md`.
    -   **Verification:** Confirm that the QA session file has been created.

2.  **Roadmap Update:**
    -   **Automation:** The `MASTER_ROADMAP.md` will be updated to mark your QA task as `[~] In progress (QA-Session-ID)`.
    -   **Automation:** The change will be committed and pushed to GitHub immediately.
    -   **Verification:** Confirm that the roadmap has been updated on GitHub.

3.  **Active Sessions Update:**
    -   **Automation:** The `aggregate-sessions.sh` script will run to update `docs/ACTIVE_SESSIONS.md`.
    -   **Automation:** The change will be committed and pushed to GitHub immediately.
    -   **Verification:** Confirm that your new QA session is visible in the Active Sessions table on GitHub.

**Report any failures in this phase immediately. Do not proceed with failing automation.**

---

## 💻 PHASE 3: SYSTEMATIC TESTING & ISSUE LOGGING

**Your primary goal is to be skeptical and thorough. Assume things are broken. Your objective is to find every single issue within your assigned modules.**

### Testing Methodology

For each assigned module, you will perform the following tests in order. Use this as a checklist for each module.

-   [ ] **1. Smoke Testing:**
    -   Does the module load? Or does it 404?
    -   Are the main components visible?
    -   Is there any obvious placeholder text (e.g., "Lorem Ipsum", "TODO")?

-   [ ] **2. Functional Testing:**
    -   Click every single button, link, tab, and interactive element.
    -   Fill out and submit every form with both valid and invalid data.
    -   Test all sorting, filtering, and search functionalities.
    -   Verify that actions (create, update, delete) work as expected and data is persistent.
    -   Check for broken or unresponsive elements.

-   [ ] **3. UI/UX Verification:**
    -   Does the UI match the design system (`TERP_DESIGN_SYSTEM.md`)?
    -   Are there any visual glitches, alignment issues, or overlapping elements?
    -   Is the user experience intuitive?
    -   Test on different screen sizes (mobile, tablet, desktop) using browser DevTools.
    -   Test keyboard navigation (Tab, Enter, Escape keys) and check for visible focus indicators.

-   [ ] **4. Data Integrity Testing:**
    -   Does the UI display data correctly? (e.g., tables, charts, metrics)
    -   Are there "No data found" messages where data is expected?
    -   Verify that calculations and aggregations are correct.

-   [ ] **5. Performance Testing:**
    -   Check page load times (should be < 3 seconds).
    -   Identify slow API calls (> 1 second) or large asset downloads in the Network tab.
    -   Report any pages that feel sluggish or unresponsive.

-   [ ] **6. Error Handling & Security:**
    -   Try to trigger error states (e.g., invalid form inputs).
    -   Verify error messages are user-friendly.
    -   Check for any errors logged in the browser Console.
    -   Verify authentication is required for all sensitive areas.

-   [ ] **7. Regression Testing:**
    -   Review recently fixed bugs in `QA_TASKS_BACKLOG.md` related to your modules.
    -   Verify that these fixes are still working correctly.

### Issue Logging Protocol

**For EVERY issue you find, you MUST log it immediately in a local markdown file named `QA_REPORT_[Session-ID].md`.**

**Screenshot Capture Instructions:**
-   Save screenshots to: `/home/ubuntu/TERP/qa_screenshots/[Session-ID]/`
-   Name format: `[Module]-[Issue-Number]-[Description].png` (e.g., `inventory-001-broken-export-button.png`)

Use the following template for each issue:

```markdown
---

### QA-XXX: [Concise Bug Title]

**Type:** Bug / UI-UX / Performance / Data / Security
**Priority:** P0-Critical / P1-High / P2-Medium / P3-Low
**Status:** Not Started
**Module:** [Module Name]

**Description:**
[Clear and detailed description of the issue.]

**Impact:**
[Business/user impact - what's broken? who is affected?]

**Steps to Reproduce:**
1.  Go to [Page URL]
2.  Click on [Button/Element]
3.  Observe that [Issue occurs]

**Actual Behavior:**
[What actually happened.]

**Expected Behavior:**
[What should have happened.]

**Screenshot:**
![Screenshot](../../qa_screenshots/[Session-ID]/filename.png)

**Estimated Effort:** [e.g., 2-4 hours / 4-8 hours]
```

---

## ✅ PHASE 4: REPORTING & COMPLETION

**Once you have thoroughly tested all assigned modules, you will finalize and submit your report.**

1.  **Finalize QA Report:**
    -   **Action:** Review your `QA_REPORT_[Session-ID].md` file. Ensure all issues are logged correctly and screenshots are attached.
    -   **Action:** Add a summary at the top of the report with the total number of issues found and their priority distribution.

2.  **Create New Tasks in Backlog:**
    -   **Action:** For each issue in your report, create a corresponding task in the `docs/roadmaps/QA_TASKS_BACKLOG.md` file.
    -   **Requirement:** Follow the exact format of existing tasks in that file and assign a unique `QA-XXX` ID.

3.  **Commit and Push Report & Backlog:**
    -   **Action:** Commit your `QA_REPORT_[Session-ID].md` file and any screenshots.
    -   **Action:** Commit your updates to `docs/roadmaps/QA_TASKS_BACKLOG.md`.
    -   **Action:** Push these changes to the `main` branch.

4.  **Update Roadmap:**
    -   **Action:** Update the `MASTER_ROADMAP.md` to mark your QA task as `[x] Completed`.
    -   **Automation:** Commit and push this change to GitHub.
    -   **Confirmation:** `[ ] The Master Roadmap is updated.`

5.  **Update Session File:**
    -   **Action:** Move your session file from `docs/sessions/active/` to `docs/sessions/completed/`.
    -   **Automation:** Commit and push this change to GitHub.
    -   **Confirmation:** `[ ] My QA session file has been archived.`

6.  **Final Report to User:**
    -   **Action:** Provide a final summary report to the user, confirming the QA session is complete and all findings have been logged in the `QA_TASKS_BACKLOG.md`.
    -   **Requirement:** Attach your detailed `QA_REPORT_[Session-ID].md` to the message.

**Your QA task is not complete until all items in this checklist are done.**
