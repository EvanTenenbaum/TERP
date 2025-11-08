# TERP Development Protocols

**Version:** 3.0  
**Last Updated:** November 7, 2025  
**Purpose:** Ensure systematic integration, production-ready code, and maintainable architecture throughout TERP development

---

## 🔑 Production & Testing Credentials

**CRITICAL**: These credentials are required for deployment monitoring and database access.

### Argos Visual Testing

**Token**: `argos_34b2c3e186f4849c6c401d8964014a201a`

**Use for**:

- Automated visual regression testing
- Uploading screenshots from E2E tests
- Approving or rejecting visual changes

### Digital Ocean API

**API Key**: `dop_v1_959274e13a493b3ddbbb95b17e84f521b4ab9274861e4acf145c27c7f0792dcd`

**Use for**:

- Monitoring deployment status
- Checking build logs
- Verifying application health
- Triggering deployments

### Using Digital Ocean CLI (doctl)

**Installation**:

```bash
cd /tmp && wget https://github.com/digitalocean/doctl/releases/download/v1.115.0/doctl-1.115.0-linux-amd64.tar.gz
tar xf doctl-1.115.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin/
```

**Authentication**:

```bash
doctl auth init -t dop_v1_959274e13a493b3ddbbb95b17e84f521b4ab9274861e4acf145c27c7f0792dcd
```

**Common Commands**:

```bash
# List apps
doctl apps list

# Get build logs (ALWAYS try this before asking for logs)
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --deployment <DEPLOYMENT_ID> --type build

# Get runtime logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run

# Trigger deployment
doctl apps create-deployment 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --force-rebuild

# Get deployment status
doctl apps get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4
```

**CRITICAL**: Always use API or CLI to get build/deployment logs. Never ask user for logs unless both API and CLI have been tried.

### Production Database

- **Host**: `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
- **Port**: `25060`
- **User**: `doadmin`
- **Password**: `AVNS_Q_RGkS7-uB3Bk7xC2am`
- **Database**: `defaultdb`
- **SSL Mode**: `REQUIRED`

**Connection String**:

```bash
mysql --host=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      --port=25060 \
      --user=doadmin \
      --password=AVNS_Q_RGkS7-uB3Bk7xC2am \
      --database=defaultdb \
      --ssl-mode=REQUIRED
```

### Production App

**URL**: https://terp-app-b9s35.ondigitalocean.app

---

## 🚨 MANDATORY TESTING & QUALITY PROTOCOLS

**⚠️ READ THIS SECTION FIRST - THESE PROTOCOLS ARE NON-NEGOTIABLE ⚠️**

**FAILURE TO FOLLOW THESE PROTOCOLS WILL RESULT IN IMMEDIATE REJECTION OF WORK.**

This section contains the most critical protocols that MUST be followed for every single line of code you write. No exceptions.

---

## 1. Testing Protocol (MANDATORY)

**Status:** ✅ Active & Enforced  
**Last Updated:** November 7, 2025

**FAILURE TO FOLLOW THIS PROTOCOL WILL RESULT IN IMMEDIATE REJECTION OF WORK.**

---

### 🚨 **Core Mandate: No Code Without Tests**

1.  **Every line of code you write must be tested.** This is not optional.
2.  **Test-Driven Development (TDD) is the required workflow.** Write tests _before_ you write the implementation code.
3.  **All tests must pass** before you can commit your code. The pre-commit hook will block you if they don't.
4.  **Bypassing tests is strictly prohibited.** Using `git commit --no-verify` will result in your work being rejected.

---

### 📋 **Step-by-Step TDD Workflow (MANDATORY)**

Follow this exact workflow for every feature, fix, or refactor.

#### **Step 1: Create the Test File**

Before writing any implementation code, create the test file.

- **Copy the template**: Use `server/routers/pricing.test.ts` as your template.
- **Naming**: `feature.ts` → `feature.test.ts`
- **Location**: Place the test file next to the file it's testing.

#### **Step 2: Write a Failing Test (Red)**

- Write a test for the functionality you are about to build.
- **Run the test and watch it fail.** This is expected. It proves your test is working correctly.

```bash
# Run the test for your specific file
pnpm test server/routers/your-feature.test.ts
```

#### **Step 3: Write the Implementation Code (Green)**

- Write the minimum amount of code required to make the failing test pass.
- **Run the test again and watch it pass.**

#### **Step 4: Refactor**

- Clean up your implementation code and your test code.
- Ensure it's readable, efficient, and follows best practices.
- Run the tests again to ensure they still pass.

#### **Step 5: Repeat for All Functionality**

- Continue this Red-Green-Refactor cycle for every piece of functionality in the feature.

---

### 🏆 **Testing Trophy Model (Required)**

Your tests must follow this distribution:

| Test Type       | Percentage | Purpose                                | Tools                 |
| --------------- | ---------- | -------------------------------------- | --------------------- |
| **Integration** | 70%        | Test how modules work together         | `vitest`, `vi.mock()` |
| **Unit**        | 20%        | Test individual functions in isolation | `vitest`              |
| **E2E**         | 10%        | Test full user flows in the browser    | `playwright`          |
| **Static**      | 0%         | Handled by ESLint & TypeScript         | `eslint`, `tsc`       |

**Focus on integration tests.** Most of your tests should be for tRPC routers, mocking the database layer.

---

### Mocking Pattern (MANDATORY)

**You MUST mock all external dependencies.** Never connect to a real database in your tests.

```typescript
// 1. Mock the entire database module at the top of your test file
vi.mock("../db/queries/your-db-module");

// 2. Use vi.mocked() in your tests to provide mock return values
it("should do something", async () => {
  // Arrange
  const mockData = { id: 1, name: "Test" };
  vi.mocked(yourDbModule.getSomething).mockResolvedValue(mockData);

  // Act
  const result = await caller.yourRouter.getSomething({ id: 1 });

  // Assert
  expect(result).toEqual(mockData);
});
```

---

### ❌ **Prohibited Actions**

- **DO NOT** commit code without a corresponding test file.
- **DO NOT** commit failing or skipped tests (unless explicitly approved).
- **DO NOT** use `git commit --no-verify`.
- **DO NOT** write tests that depend on other tests.
- **DO NOT** connect to a real database in any test.

---

### 📖 **Reference Documents**

- **Template**: `server/routers/pricing.test.ts`
- **Quick Guide**: `docs/testing/AI_AGENT_QUICK_REFERENCE.md`
- **Full Guide**: `docs/testing/TERP_TESTING_USAGE_GUIDE.md`

---

## 2. Definition of Done (DoD)

**Status:** ✅ Active & Enforced  
**Last Updated:** November 7, 2025

A feature or task is considered **Done** only when it meets all of the following criteria. No work will be accepted or merged unless it satisfies every point.

---

### 📋 **Mandatory Checklist for "Done"**

| Category          | Requirement                                | Verification                  |
| ----------------- | ------------------------------------------ | ----------------------------- |
| **Code Quality**  | Production-ready, no placeholders or stubs | Manual code review            |
|                   | Follows all Bible protocols                | Manual code review            |
|                   | No linting or type errors                  | `pnpm check` must pass        |
| **Testing**       | **100% of new code is tested**             | `pnpm test:coverage`          |
|                   | **All tests pass (100%)**                  | `pnpm test` must pass         |
|                   | Follows TDD workflow                       | Review commit history         |
|                   | Mocks all external dependencies            | Manual code review            |
| **Functionality** | Meets all user requirements                | User acceptance testing (UAT) |
|                   | Works end-to-end without errors            | Manual testing                |
|                   | Handles edge cases gracefully              | Manual testing                |
| **Documentation** | All related documents updated              | Manual review                 |
|                   | Code is well-commented                     | Manual code review            |
| **Git**           | Follows branch and commit conventions      | Review PR and commit history  |
|                   | All commits are atomic and logical         | Review commit history         |
| **CI/CD**         | All pipeline checks pass                   | GitHub Actions must be green  |

---

### 🚨 **Explicit Confirmation Required**

When you deliver your work, you **MUST** explicitly confirm that you have met the Definition of Done by including this checklist in your summary:

```
### ✅ Definition of Done Checklist

- [x] **Code Quality**: Production-ready, follows all protocols
- [x] **Testing**: 100% of new code tested, all tests pass
- [x] **Functionality**: Meets all requirements, works end-to-end
- [x] **Documentation**: All related documents updated
- [x] **Git**: Follows all conventions
- [x] **CI/CD**: All checks passing
```

**Work delivered without this confirmation will be rejected.**

---

## 3. Test Failure Monitoring Protocol (MANDATORY)

**FAILURE TO MONITOR TEST STATUS WILL RESULT IN BROKEN BUILDS AND REJECTED WORK.**

### 🚨 **Core Requirement: Check Test Status Before and After Every Push**

Test failures are **automatically posted as comments** on PRs and commits. You **MUST** check these comments using GitHub CLI—you do not need DigitalOcean access.

---

### 📋 **When to Check Test Status**

| Timing                    | Command                                                                  | What to Check                 |
| ------------------------- | ------------------------------------------------------------------------ | ----------------------------- |
| **Before starting work**  | `gh run list --limit 5`                                                  | Is the main branch healthy?   |
| **After creating a PR**   | `gh pr view <PR#> --comments`                                            | Did my PR pass all checks?    |
| **After pushing to main** | `gh api repos/EvanTenenbaum/TERP/commits/$(git rev-parse HEAD)/comments` | Did my commit pass all tests? |
| **If build fails**        | `gh run view <RUN_ID>`                                                   | What exactly failed?          |

---

### ✅ **How to Check Test Status (Step-by-Step)**

#### **1. Check if Main Branch is Healthy (Before Starting Work)**

```bash
# View recent workflow runs
gh run list --limit 5

# Check the latest run status
gh run view $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
```

**Expected Output:**
- ✅ **Green checkmark** = Main branch is healthy, safe to start work
- ❌ **Red X** = Main branch is broken, **DO NOT** start work until fixed

#### **2. Check Your PR Status (After Creating PR)**

```bash
# View PR checks
gh pr view <PR_NUMBER> --json statusCheckRollup

# View PR comments (test failures are posted here)
gh pr view <PR_NUMBER> --comments
```

**Expected Output:**
- ✅ **All checks passed** = Your PR is ready to merge
- ❌ **Some checks failed** = Read the failure comments, fix the issues

#### **3. Check Commit Status (After Pushing to Main)**

```bash
# View commit status
gh api repos/EvanTenenbaum/TERP/commits/$(git rev-parse HEAD)/status

# View commit comments (test failures are posted here)
gh api repos/EvanTenenbaum/TERP/commits/$(git rev-parse HEAD)/comments
```

**Expected Output:**
- ✅ **State: success** = Your commit passed all tests
- ❌ **State: failure** = Your commit broke the build, **REVERT IMMEDIATELY**

---

### 🚨 **What to Do If Tests Fail**

#### **Scenario 1: Your PR Fails Tests**

1. **Read the failure comment** on your PR (posted by GitHub Actions)
2. **Fix the failing tests** in your feature branch
3. **Push the fix** to your feature branch
4. **Wait for CI to re-run** (automatic)
5. **Check PR status again** using `gh pr view <PR#> --json statusCheckRollup`

#### **Scenario 2: Your Commit to Main Breaks Tests**

1. **IMMEDIATELY revert your commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```
2. **Create a new feature branch** to fix the issue
3. **Fix the tests** in the feature branch
4. **Create a new PR** with the fix
5. **Merge only after all tests pass**

#### **Scenario 3: Main Branch is Already Broken (Not Your Fault)**

1. **DO NOT start new work** on a broken main branch
2. **Check who broke it:**
   ```bash
   gh run list --limit 10
   gh run view <FAILING_RUN_ID>
   ```
3. **Notify the user** if you cannot fix it yourself
4. **Wait for main to be fixed** before starting your work

---

### ❌ **Prohibited Actions**

- **DO NOT** ignore test failures
- **DO NOT** merge PRs with failing tests
- **DO NOT** push to main without checking test status first
- **DO NOT** assume tests passed without verifying
- **DO NOT** use `--no-verify` to bypass pre-commit hooks

---

### ✅ **Best Practices**

- **Always check main branch health** before starting work
- **Run tests locally** before pushing (`pnpm test`)
- **Check PR status** within 5 minutes of creating it
- **Monitor commit status** after pushing to main
- **Fix test failures immediately** - do not let them linger

---

## Table of Contents

**🚨 MANDATORY TESTING & QUALITY PROTOCOLS** (see above)

1. [Testing Protocol](#1-testing-protocol-mandatory)
2. [Definition of Done](#2-definition-of-done-dod)
3. [Test Failure Monitoring Protocol](#3-test-failure-monitoring-protocol-mandatory)

**Core Development Protocols**

4. [System Integration & Change Management Protocol](#4-system-integration--change-management-protocol)
5. [Production-Ready Code Standard](#5-production-ready-code-standard)
6. [Breaking Change Protocol](#6-breaking-change-protocol)
7. [Quality Standards Checklist](#7-quality-standards-checklist)
8. [Deployment Monitoring Protocol](#8-deployment-monitoring-protocol)
9. [Version Management Protocol](#9-version-management-protocol)
10. [Reference Documentation](#10-reference-documentation)
11. [Automated Enforcement Protocol](#11-automated-enforcement-protocol)
12. [TypeScript Strictness Protocol](#12-typescript-strictness-protocol)
13. [Structured Logging Protocol](#13-structured-logging-protocol-mandatory)
14. [Feature Documentation Protocol](#14-feature-documentation-protocol)
15. [Git Workflow Protocol](#15-git-workflow-protocol)

---

## 4. System Integration & Change Management Protocol
## System Integration & Change Management Protocol

### 1. IMPACT ANALYSIS (Before Making Changes)

Before implementing any change, perform a comprehensive impact analysis:

- **Identify affected files:** List all components, pages, utilities, and configuration files that will be modified
- **Map dependencies:**
  - What components import this file?
  - What does this file import?
  - What data structures flow through this component?
  - What routes or navigation paths reference this?
- **Check for ripple effects:**
  - Will this change break navigation or routing?
  - Will this affect data structures or type definitions?
  - Will this impact UI consistency or design system patterns?
  - Will this require updates to mock data or API calls?
- **Create update checklist:** List ALL files that need updates to maintain system coherence

### 2. INTEGRATION VERIFICATION (During Changes)

When implementing changes, maintain system-wide coherence:

- **Batch related updates:** Update ALL related files in a single operation, not piecemeal
- **Maintain consistency across:**
  - Component props and interfaces
  - TypeScript type definitions
  - Routing paths and navigation links
  - Data schemas and mock data structures
  - Styling patterns (colors, spacing, typography)
  - Component variants and design tokens
- **Verify imports/exports:** Ensure all imports remain valid after renaming or restructuring
- **Preserve design system:** Keep consistent use of shadcn/ui components and Tailwind utilities
- **Update documentation:** Reflect changes in comments, README files, and type documentation

### 3. SYSTEM-WIDE VALIDATION (After Changes)

After implementing changes, validate the entire system:

- **Run `webdev_check_status`:** Verify TypeScript errors are resolved and no build errors exist
- **Test navigation flows:**
  - Click through all navigation links
  - Verify no broken routes or 404 errors
  - Test back/forward browser navigation
- **Verify data flows:**
  - Check that mock data renders correctly
  - Ensure data transformations work as expected
  - Validate that all UI components receive correct props
- **Visual regression check:**
  - Verify all pages still render correctly
  - Check responsive behavior at different screen sizes
  - Ensure no layout breaks or styling regressions
- **Browser testing:** Test in the actual browser, not just TypeScript compilation
- **Run smoke test:** Execute the smoke test checklist (see Smoke Test Protocol below)

### 4. SMOKE TEST PROTOCOL

**When to Run Smoke Tests:**

- After completing any feature implementation
- Before saving a checkpoint
- After merging significant changes
- Before deploying to production
- After database migrations
- When resuming work on the project

**Smoke Test Checklist:**

#### 1. Build & Compilation

```bash
# Verify no TypeScript errors
pnpm run check

# Verify no ESLint errors
pnpm run lint

# Verify build succeeds
pnpm run build
```

#### 2. Core Navigation Flow

- [ ] Homepage loads without errors
- [ ] All sidebar navigation links work
- [ ] No 404 errors on main routes
- [ ] Back/forward browser navigation works
- [ ] No console errors on page load

#### 3. Critical User Flows

- [ ] **Dashboard:** Loads and displays widgets
- [ ] **Inventory:** List loads, search works, can view product detail
- [ ] **Clients:** List loads, can view client profile
- [ ] **Orders:** List loads, can view order detail
- [ ] **Calendar:** Loads and displays events
- [ ] **VIP Portal:** Login page loads

#### 4. Data Operations

- [ ] Create operation works (test with any entity)
- [ ] Read/list operation works
- [ ] Update operation works
- [ ] Delete operation works (if applicable)
- [ ] Search/filter works

#### 5. Database Connectivity

```bash
# Verify database connection
mysql --host=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      --port=25060 \
      --user=doadmin \
      --password=AVNS_Q_RGkS7-uB3Bk7xC2am \
      --database=defaultdb \
      --ssl-mode=REQUIRED \
      -e "SELECT COUNT(*) FROM clients;"
```

- [ ] Database connection succeeds
- [ ] Can query main tables
- [ ] Migrations are applied

#### 6. Production Deployment Check

```bash
# Check production site
curl -I https://terp-app-b9s35.ondigitalocean.app
```

- [ ] Production site returns 200 OK
- [ ] No 500 errors on homepage
- [ ] Latest changes are deployed

#### 7. Error Handling

- [ ] Invalid routes show 404 page
- [ ] API errors show user-friendly messages
- [ ] Loading states appear during async operations
- [ ] Form validation shows clear error messages

**Smoke Test Pass Criteria:**

✅ **PASS:** All checklist items pass, no critical errors

⚠️ **PASS WITH WARNINGS:** Minor issues that don't block core functionality (document warnings)

❌ **FAIL:** Any critical error, broken navigation, or data operation failure

**If Smoke Test Fails:**

1. **DO NOT save checkpoint**
2. **DO NOT deploy to production**
3. **Fix critical issues immediately**
4. **Re-run smoke test**
5. **Document what was broken and how it was fixed**

**Smoke Test Report Template:**

```markdown
## Smoke Test Report

**Date:** [Date]
**Tester:** [AI Agent/User]
**Commit:** [Git commit hash]
**Result:** ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL

### Test Results

- Build & Compilation: ✅/❌
- Core Navigation: ✅/❌
- Critical User Flows: ✅/❌
- Data Operations: ✅/❌
- Database Connectivity: ✅/❌
- Production Deployment: ✅/❌
- Error Handling: ✅/❌

### Issues Found

1. [Issue description] - ✅ Fixed / ⚠️ Documented / ❌ Blocking
2. [Issue description] - ✅ Fixed / ⚠️ Documented / ❌ Blocking

### Notes

[Any additional observations or concerns]
```

### 5. BREAKING CHANGE PROTOCOL

If a requested change requires any of the following, **STOP and report to the user FIRST:**

**Triggers for Breaking Change Protocol:**

- Refactoring more than 5 files
- Changing core data structures, schemas, or type definitions
- Restructuring routing or navigation architecture
- Rebuilding major UI components or layouts
- Migrating to different libraries or frameworks
- Changing state management patterns
- Modifying API contracts or data fetching logic
- Altering authentication or authorization flows

**Required Report Format:**

```
🚨 BREAKING CHANGE ALERT

SCOPE:
- X files affected
- Y components require refactoring
- Z routes need restructuring

REASON:
[Explain why this change requires major refactoring]

AFFECTED SYSTEMS:
- [List all major systems/features affected]

RISKS:
- [Potential breaking changes]
- [Data migration concerns]
- [Backward compatibility issues]

ALTERNATIVES:
- [Option 1: Description]
- [Option 2: Description]

RECOMMENDATION:
[Your recommended approach]

⏸️ AWAITING USER CONFIRMATION TO PROCEED
```

**Wait for explicit user confirmation before proceeding with breaking changes.**

### 5. CHECKPOINT DISCIPLINE

Maintain proper version control and recovery points:

- **Before major refactoring:** Always save a checkpoint before attempting significant architectural changes
- **After successful features:** Save checkpoints after successfully integrating new features or completing milestones
- **Never deliver broken states:** Do not save checkpoints or deliver to users when the system has known errors
- **Meaningful descriptions:** Write clear, descriptive checkpoint messages that explain what was accomplished

---

## Production-Ready Code Standard

### Absolute Requirements

**NO PLACEHOLDERS OR STUBS**

❌ **NEVER use:**

- "TODO", "FIXME", "Coming Soon", "Placeholder"
- "To be implemented", "Not yet working"
- Pseudo-code or commented-out logic
- Empty function bodies with comments
- Mock data labeled as "temporary" without full implementation
- Disabled features with "enable later" comments

✅ **ALWAYS implement:**

- Complete, functional, production-ready code
- Real interactions for every UI element
- Proper error handling and loading states
- Full validation logic for all forms
- Complete data flows from source to UI
- Graceful degradation for edge cases

### Full Implementation Mandate

Every deliverable must meet these standards:

1. **Components:**
   - Fully functional with all props properly typed
   - Complete interaction logic (clicks, hovers, focus states)
   - Proper accessibility attributes (ARIA labels, keyboard navigation)
   - Loading and error states handled
   - Responsive design implemented

2. **Features:**
   - Work end-to-end from user action to result
   - Include proper validation and error messages
   - Handle edge cases gracefully
   - Provide user feedback for all actions

3. **Data Flows:**
   - Complete from source to UI rendering
   - Use realistic, comprehensive mock data if backend unavailable
   - Include proper type definitions
   - Handle loading, success, and error states

4. **Forms:**
   - Full validation logic (client-side)
   - Clear error messages
   - Submission handling with feedback
   - Proper disabled/loading states during submission

5. **Error Handling:**
   - Try-catch blocks where appropriate
   - User-friendly error messages
   - Fallback UI for error states
   - Network error handling

### Exception Protocol - If Stubs Are Unavoidable

If technical constraints genuinely require creating incomplete implementation:

**STOP and explicitly report:**

```
🚨 INCOMPLETE IMPLEMENTATION ALERT

INCOMPLETE FEATURE: [Name]

WHAT IS INCOMPLETE:
- [Specific functionality missing]

WHY IT'S INCOMPLETE:
- [Technical constraint or blocker]

MISSING FUNCTIONALITY:
- [Detailed list of what's not implemented]

COMPLETION REQUIREMENTS:
- [What would be needed to complete it]

COMPLETION PLAN:
- [When/how it will be completed]

⏸️ AWAITING USER ACKNOWLEDGMENT
```

**Wait for user acknowledgment before proceeding.**

### Task Completion Reporting

When reporting task completion, MUST include:

✅ **Production Ready Confirmation:**

- "All features are production-ready and fully functional"
- "No placeholders, stubs, or incomplete implementations"

✅ **Known Limitations:**

- List any intentional simplifications (e.g., "Using mock data instead of API")
- Explain any features intentionally scoped out

✅ **Incomplete Work Alerts:**

- Flag ANY incomplete work with 🚨 alerts
- Provide clear reasoning and completion plan

✅ **Status Declaration:**

- "STATUS: PRODUCTION READY" or
- "STATUS: INCOMPLETE - [specific reason]"

---

## Quality Standards Checklist

### Code Quality

- [ ] **Clean Code:**
  - Meaningful variable and function names
  - Proper code organization and structure
  - No commented-out code blocks
  - Consistent formatting and style

- [ ] **Type Safety:**
  - All TypeScript types properly defined
  - No `any` types unless absolutely necessary
  - Proper interface definitions for props
  - Type guards where needed

- [ ] **Maintainability:**
  - DRY principle (Don't Repeat Yourself)
  - Single Responsibility Principle
  - Proper separation of concerns
  - Reusable components and utilities

### UI/UX Quality

- [ ] **Visual Polish:**
  - Proper spacing and alignment
  - Consistent colors from design system
  - Smooth transitions and animations
  - Professional typography

- [ ] **Interactions:**
  - Hover states for interactive elements
  - Focus states for keyboard navigation
  - Active/pressed states for buttons
  - Loading indicators for async operations
  - Disabled states where appropriate

- [ ] **Responsive Design:**
  - Works on mobile (320px+)
  - Works on tablet (768px+)
  - Works on desktop (1024px+)
  - Proper breakpoints used
  - No horizontal scrolling

- [ ] **Accessibility:**
  - Semantic HTML elements
  - ARIA labels where needed
  - Keyboard navigation support
  - Sufficient color contrast
  - Screen reader compatibility

### Functionality

- [ ] **Error Handling:**
  - Try-catch for async operations
  - User-friendly error messages
  - Fallback UI for errors
  - Network error handling

- [ ] **Loading States:**
  - Skeleton loaders or spinners
  - Disabled states during loading
  - Progress indicators for long operations

- [ ] **Data Validation:**
  - Form validation with clear messages
  - Input sanitization
  - Type checking for data structures
  - Edge case handling

- [ ] **Performance:**
  - No unnecessary re-renders
  - Proper use of React hooks
  - Lazy loading where appropriate
  - Optimized images and assets

---

## Reference Documentation

### Core Documents

The following documents contain comprehensive research and guidelines for TERP development:

1. **TERP_DESIGN_SYSTEM.md**
   - Comprehensive UX/UI research synthesis
   - Design principles and patterns
   - Component library guidelines
   - Color, typography, and spacing systems
   - Accessibility standards
   - Interaction patterns

2. **TERP_IMPLEMENTATION_STRATEGY.md**
   - Phased development roadmap
   - Technology stack decisions
   - Architecture patterns
   - Module-by-module implementation plan
   - Testing and validation strategies

### Research Foundation

The TERP design system is based on comprehensive research across 12 key UX/UI topics:

1. **Information Architecture & Navigation**
   - Persistent sidebar for internal tools
   - Clear visual hierarchy
   - Breadcrumb navigation for deep structures

2. **Data Tables & Grids**
   - Advanced filtering and sorting
   - Inline editing capabilities
   - Bulk actions support
   - Column customization

3. **Forms & Input Validation**
   - Real-time validation
   - Clear error messaging
   - Progressive disclosure
   - Smart defaults

4. **Dashboard Design**
   - Customizable widgets
   - Key metrics at-a-glance
   - Drill-down capabilities
   - Responsive layouts

5. **Search & Filtering**
   - Global search functionality
   - Advanced filters
   - Saved searches
   - Search suggestions

6. **Responsive Design**
   - Mobile-first approach
   - Adaptive layouts
   - Touch-friendly interactions
   - Progressive enhancement

7. **Accessibility (WCAG 2.1)**
   - Keyboard navigation
   - Screen reader support
   - Color contrast compliance
   - Focus management

8. **Performance Optimization**
   - Code splitting
   - Lazy loading
   - Optimized rendering
   - Asset optimization

9. **Error Handling & Feedback**
   - Contextual error messages
   - Toast notifications
   - Inline validation
   - Recovery suggestions

10. **Workflow & Task Management**
    - Status tracking
    - Action queues
    - Progress indicators

---

## 12. Feature Documentation Protocol

**Objective:** To maintain a living, comprehensive, and easily accessible repository of documentation for all features within the TERP system, ensuring that knowledge is preserved and engineering efforts are aligned.

### A. Documentation Structure

All feature documentation resides in the `/docs/features/` directory. This directory is the single source of truth for feature implementation details, user flows, and roadmap status.

- **`DISCOVERED_FEATURES.md`**: A catalog of all features discovered in the codebase that were not part of the original specifications. Each entry provides a high-level overview, business value, and links to its detailed module documentation.
- **`USER_FLOWS.md`**: Contains detailed, step-by-step user flow diagrams and descriptions for all major features.
- **`GAP_ANALYSIS.md`**: Documents the analysis of what's missing to consider a feature 'complete'.
- **`FEATURE_ROADMAP.md`**: The unified, living roadmap document.
- **`modules/*.md`**: A dedicated Markdown file for each feature module, containing its complete technical and functional specification.

### B. Maintenance and Update Protocol

This documentation is **living** and MUST be updated by any agent performing engineering work.

1.  **Before Starting Work:** The agent must first consult the relevant feature module document in `/docs/features/modules/` to understand the current state, user flows, and known gaps.
2.  **During Development:** As code is written, the agent must update the corresponding documentation in real-time to reflect changes to the database schema, API endpoints, or UI components.
3.  **After Completing Work:** Upon completion of a feature or enhancement, the agent must:
    - Update the feature's status in `DISCOVERED_FEATURES.md` and the relevant module document.
    - Map any new or modified user flows in `USER_FLOWS.md`.
    - Update the `GAP_ANALYSIS.md` if the work addressed a known gap or revealed a new one.
    - Ensure the `FEATURE_ROADMAP.md` reflects the new status of the feature.

### C. Content Standards for Module Documents

Each file in `/docs/features/modules/` must contain:

1.  **Feature Overview**: High-level description and business value.
2.  **Current Implementation Status**: What exists today.
3.  **Database Schema**: Tables, relationships, key fields.
4.  **API Endpoints**: Router methods and data contracts.
5.  **User Flows**: Step-by-step user journeys.
6.  **Gap Analysis**: Missing functionality to reach feature-complete status.
7.  **Future Enhancements**: Planned improvements.
8.  **Exclusions Based on User Feedback**: A clear list of functionalities that should **NOT** be built for this module, based on direct user feedback (e.g., "No shipping carrier integration," "No self-service password reset").

Adherence to this protocol is mandatory for all engineering tasks to ensure the long-term maintainability and clarity of the TERP project.

## 14. Git Workflow Protocol

**Status:** ✅ Active  
**Last Updated:** November 6, 2025

### Branch Naming Convention

All branches must follow this format:

```
<type>/<short-description>
```

- **`<type>`**: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`
- **`<short-description>`**: 2-5 words describing the change (e.g., `feat/add-client-search`)

**Examples:**

- `feat/add-client-search`
- `fix/invoice-calculation-error`
- `docs/update-testing-protocol`
- `test/add-order-integration-tests`

### Commit Message Convention

All commit messages must follow the **Conventional Commits** standard:

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **`<type>`**: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`
- **`<scope>`** (optional): The part of the codebase affected (e.g., `auth`, `orders`, `db`)
- **`<subject>`**: Short, imperative-mood description of the change (e.g., `add client search input`)
- **`<body>`** (optional): More detailed explanation
- **`<footer>`** (optional): Reference issue numbers (e.g., `Fixes #123`)

**Example:**

```
feat(orders): add search functionality to orders page

- Adds a search input to the orders list page
- Filters orders by order number, client name, and status
- Debounces search input to reduce API calls

Fixes #123
```

### Pull Request (PR) Process

1. **Create a feature branch** from `main`
2. **Make your changes** with accompanying tests
3. **Push to your fork**
4. **Open a Pull Request** to merge into `main`
5. **Use a clear PR title** that follows Conventional Commits format
6. **Write a detailed PR description**:
   - What does this PR do?
   - Why is this change needed?
   - How was this tested?
   - Any relevant screenshots or videos
7. **Wait for CI checks** to pass (automated tests, linting, etc.)
8. **Address review feedback** if requested

**Never merge a PR with failing checks.**

---


## 15. Test Failure Monitoring Protocol (MANDATORY)

**FAILURE TO MONITOR TEST STATUS WILL RESULT IN BROKEN BUILDS AND REJECTED WORK.**

### 🚨 **Core Requirement: Check Test Status Before and After Every Push**

Test failures are **automatically posted as comments** on PRs and commits. You **MUST** check these comments using GitHub CLI—you do not need DigitalOcean access.

---

### 📋 **When to Check Test Status**

| Timing                    | Command                                                                  | What to Check                 |
| ------------------------- | ------------------------------------------------------------------------ | ----------------------------- |
| **Before starting work**  | `gh run list --limit 5`                                                  | Is the main branch healthy?   |
| **After creating a PR**   | `gh pr view <PR#> --comments`                                            | Did my PR pass all checks?    |
| **After pushing to main** | `gh api repos/EvanTenenbaum/TERP/commits/$(git rev-parse HEAD)/comments` | Did my commit pass all tests? |
| **If build fails**        | `gh run view <RUN_ID>`                                                   | What exactly failed?          |

---

### ✅ **How to Check Test Status (Step-by-Step)**

#### **1. Check if Main Branch is Healthy (Before Starting Work)**

```bash
# View recent workflow runs
gh run list --limit 5

# Check the latest run status
gh run view $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
```

**What to look for:**

- ✅ Green checkmark = main branch is healthy, safe to start work
- ❌ Red X = main branch is broken, **DO NOT push more changes**

#### **2. Check Your PR Status (After Creating a PR)**

```bash
# View your PR and its comments
gh pr view <PR_NUMBER> --comments

# Example:
gh pr view 42 --comments
```

**What to look for:**

- A comment with "✅ All Checks Passed" = your PR is ready
- A comment with "❌ Checks Failed" = read the error details in the comment

**The comment will include:**

- Which checks failed (Lint, Type Check, or Tests)
- Expandable sections with the actual error messages
- Commands to run locally to reproduce the issue

#### **3. Check Your Commit Status (After Pushing to Main)**

```bash
# Get comments on your latest commit
gh api repos/EvanTenenbaum/TERP/commits/$(git rev-parse HEAD)/comments | jq -r '.[].body'

# Or check a specific commit
gh api repos/EvanTenenbaum/TERP/commits/<COMMIT_SHA>/comments | jq -r '.[].body'
```

**What to look for:**

- "✅ All Tests Passed" = your commit is good
- "❌ Tests Failed" = read the error details and fix immediately

---

### 🚨 **What to Do When Tests Fail**

#### **If Your PR Fails:**

1. **Read the comment on your PR:**

   ```bash
   gh pr view <PR_NUMBER> --comments
   ```

2. **The comment will show you exactly what failed.** Expand the error sections to see the details.

3. **Run the failing checks locally:**

   ```bash
   pnpm lint        # If lint failed
   pnpm check       # If type check failed
   pnpm test        # If tests failed
   ```

4. **Fix the errors, commit, and push.** The PR will automatically re-run checks.

#### **If Main Branch Fails:**

1. **Check the commit comment:**

   ```bash
   gh api repos/EvanTenenbaum/TERP/commits/<COMMIT_SHA>/comments | jq -r '.[].body'
   ```

2. **The comment will show:**
   - Which tests failed (Integration, E2E, Schema, Seed)
   - The actual error messages
   - What to do next

3. **Create a fix PR immediately:**

   ```bash
   git checkout -b fix/broken-tests
   # Fix the issues
   git add .
   git commit -m "fix: resolve failing tests"
   git push origin fix/broken-tests
   gh pr create --title "Fix: Resolve failing tests" --body "Fixes tests broken by commit <SHA>"
   ```

4. **Do not push more changes to main until the fix is merged.**

---

### ❌ **Prohibited Actions**

- **DO NOT** push to main without checking if tests passed.
- **DO NOT** ignore test failure comments on your PRs.
- **DO NOT** merge a PR with failing checks.
- **DO NOT** ask the user for build logs—use GitHub CLI instead.

---

### 📊 **Where Test Failures Are Posted**

| Location            | How to Access                                            | What You'll See                                       |
| ------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| **PR Comments**     | `gh pr view <PR#> --comments`                            | Lint, Type Check, and Unit Test results               |
| **Commit Comments** | `gh api repos/EvanTenenbaum/TERP/commits/<SHA>/comments` | Integration, E2E, Schema, and Seed results            |
| **Workflow Runs**   | `gh run view <RUN_ID>`                                   | Full logs (only if comments don't have enough detail) |

---

### ✅ **Summary: Your Monitoring Checklist**

- [ ] Before starting work: Check if main branch is healthy (`gh run list`)
- [ ] After creating a PR: Check PR comments (`gh pr view <PR#> --comments`)
- [ ] After pushing to main: Check commit comments (`gh api repos/.../commits/<SHA>/comments`)
- [ ] If tests fail: Read the error details in the comments
- [ ] If tests fail: Fix immediately and re-push

**Failure to follow this protocol means you are working blind and will break the build.**

---

## Role-Based Access Control (RBAC) Protocol

**Version:** 1.0  
**Last Updated:** November 7, 2025  
**Purpose:** Ensure consistent implementation and maintenance of RBAC across the TERP system

---

### Overview

The TERP system implements a comprehensive Role-Based Access Control (RBAC) system that controls access to all features and data. This protocol defines how to work with RBAC when developing new features or modifying existing ones.

### Core Principles

1. **Backend Enforcement is Primary** - All permission checks MUST be enforced on the backend. Frontend checks are for UX only.
2. **Super Admin Bypass** - Super Admins bypass all permission checks and have access to everything.
3. **Permission Inheritance** - Users inherit permissions from all assigned roles.
4. **Permission Overrides** - Individual permissions can be granted or revoked per user, overriding role permissions.
5. **Cache Invalidation** - Permission cache MUST be cleared when roles or permissions change.

### Permission Naming Convention

Permissions follow the format: `{module}:{action}`

**Common Modules:**
- `orders`, `inventory`, `clients`, `vendors`, `purchase_orders`
- `accounting`, `dashboard`, `calendar`, `todos`
- `rbac`, `system`, `settings`

**Common Actions:**
- `read` - View/list data
- `create` - Create new records
- `update` - Modify existing records
- `delete` - Remove records
- `manage` - Full CRUD access (admin only)

**Examples:**
- `orders:read` - View orders
- `orders:create` - Create new orders
- `inventory:update` - Update inventory
- `rbac:manage` - Full RBAC administration

### Backend Implementation

#### 1. Protecting API Endpoints

All tRPC router endpoints MUST use the `requirePermission` middleware:

```typescript
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";

export const myRouter = router({
  // Read operation
  list: protectedProcedure
    .use(requirePermission("module:read"))
    .input(z.object({ ... }))
    .query(async ({ input }) => { ... }),
    
  // Create operation
  create: protectedProcedure
    .use(requirePermission("module:create"))
    .input(z.object({ ... }))
    .mutation(async ({ input }) => { ... }),
    
  // Update operation
  update: protectedProcedure
    .use(requirePermission("module:update"))
    .input(z.object({ ... }))
    .mutation(async ({ input }) => { ... }),
    
  // Delete operation
  delete: protectedProcedure
    .use(requirePermission("module:delete"))
    .input(z.object({ ... }))
    .mutation(async ({ input }) => { ... }),
});
```

#### 2. Multiple Permission Checks

For operations requiring multiple permissions:

```typescript
import { requireAllPermissions, requireAnyPermission } from "../_core/permissionMiddleware";

// Requires ALL permissions
complexOperation: protectedProcedure
  .use(requireAllPermissions(["orders:read", "pricing:read"]))
  .query(async ({ input }) => { ... }),

// Requires ANY permission
flexibleOperation: protectedProcedure
  .use(requireAnyPermission(["orders:create", "quotes:create"]))
  .mutation(async ({ input }) => { ... }),
```

#### 3. Adding New Permissions

When adding a new module or feature:

1. **Add permission to seed script** (`scripts/seed-rbac.ts`):
   ```typescript
   await createPermission("new_module:read", "View new module data", "new_module");
   await createPermission("new_module:create", "Create new module records", "new_module");
   ```

2. **Assign to appropriate roles** in the seed script:
   ```typescript
   await assignPermissionToRole("Sales Representative", "new_module:read");
   await assignPermissionToRole("Manager", "new_module:create");
   ```

3. **Run migration** to update the database:
   ```bash
   pnpm tsx scripts/seed-rbac.ts
   ```

4. **Update permission mapping** in `docs/RBAC_ROUTER_PERMISSION_MAPPING.md`

### Frontend Implementation

#### 1. Using the usePermissions Hook

For conditional rendering based on permissions:

```typescript
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const { hasPermission, isSuperAdmin } = usePermissions();

  return (
    <div>
      {hasPermission('orders:create') && (
        <Button>Create Order</Button>
      )}
      
      {isSuperAdmin && (
        <Button>Admin Panel</Button>
      )}
    </div>
  );
}
```

#### 2. Using the PermissionGate Component

For declarative permission checks:

```typescript
import { PermissionGate } from "@/hooks/usePermissions";

<PermissionGate permission="orders:create">
  <CreateOrderButton />
</PermissionGate>

<PermissionGate 
  permissions={['inventory:update', 'inventory:delete']} 
  requireAll={false}
  fallback={<div>No access</div>}
>
  <InventoryActions />
</PermissionGate>
```

#### 3. Using the useModulePermissions Hook

For CRUD operations on a specific module:

```typescript
import { useModulePermissions } from "@/hooks/usePermissions";

function OrdersPage() {
  const { canRead, canCreate, canUpdate, canDelete } = useModulePermissions('orders');

  return (
    <div>
      {canRead && <OrdersList />}
      {canCreate && <CreateOrderButton />}
      {canUpdate && <EditOrderButton />}
      {canDelete && <DeleteOrderButton />}
    </div>
  );
}
```

### Testing Requirements

When implementing RBAC for a new feature:

1. **Unit Tests** - Test permission middleware:
   ```typescript
   it('requires permission to access endpoint', async () => {
     const user = await createTestUser({ permissions: [] });
     await expect(caller(user).myRouter.create()).rejects.toThrow('Insufficient permissions');
   });
   ```

2. **Integration Tests** - Test full permission flow:
   ```typescript
   it('allows access with correct permission', async () => {
     const user = await createTestUser({ permissions: ['module:create'] });
     const result = await caller(user).myRouter.create({ ... });
     expect(result).toBeDefined();
   });
   ```

3. **Manual QA** - Test with different roles:
   - Log in as each role
   - Verify UI elements appear/disappear correctly
   - Verify API calls succeed/fail appropriately

### Common Patterns

#### Pattern 1: Conditional Button Rendering

```typescript
{hasPermission('orders:delete') && (
  <Button variant="destructive" onClick={handleDelete}>
    Delete
  </Button>
)}
```

#### Pattern 2: Disable vs Hide

```typescript
// Option 1: Hide completely
{hasPermission('orders:delete') && <DeleteButton />}

// Option 2: Show but disable
<Button 
  disabled={!hasPermission('orders:delete')}
  title={!hasPermission('orders:delete') ? "No permission" : "Delete"}
>
  Delete
</Button>
```

#### Pattern 3: Conditional Page Access

```typescript
function AdminPage() {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) return <LoadingSpinner />;
  
  if (!hasPermission('system:manage')) {
    return <AccessDenied />;
  }

  return <AdminDashboard />;
}
```

### Troubleshooting

#### Permission Cache Issues

If permissions don't update after role changes:

1. **Check cache clearing** - Ensure `clearPermissionCache(userId)` is called:
   ```typescript
   import { clearPermissionCache } from "../services/permissionService";
   
   // After role assignment
   await assignRoleToUser(userId, roleId);
   clearPermissionCache(userId);
   ```

2. **User may need to refresh** - Permission cache has a TTL of 5 minutes

#### Permission Denied Errors

If users get unexpected permission errors:

1. **Check user's roles** - Verify user has the correct roles assigned
2. **Check role permissions** - Verify the role has the required permissions
3. **Check permission overrides** - Check if user has a revoked override
4. **Check logs** - Permission checks are logged for debugging

### Security Considerations

1. **Never trust frontend checks** - Always enforce on backend
2. **Log permission failures** - All permission denials are logged
3. **Audit permission changes** - Role and permission changes are logged
4. **Protect RBAC endpoints** - Only admins can modify roles and permissions
5. **Validate permission names** - Ensure permission strings are valid

### Maintenance

#### Adding a New Role

1. Update `scripts/seed-rbac.ts`:
   ```typescript
   const newRole = await createRole(
     "New Role Name",
     "Description of the role",
     false // isSystemRole
   );
   ```

2. Assign permissions:
   ```typescript
   await assignPermissionToRole("New Role Name", "orders:read");
   await assignPermissionToRole("New Role Name", "orders:create");
   ```

3. Run seed script:
   ```bash
   pnpm tsx scripts/seed-rbac.ts
   ```

#### Modifying Role Permissions

1. Update seed script with new permission assignments
2. Run seed script to update database
3. Clear permission cache for affected users
4. Test with affected roles

### Documentation References

- **Implementation Roadmap**: `docs/RBAC_IMPLEMENTATION_ROADMAP.md`
- **Permission Mapping**: `docs/RBAC_ROUTER_PERMISSION_MAPPING.md`
- **Frontend Guide**: `docs/RBAC_FRONTEND_IMPLEMENTATION_GUIDE.md`
- **Testing Plan**: `docs/RBAC_TESTING_PLAN.md`

### Checklist for New Features

When adding a new feature to TERP:

- [ ] Define required permissions (read, create, update, delete)
- [ ] Add permissions to seed script
- [ ] Assign permissions to appropriate roles
- [ ] Protect all API endpoints with `requirePermission`
- [ ] Add frontend permission checks for UI elements
- [ ] Write unit tests for permission enforcement
- [ ] Write integration tests for permission flow
- [ ] Test manually with different roles
- [ ] Update permission mapping documentation
- [ ] Run seed script to update database

---

**Last Updated:** November 7, 2025  
**Maintained By:** TERP Development Team
