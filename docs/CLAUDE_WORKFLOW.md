# TERP Workflow Guide (v2.0)

## The Perfect System for Working with AI Agents on TERP

**Version:** 2.1
**Last Updated:** November 30, 2025

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

### Step 5: Deployment Log Tracking (MANDATORY)

- **🚨 CRITICAL:** After every deployment, agents MUST track logs to verify success.
- **If deployment fails:** Investigate logs immediately, fix issues, and redeploy.
- **Never report completion** without verifying deployment succeeded via logs.

**Required Actions:**

1. Monitor build logs: `./scripts/terp-logs.sh build --follow`
2. Monitor deploy logs: `./scripts/terp-logs.sh deploy --follow`
3. Check runtime logs for errors: `./scripts/terp-logs.sh run 100 | grep -i "error"`
4. Verify application is healthy (no crashes, no critical errors)
5. Document any deployment issues in session notes

**See:** `docs/LOGGING_ACCESS_GUIDE.md` for complete log access instructions.

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

---

## Mandatory QA Gate for Master Test Suite

**A new, mandatory QA gate is now in effect for all features covered by the Master Test Suite (TS-001 to TS-15).**

No feature from the Master Test Suite can be marked 'Done' or considered complete without passing its specific verification steps as defined in the `EXHAUSTIVE_INTERACTION_PROTOCOLS.md` document.

**Reference**: [EXHAUSTIVE_INTERACTION_PROTOCOLS.md](./testing/EXHAUSTIVE_INTERACTION_PROTOCOLS.md)

---

## Code Quality Guidelines

Every session should improve the codebase, not just add to it. Actively refactor code you encounter, even outside your immediate task scope.

- **DRY**: Consolidate duplicate patterns into reusable functions after the 2nd occurrence
- **Clean**: Delete dead code immediately (unused imports, functions, variables, commented code)
- **Leverage**: Use battle-tested packages over custom implementations
- **Readable**: Maintain comments and clear naming—don't sacrifice clarity for LoC

Leave the code cleaner than you found it: fewer LoC through better abstractions.


---

## 🔐 DigitalOcean API Token Management

**Issue:** DigitalOcean API tokens in documentation may be expired or invalid.

**Protocol for Agents:**

### When DigitalOcean CLI Access is Needed

1. **Check for valid token:**
   ```bash
   doctl auth init -t $DIGITALOCEAN_API_TOKEN
   ```

2. **If authentication fails:**
   - **DO NOT** assume the token in documentation is valid
   - **DO NOT** attempt to use expired tokens repeatedly
   - **DO** request a new token from the user
   - **DO** offer alternative solutions (manual configuration via web console)

3. **Request token from user:**
   ```
   I need a valid DigitalOcean API token to configure the app via CLI.
   
   To get a token:
   1. Go to https://cloud.digitalocean.com/account/api/tokens
   2. Generate a new Personal Access Token with Write scope
   3. Provide the token (starts with dop_v1_)
   
   Alternatively, I can guide you through manual configuration in the DigitalOcean console.
   ```

4. **Alternative: Guide user through manual configuration**
   - Provide step-by-step instructions for DigitalOcean web console
   - Include exact variable names, values, and scopes
   - Link to the specific app settings page

### Security Best Practices

- **NEVER** commit DigitalOcean API tokens to the repository
- **ALWAYS** use environment variables or GitHub Secrets
- **DOCUMENT** the process of obtaining tokens, not the tokens themselves
- **ROTATE** tokens regularly for security

### Reference Documentation

See `docs/DIGITALOCEAN_API_TOKEN_ISSUE.md` for complete details on:
- Why tokens expire
- How to obtain new tokens
- Alternative methods when tokens are unavailable
- Security best practices
