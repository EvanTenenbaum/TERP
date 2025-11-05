# TERP Development Protocols

**Version:** 2.2  
**Last Updated:** October 30, 2025  
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

### 4. BREAKING CHANGE PROTOCOL

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
   - Console logging for debugging (can be removed in production)

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
    - Batch operations

11. **Color Theory & Visual Hierarchy**
    - Consistent color palette
    - Semantic colors for status
    - Visual weight and emphasis
    - White space utilization

12. **Typography & Readability**
    - Clear font hierarchy
    - Optimal line length
    - Proper contrast
    - Responsive typography

### Design Principles

**Core Principles Applied Throughout TERP:**

1. **Clarity Over Cleverness**
   - Prioritize user understanding over novel interactions
   - Use familiar patterns and conventions
   - Provide clear labels and instructions

2. **Progressive Disclosure**
   - Show essential information first
   - Reveal complexity as needed
   - Avoid overwhelming users

3. **Consistency**
   - Maintain design patterns across modules
   - Use consistent terminology
   - Apply uniform interaction models

4. **Feedback & Responsiveness**
   - Acknowledge all user actions
   - Provide clear status indicators
   - Show progress for long operations

5. **Error Prevention & Recovery**
   - Validate input in real-time
   - Provide helpful error messages
   - Offer clear recovery paths

6. **Efficiency for Experts**
   - Keyboard shortcuts for power users
   - Bulk actions for repetitive tasks
   - Customizable workflows

7. **Accessibility First**
   - Design for all users from the start
   - Test with assistive technologies
   - Exceed minimum compliance standards

---

## Usage Guidelines

### For Developers

1. **Before Starting Work:**
   - Review this document
   - Check TERP_DESIGN_SYSTEM.md for design patterns
   - Review TERP_IMPLEMENTATION_STRATEGY.md for architecture

2. **During Development:**
   - Follow the System Integration Protocol
   - Maintain Production-Ready Code Standard
   - Use the Quality Standards Checklist

3. **Before Completion:**
   - Run full system validation
   - Complete the Quality Standards Checklist
   - Prepare proper completion report

### For AI Assistants

When working on TERP in future sessions:

1. **Session Start:**
   - Read this document first
   - Review existing implementation
   - Understand current architecture

2. **Change Requests:**
   - Perform Impact Analysis
   - Follow Integration Verification steps
   - Apply Breaking Change Protocol when needed

3. **Delivery:**
   - Ensure Production-Ready standards
   - Complete System-Wide Validation
   - Provide comprehensive completion report

---

## Deployment Monitoring Protocol

### ALWAYS Monitor Deployments After Push

Whenever code is pushed to GitHub, **immediately monitor the deployment** to catch issues early.

#### Required Actions After Every `git push`:

1. **Wait for Build** (2-3 minutes)
   - Don't assume success
   - Actively wait and monitor

2. **Check Deployment Status**
   - Render: Check deployment logs in dashboard or via API
   - Railway: Check deployment status and logs
   - Vercel: Check deployment status

3. **Verify Application Health**
   - Load the production URL
   - Check for 502/500 errors
   - Verify critical pages load
   - Check browser console for errors

4. **Review Deployment Logs**
   - Look for ERROR messages
   - Check migration success
   - Verify environment variables loaded
   - Confirm server started successfully

5. **Take Immediate Action on Failures**
   - Don't wait for user to report issues
   - Debug and fix immediately
   - Roll back if necessary

#### Deployment Credentials

Stored in: `/docs/DEPLOYMENT_CREDENTIALS.md` (DO NOT COMMIT TO PUBLIC REPOS)

- **Render API Key:** For autonomous deployment monitoring
- **Railway Token:** For CLI access and monitoring

#### Autonomous Monitoring Commands

**Render:**

```bash
# Check service status
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services

# Get deployment logs
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/{serviceId}/deploys
```

**Railway:**

```bash
export RAILWAY_TOKEN=your_token
railway status
railway logs
```

### Why This Matters

- **Catch issues immediately** before they affect users
- **Faster debugging** with fresh context
- **Production reliability** through proactive monitoring
- **Autonomous operation** reduces manual intervention

**Remember:** A successful `git push` doesn't mean successful deployment. Always verify!

---

## Version Management Protocol

### MANDATORY: Update Version on Every GitHub Push

To ensure version traceability and deployment verification, **every single GitHub push MUST include a version update**.

#### Version File Location

`/version.json` in the project root:

```json
{
  "version": "1.0.0",
  "commit": "abc1234",
  "date": "2025-10-27",
  "description": "Brief description of changes"
}
```

#### Required Actions Before Every `git push`:

1. **Update Commit Hash**

   ```bash
   # Get current commit hash (short form)
   git rev-parse --short HEAD
   ```

   - Update `commit` field in `version.json` with the current commit hash

2. **Update Date**
   - Set `date` field to current date in YYYY-MM-DD format

3. **Update Description**
   - Briefly describe what changed in this push
   - Examples: "Added version display", "Fixed login bug", "Updated accounting module"

4. **Increment Version (if applicable)**
   - For major features: increment minor version (1.0.0 → 1.1.0)
   - For bug fixes: increment patch version (1.0.0 → 1.0.1)
   - For breaking changes: increment major version (1.0.0 → 2.0.0)

#### Version Display Implementation

The version is displayed persistently in the application header:

- **Desktop:** Shows both version number and commit hash
- **Mobile:** Shows commit hash only (space-constrained)
- **Location:** `client/src/components/layout/AppHeader.tsx`
- **Import:** `import versionInfo from '../../../version.json'`

#### Why This Matters

- **Deployment Verification:** User can verify they're working with the correct deployed version
- **Debugging:** Quickly identify which code version is running in production
- **Traceability:** Link production issues to specific commits
- **Accountability:** Clear history of what changed and when

#### Enforcement

**This is a MANDATORY protocol. Every Manus agent MUST:**

1. Check `version.json` before pushing to GitHub
2. Update the commit hash to match the current HEAD
3. Update the date to current date
4. Update the description with a brief summary of changes
5. Only then proceed with `git push`

**Failure to update version.json is a protocol violation.**

---

## 13. Future Architecture Compatibility Protocol

### Context

TERP is evolving toward a **secure home office architecture** with:

- Air-gapped core server
- VPN-only access (WireGuard)
- Multi-factor authentication (VPN + device certificate + biometric)
- Offline-first Progressive Web App (PWA)
- Redis caching layer
- Comprehensive monitoring (Prometheus + Grafana)

This evolution is planned for **8 weeks / 160 hours** of implementation work.

### The Challenge

How do we continue current development without creating work that will need to be undone or redone when implementing this vision?

### The Solution

All development work MUST be **forward-compatible** with the future architecture by following these protocols.

---

### 13.1 Authentication Abstraction

**Rule:** Use `authProvider` interface, never call authentication provider (Clerk) directly.

**Why:** When we add MFA (multi-factor authentication), we can replace the implementation without changing any calling code.

**Implementation:**

```typescript
// ✅ GOOD - Uses abstraction
import { authProvider } from "../_core/authProvider";
const user = await authProvider.requireAuth(req);

// ❌ BAD - Direct Clerk call (will need refactoring)
import { getAuth } from "@clerk/express";
const { userId } = getAuth(req);
```

**Files:**

- `server/_core/authProvider.ts` - Authentication abstraction interface
- All routers MUST use this interface

**Verification:**

- [ ] No direct Clerk imports in new code
- [ ] All authentication uses `authProvider` interface

---

### 13.2 Data Access Abstraction

**Rule:** Use `dataProvider` interface, never call `getDb()` directly.

**Why:** When we add Redis caching and offline sync, we can intercept all data access without changing business logic.

**Implementation:**

```typescript
// ✅ GOOD - Uses abstraction
import { dataProvider } from "../_core/dataProvider";
const orders = await dataProvider.query(db =>
  db.select().from(orders).where(eq(orders.orgId, orgId))
);

// ❌ BAD - Direct database call (will need refactoring)
import { getDb } from "../db";
const db = await getDb();
const orders = await db.select().from(orders);
```

**Files:**

- `server/_core/dataProvider.ts` - Data access abstraction interface
- All `*Db.ts` files MUST use this interface

**Verification:**

- [ ] No direct `getDb()` calls in new code
- [ ] All data access uses `dataProvider` interface

---

### 13.3 Offline-First API Design

**Rule:** All mutation endpoints MUST return full objects, timestamps, and affected records.

**Why:** Enables optimistic UI updates, conflict resolution, and cache invalidation for offline-first PWA.

**Implementation:**

```typescript
// ✅ GOOD - Offline-friendly response
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const order = await ordersDb.createOrder(input, ctx.user.organizationId);
      return {
        order, // Full object for optimistic update
        affectedRecords: {
          // For cache invalidation
          orders: [order.id],
          inventory: order.items.map(i => i.inventoryId),
        },
        timestamp: new Date(), // For conflict resolution
      };
    }),
});

// ❌ BAD - Not offline-friendly (requires another query)
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const orderId = await ordersDb.createOrder(input);
      return { orderId }; // Client needs to fetch full object!
    }),
});
```

**Required Response Fields:**

- `[resource]`: Full object that was created/updated
- `affectedRecords`: Object mapping resource types to affected IDs
- `timestamp`: ISO timestamp for conflict resolution

**Verification:**

- [ ] Mutation returns full object (not just ID)
- [ ] Response includes `affectedRecords`
- [ ] Response includes `timestamp`

---

### 13.4 Schema Evolution

**Rule:** All schema changes MUST be additive, never breaking.

**Why:** Enables zero-downtime deployments and backward compatibility during the 8-week transition.

**Implementation:**

```typescript
// ✅ GOOD - Additive change (backward compatible)
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  // ... existing fields ...

  // NEW: Nullable for backward compatibility
  mfaEnabled: boolean("mfa_enabled").default(false),
  deviceCertificateRequired: boolean("device_certificate_required").default(
    false
  ),
});

// ❌ BAD - Breaking change (renames field)
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  emailAddress: varchar("email_address", { length: 255 }), // RENAMED - BREAKS CODE!
});
```

**Rules:**

- **NEVER** rename existing columns (add new ones instead)
- **NEVER** delete existing tables (mark as deprecated instead)
- **ALWAYS** make new fields nullable or provide defaults
- **ALWAYS** use migrations for schema changes

**Verification:**

- [ ] No renamed columns
- [ ] No deleted tables
- [ ] New fields are nullable or have defaults
- [ ] Migration file created

---

### 13.5 Code Organization

**Rule:** Routers THIN (< 50 lines per procedure), Business logic in `*Db.ts` files.

**Why:** Keeps authentication, validation, and business logic separated for easier refactoring.

**File Structure:**

```
server/
├── _core/                    # Core infrastructure (abstraction layer)
│   ├── authProvider.ts       # Authentication abstraction
│   ├── dataProvider.ts       # Data access abstraction
│   ├── errors.ts             # Error handling
│   ├── logger.ts             # Logging
│   └── monitoring.ts         # Monitoring
├── auth/                     # Authentication logic (FUTURE: MFA goes here)
│   └── (reserved for future)
├── routers/                  # API endpoints (THIN - just validation & delegation)
│   ├── orders.ts
│   ├── inventory.ts
│   └── ...
├── *Db.ts                    # Business logic (THICK - all logic here)
│   ├── ordersDb.ts
│   ├── inventoryDb.ts
│   └── ...
└── utils/                    # Shared utilities
```

**Router Pattern (THIN):**

```typescript
// ✅ GOOD - Thin router (< 50 lines per procedure)
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      return await ordersDb.createOrder(input, ctx.user.organizationId);
    }),
});

// ❌ BAD - Fat router with business logic
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      // 100+ lines of business logic here - BAD!
      const db = await getDb();
      const order = await db.transaction(async tx => {
        // Complex business logic...
      });
      return order;
    }),
});
```

**Business Logic Pattern (THICK):**

```typescript
// ✅ GOOD - Business logic in ordersDb.ts
export async function createOrder(input: CreateOrderInput, orgId: number) {
  return await dataProvider.transaction(async tx => {
    // All business logic here
    // Validation, calculations, database operations
    // Can be 100+ lines - that's fine!
  });
}
```

**Verification:**

- [ ] Router procedures < 50 lines
- [ ] Business logic in `*Db.ts` files
- [ ] No database queries in routers

---

### 13.6 Pre-Push Compatibility Checklist

**MANDATORY:** Before every `git push`, verify:

**Authentication:**

- [ ] Uses `authProvider` interface (not Clerk directly)
- [ ] No direct authentication provider imports in new code

**Data Access:**

- [ ] Uses `dataProvider` interface (not `getDb()` directly)
- [ ] No direct database access in new code

**API Design:**

- [ ] Mutations return full objects (not just IDs)
- [ ] Responses include `affectedRecords`
- [ ] Responses include `timestamp`

**Schema:**

- [ ] Schema changes are additive only
- [ ] No renamed columns or deleted tables
- [ ] New fields are nullable or have defaults
- [ ] Migration file created

**Code Organization:**

- [ ] Router procedures < 50 lines
- [ ] Business logic in `*Db.ts` files
- [ ] No business logic in routers

**Failure to meet these criteria is a protocol violation.**

---

### 13.7 Reference Documents

**For Detailed Guidance:**

- `docs/PRODUCT_DEVELOPMENT_STRATEGY.md` - Full 8-week implementation strategy
- `docs/MANUS_AGENT_CONTEXT.md` - Quick reference for AI agents
- `docs/TERP_Codebase_Implementation_Specification.md` - Complete future architecture spec

**For Quick Reference:**

- See `docs/MANUS_AGENT_CONTEXT.md` for code examples and patterns

---

## Version History

**v3.0 - October 27, 2025**

- Added Future Architecture Compatibility Protocol (Section 13)
- Documented authentication abstraction requirements
- Documented data access abstraction requirements
- Documented offline-first API design patterns
- Documented schema evolution rules
- Added pre-push compatibility checklist
- Created reference to PRODUCT_DEVELOPMENT_STRATEGY.md
- Created reference to MANUS_AGENT_CONTEXT.md

**v2.1 - October 27, 2025**

- Added Version Management Protocol (MANDATORY)
- Implemented persistent version display in header
- Added version.json for version tracking
- Updated tsconfig.json to support JSON imports

**v2.0 - October 24, 2025**

- Added complete accounting module documentation
- Updated with mobile optimization patterns
- Added 60+ accounting API endpoints
- Documented 10 accounting pages and 6 UI components
- Comprehensive database schema (17 tables total)

**v1.0 - October 23, 2025**

- Initial protocol documentation
- Integrated comprehensive UX/UI research
- Established change management procedures
- Defined production-ready standards
- Created quality checklists

---

## Contact & Feedback

For questions, clarifications, or protocol updates, consult the project maintainer or update this document with team consensus.

**Remember:** These protocols exist to maintain quality, consistency, and system integrity. They are not bureaucratic overhead—they are essential guardrails for sustainable development.

---

## 8. Automated Enforcement Protocol

### Pre-Commit Hooks (MANDATORY)

All developers MUST set up pre-commit hooks to enforce standards automatically.

**Setup:**

```bash
# Install husky
pnpm add -D husky lint-staged

# Initialize
pnpm exec husky init

# Add pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

**Configuration (.lintstagedrc.json):**

```json
{
  "*.{ts,tsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
  "*.{ts,tsx,md,json}": ["prettier --write"]
}
```

**Enforced Checks:**

1. ✅ TypeScript compilation (zero errors)
2. ✅ ESLint rules
3. ✅ Prettier formatting
4. ✅ No console.log in production code
5. ✅ No hardcoded credentials

**Bypass Protocol:**

- Bypassing hooks requires PR comment explanation
- Only bypass for emergency hotfixes
- Must fix in follow-up PR within 24 hours

---

## 9. TypeScript Strictness Protocol

### Current State: Level 1 (Basic)

### Target State: Level 4 (Strict)

**Level 1: Basic (Current)**

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false
  }
}
```

**Level 2: No Implicit Any (Target: 2 weeks)**

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": false
  }
}
```

Action: Fix all implicit any errors

**Level 3: Null Safety (Target: 4 weeks)**

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

Action: Add null checks throughout

**Level 4: Full Strict (Target: 8 weeks)**

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Action: Enable all strict flags

**Enforcement:**

- Cannot merge PR that reduces strictness level
- Each level requires 100% compliance before advancing
- Track progress in `/docs/typescript-strictness-progress.md`

---

## 10. Structured Logging Protocol (MANDATORY)

### Rules

**NEVER:**
❌ Use `console.log()` in production code
❌ Use `console.error()` in production code
❌ Use `console.warn()` in production code

**ALWAYS:**
✅ Use `logger.info()`, `logger.error()`, `logger.warn()`
✅ Include structured context as first argument
✅ Use appropriate log levels

### ESLint Rule

**Add to .eslintrc.json:**

```json
{
  "rules": {
    "no-console": [
      "warn",
      {
        "allow": []
      }
    ]
  }
}
```

### Allowed Exceptions

- Test files (_.test.ts, _.spec.ts)
- Build scripts (scripts/\*.ts)
- Development utilities

### Log Level Guidelines

**DEBUG:** Development-only information

```typescript
logger.debug({ userId, action }, "User action traced");
```

**INFO:** Normal operations, important milestones

```typescript
logger.info({ orderId, total }, "Order created");
```

**WARN:** Recoverable errors, deprecated usage

```typescript
logger.warn({ feature: "oldApi" }, "Using deprecated API");
```

**ERROR:** Errors requiring attention

```typescript
logger.error({ err, orderId }, "Order creation failed");
```

### Context Requirements

Always include:

- Relevant IDs (userId, orderId, etc.)
- Operation context
- Error objects (as `err` property)
- Never: passwords, tokens, sensitive data

---

## 11. Definition of Done (DoD)

Work is NOT complete until ALL criteria are met.

### Code Quality

- [ ] Zero TypeScript errors (`pnpm run check`)
- [ ] Zero ESLint errors
- [ ] Code formatted with Prettier
- [ ] No `any` types added (or justified in PR)
- [ ] No `console.*` calls (use logger)
- [ ] No hardcoded values (use config/env)
- [ ] No TODO comments without GitHub issue

### Testing

- [ ] Unit tests written for new functions
- [ ] Unit tests pass (`pnpm test`)
- [ ] Integration tests for new features
- [ ] Manual testing completed
- [ ] Edge cases considered and tested

### Documentation

- [ ] Code comments for complex logic
- [ ] README updated (if public API changed)
- [ ] Changelog entry added
- [ ] Type definitions exported (if library code)

### Security

- [ ] No credentials in code
- [ ] Input validation added
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] Authentication/authorization checked

### Performance

- [ ] No N+1 queries
- [ ] Large datasets handled efficiently
- [ ] Memory leaks checked
- [ ] Bundle size impact considered

### Review

- [ ] Self-review completed
- [ ] PR description explains changes
- [ ] Screenshots/video for UI changes
- [ ] Breaking changes documented
- [ ] Migration guide (if needed)

### Deployment

- [ ] Builds successfully
- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] Rollback plan documented (if risky)

---


---

## Comprehensive Testing Suite Protocol

**Objective**: Ensure all new code is rigorously tested before reaching production.

### 1. Test Data
- All tests must use the scenario-based seed scripts (`light`, `full`, `edge-cases`).
- For unit tests requiring specific data, create a test fixture in the `testing/fixtures` directory.

### 2. Integration Tests
- All new tRPC routers must have a corresponding integration test file.
- All public procedures must be tested.
- Backend test coverage must remain above 80%.

### 3. End-to-End (E2E) Tests
- All new critical user flows must have a corresponding E2E test.
- E2E tests must include accessibility checks (`checkAccessibility()`).
- All E2E tests must include visual regression checks with `argosScreenshot()`.

### 4. CI/CD
- All tests are run automatically in GitHub Actions.
- No PR will be merged if any tests are failing.

### 5. Product-Led Workflow
- **Engineers**: Implement tests based on user flows defined by the product owner.
- **Product Owner**: Defines user flows and validates visual changes in Argos.

### 6. Testing Suite Hub
- All testing documentation, prompts, and configurations are located in the `.manus` directory.
- The main entry point for the testing suite is `TESTING_README.md`.
