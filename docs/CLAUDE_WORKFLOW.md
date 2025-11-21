# TERP Workflow Guide (v2.0)

## The Perfect System for Working with AI Agents on TERP

**Version:** 2.0
**Last Updated:** November 19, 2025

---

## Core Principle: Test-Driven Quality

TERP operates on a **test-first** principle. Every feature, fix, and component is tracked not just for its development status, but for its **test coverage**. This is managed through a **Testing Roadmap System** that is fully integrated into our development workflow.

---

## The Roadmap System: Two Halves of a Whole

### 1. MASTER_ROADMAP.md
- **What it tracks:** Features, bug fixes, infrastructure changes.
- **Key Field:** `Test Status` (⚪, 🟡, ✅, 🔴)

### 2. TESTING_ROADMAP.md
- **What it tracks:** Specific testing tasks (Unit, Integration, E2E, etc.).
- **Key Field:** `Linked Feature` (links back to MASTER_ROADMAP)

**These two roadmaps work together to provide a complete picture of project health.**

---

## The Development & Testing Cycle

### Step 1: Agent Picks a Task
- Agent can pick a **feature task** from `MASTER_ROADMAP.md` or a **testing task** from `TESTING_ROADMAP.md`.

### Step 2: Feature Development
- Agent writes code for the feature, following Test-Driven Development (TDD).
- **MANDATORY:** After completing the feature, the agent **creates a new test task** in `TESTING_ROADMAP.md` and links it to the feature.
- The feature is marked with `Test Status: ⚪ Untested` in `MASTER_ROADMAP.md`.

### Step 3: Test Development
- An agent (or the same agent) picks the newly created test task.
- Agent writes the tests.
- After tests are written and passing (with >80% coverage), the agent updates:
  - `TESTING_ROADMAP.md`: Marks test task as `✅ Tested`.
  - `MASTER_ROADMAP.md`: Updates linked feature to `Test Status: ✅ Fully Tested`.
  - `TEST_COVERAGE_MAP.md`: Updates the coverage statistics.

### Step 4: Deployment & Merge
- **Pre-Merge Gate:** Before merging, the agent checks the feature's `Test Status`.
  - **Untested/Partially Tested:** Warns the user.
  - **Tests Failing:** Blocks the merge.
  - **Fully Tested:** Proceeds with the merge.

---

## The Coverage Map: Visualizing Quality

**Location:** `docs/roadmaps/TEST_COVERAGE_MAP.md`

This file provides a real-time, at-a-glance view of test coverage across the entire application, broken down by:
- **Module** (Inventory, Orders, etc.)
- **User Flow** (Create Order, Vendor Intake, etc.)
- **Component** (Database, API, Auth, etc.)

It is **automatically updated** every time a testing task is completed, ensuring we always know where our testing gaps are.

---

## Bulk Test Generation

When you provide an **architecture map** or a list of user flows, the system will:
1. **Parse the document** to identify all modules, flows, and components.
2. **Automatically generate** hundreds of test tasks in `TESTING_ROADMAP.md`.
3. **Populate the `TEST_COVERAGE_MAP.md`** to show all newly identified areas as `⚪ Untested`.

This allows us to quickly build a comprehensive testing backlog from high-level design documents.

---

## Agent Protocols: The Rules of the Road

Our agent prompts (`NEW_AGENT_PROMPT_v4.md`) have been updated to enforce this system:

- **Feature agents** are now required to create test tasks.
- **Testing agents** are required to update all three roadmap files.
- **All agents** must respect the pre-merge quality gate.

This ensures the Testing Roadmap System is **self-maintaining** and requires **zero manual overhead**.

---

## Key Advantages

- **Visibility:** Test coverage is now a first-class citizen of the roadmap.
- **Accountability:** Untested code is explicitly flagged before it reaches production.
- **Automation:** The system maintains itself, freeing up human developers to focus on building.
- **Scalability:** The system can handle any number of features and tests.

This integrated testing roadmap is the cornerstone of our commitment to quality and reliability in the TERP project.
