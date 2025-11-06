# TERP Development Protocols

**Version:** 2.4  
**Last Updated:** November 6, 2025  
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

## Table of Contents

1. [System Integration & Change Management Protocol](#system-integration--change-management-protocol)
2. [Production-Ready Code Standard](#production-ready-code-standard)
3. [Breaking Change Protocol](#breaking-change-protocol)
4. [Quality Standards Checklist](#quality-standards-checklist)
5. [Deployment Monitoring Protocol](#deployment-monitoring-protocol)
6. [Version Management Protocol](#version-management-protocol)
7. [Reference Documentation](#reference-documentation)
8. [Automated Enforcement Protocol](#8-automated-enforcement-protocol)
9. [TypeScript Strictness Protocol](#9-typescript-strictness-protocol)
10. [Structured Logging Protocol](#10-structured-logging-protocol-mandatory)
11. [Definition of Done](#11-definition-of-done-dod)
12. [Feature Documentation Protocol](#12-feature-documentation-protocol)

13. [Testing Protocol](#13-testing-protocol-mandatory)
14. [Git Workflow Protocol](#14-git-workflow-protocol)

---

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

## 13. Testing Protocol (MANDATORY)

**Status:** ✅ Production Ready  
**Last Updated:** November 6, 2025

### Overview

All code changes MUST include tests. This is non-negotiable and enforced through automated pre-commit hooks and CI/CD pipelines.

### Testing Philosophy: The Testing Trophy

We follow the **Testing Trophy** model, which prioritizes integration tests for the best return on investment:

```
        /\
       /  \      E2E Tests (20%)
      /    \     - Slow, expensive, but catches critical issues
     /------\
    /        \   Integration Tests (50%)
   /          \  - Fast, realistic, high confidence
  /------------\
 /              \ Unit Tests (20%)
/________________\ Static Analysis (10%)
```

### Test-Driven Development (TDD) - MANDATORY

All new features and bug fixes MUST follow the TDD workflow:

1. **RED**: Write a failing test that describes the desired behavior
2. **GREEN**: Write the minimum code to make the test pass
3. **REFACTOR**: Clean up the code while keeping tests green

**Never write implementation code before writing tests.**

### Pre-Commit Requirements

Before every commit, the following checks are automatically enforced:

- ✅ All tests pass (`pnpm test`)
- ✅ Code is formatted (`pnpm format` via Prettier)
- ✅ Linting passes (`pnpm lint` via ESLint)
- ✅ Type checks pass (`pnpm typecheck` via TypeScript)
- ✅ Commit message follows Conventional Commits standard

These checks are enforced via **Husky pre-commit hooks** and will **block commits** that don't meet standards.

### Test Location Standards

| Code Type         | Test Location                 | Example                          |
| ----------------- | ----------------------------- | -------------------------------- |
| Utility functions | `server/lib/**/*.test.ts`     | `utils.ts` → `utils.test.ts`     |
| tRPC routers      | `server/routers/**/*.test.ts` | `clients.ts` → `clients.test.ts` |
| E2E user flows    | `e2e/**/*.spec.ts`            | `e2e/create-order.spec.ts`       |

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (for TDD)
pnpm test:watch

# Run only integration tests
pnpm test:integration

# Run E2E tests
pnpm playwright test

# Run all quality checks
pnpm check
```

### CI/CD Automation

#### On Pull Requests (`pr.yml`)

Fast feedback loop (< 5 minutes):

- ✅ Linting & Type Checking
- ✅ Unit Tests

#### On Merges to `main` (`merge.yml`)

Full test suite (< 15 minutes):

- ✅ Database Seeding (with `light` scenario)
- ✅ Integration Tests
- ✅ E2E Tests (with Playwright & Argos)
- ✅ Test Coverage Checks
- ✅ Visual Regression Testing

### Test Coverage Requirements

- **Backend Code**: 80%+ coverage target
- **Critical Business Logic**: 100% coverage required
- **UI Components**: Integration tests preferred over unit tests

### Bypassing Tests (PROHIBITED)

**Never use `git commit --no-verify` to bypass pre-commit hooks.**

If tests are failing:

1. Read the error message carefully
2. Run the failing test locally to debug
3. Fix the issue before committing
4. If stuck, ask for help - don't bypass

### Complete Testing Documentation

For comprehensive testing guidelines, see:

- **[docs/testing/TERP_TESTING_README.md](testing/TERP_TESTING_README.md)** - Master testing documentation index
- **[docs/testing/TERP_TESTING_USAGE_GUIDE.md](testing/TERP_TESTING_USAGE_GUIDE.md)** - How to run and write tests
- **[docs/testing/AI_AGENT_QUICK_REFERENCE.md](testing/AI_AGENT_QUICK_REFERENCE.md)** - Quick checklist for AI agents

### Definition of Done (Updated)

A task is only considered "done" when:

1. ✅ All acceptance criteria met
2. ✅ **Tests written and passing** (NEW)
3. ✅ Code reviewed and approved
4. ✅ Documentation updated
5. ✅ Zero TypeScript errors
6. ✅ Deployed to staging
7. ✅ User acceptance testing passed
8. ✅ **CI/CD pipeline passing** (NEW)

---

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
