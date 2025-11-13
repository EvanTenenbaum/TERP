# TERP Master Roadmap
## Single Source of Truth for All Development

**Version:** 2.0
**Last Updated:** November 12, 2025
**Status:** Active

---

## 🎯 Current Sprint (This Week: Nov 12-18, 2025)

### 🔴 CRITICAL PRIORITY - Phase 1: Critical Lockdown (1-2 Days)

**Objective:** Immediately patch all critical security and data integrity vulnerabilities.

- [ ] **CL-001: Fix SQL Injection Vulnerability** (Unassigned) 🔴 CRITICAL
  - Task ID: CL-001
  - File: `server/routers/advancedTagFeatures.ts`
  - Action: Rewrite to use parameterized queries
  - Security Risk: HIGH - SQL injection vulnerability
  - Estimate: 2-3 hours
  - Priority: MUST DO IMMEDIATELY

- [ ] **CL-002: Purge Secrets from Git History** (Unassigned) 🔴 CRITICAL
  - Task ID: CL-002
  - File: `.env.backup` in Git history
  - Action: Use BFG Repo-Cleaner to remove from history, rotate all secrets
  - Security Risk: HIGH - Exposed credentials
  - Estimate: 1-2 hours
  - Priority: MUST DO IMMEDIATELY

- [ ] **CL-003: Secure Admin Endpoints** (Unassigned) 🔴 CRITICAL
  - Task ID: CL-003
  - Files: 6 admin routers
  - Action: Replace `publicProcedure` with `adminProcedure` in all admin routers
  - Security Risk: HIGH - Unauthorized access to admin functions
  - Estimate: 2-3 hours
  - Priority: MUST DO IMMEDIATELY

- [ ] **CL-004: Delete Duplicate Schema** (Unassigned) 🔴 CRITICAL
  - Task ID: CL-004
  - File: `drizzle/schema_po_addition.ts`
  - Action: Remove duplicate schema file
  - Risk: Data integrity issues
  - Estimate: 30 minutes
  - Priority: MUST DO IMMEDIATELY

### 🔴 HIGH PRIORITY

- [x] **Complete Codebase Analysis** (Claude-Session-011CV4V)
  - Status: Completed
  - Delivered: Comprehensive analysis report
  - Deployed: N/A (documentation only)

- [x] **Integrate Technical Debt Roadmap** (Deployed: 2025-11-12)
  - Session: Claude-20251112-roadmap-1cf97d3c
  - Delivered: MASTER_ROADMAP.md v2.0 with 19 new tasks
  - Added: 4-phase technical debt plan (Critical Lockdown, Stabilization, Refactoring, Continuous Improvement)
  - Status: Merged to main

- [ ] **Implement Abstraction Layer** (Unassigned) 🔴 URGENT
  - Create `server/_core/authProvider.ts`
  - Create `server/_core/dataProvider.ts`
  - Critical for future architecture
  - Blocks: Redis caching, offline-first, MFA
  - Estimate: 2-3 days
  - Priority: MUST DO AFTER CRITICAL LOCKDOWN

### 🟡 MEDIUM PRIORITY - Phase 2: Stabilization (1 Week)

**Objective:** Improve developer experience by cleaning up documentation, removing dead code, and fixing high-impact architectural issues.

- [ ] **ST-001: Consolidate .env Files** (Unassigned) 🟡 MEDIUM
  - Task ID: ST-001
  - Action: Create single accurate `.env.example`, delete all others
  - Impact: Improved developer onboarding
  - Estimate: 1 hour

- [ ] **ST-002: Implement Global Error Handling** (Unassigned) 🟡 MEDIUM
  - Task ID: ST-002
  - Action: Add tRPC error handling middleware
  - Impact: Better error tracking and debugging
  - Estimate: 3-4 hours

- [ ] **ST-003: Consolidate Documentation** (Unassigned) 🟡 MEDIUM
  - Task ID: ST-003
  - Action: Move 60+ markdown files to `docs/archive/`
  - Impact: Cleaner documentation structure
  - Estimate: 2 hours

- [ ] **ST-004: Remove Outdated References** (Unassigned) 🟡 MEDIUM
  - Task ID: ST-004
  - Action: Remove all Railway and Butterfly Effect references
  - Impact: Reduced confusion
  - Estimate: 1-2 hours

- [ ] **ST-005: Add Missing Database Indexes** (Unassigned) 🟡 MEDIUM
  - Task ID: ST-005
  - Action: Audit all foreign keys and add missing indexes
  - Impact: Improved query performance
  - Estimate: 4-6 hours

- [ ] **ST-006: Remove Dead Code** (Unassigned) 🟡 MEDIUM
  - Task ID: ST-006
  - Files: `clientNeeds.ts`, `ComponentShowcase.tsx`, `cogsManagement.ts`, 29 unused routers
  - Action: Delete unused files and routers
  - Impact: Reduced codebase complexity
  - Estimate: 2-3 hours

- [ ] **Refactor Thick Routers** (Unassigned) 🟡 MEDIUM
  - `server/routers/vipPortal.ts` (49 KB)
  - `server/routers/vipPortalAdmin.ts` (40 KB)
  - `server/routers/accounting.ts` (28 KB)
  - Extract business logic to `*Db.ts` files
  - Estimate: 3-4 days
  - Depends on: Abstraction layer

- [ ] **Complete Default Values Seeding** (Unassigned) 🟡 MEDIUM
  - Storage locations seeding
  - Product categories & subcategories
  - Product grades seeding
  - Expense categories seeding
  - Chart of accounts seeding
  - Master seed script
  - Estimate: 2-3 days
  - Nice to have: Improves UX

---

## 🔜 Next Sprint (Nov 19-Dec 2, 2025)

### Phase 3: Refactoring (2-3 Weeks)

**Objective:** Refactor the codebase for better performance, maintainability, and type safety.

- [ ] **RF-001: Consolidate Orders Router** (Unassigned)
  - Task ID: RF-001
  - Action: Merge `orders` and `ordersEnhancedV2` into a single router
  - Impact: Reduced complexity, better maintainability
  - Estimate: 1-2 days

- [ ] **RF-002: Implement Dashboard Pagination** (Unassigned)
  - Task ID: RF-002
  - Action: Add pagination to the `getInvoices` call in the dashboard
  - Impact: Better performance for large datasets
  - Estimate: 4-6 hours

- [ ] **RF-003: Systematically Fix `any` Types** (Unassigned)
  - Task ID: RF-003
  - Action: Start with the top 10 files with the most `any` types
  - Impact: Improved type safety
  - Estimate: 1-2 days

- [ ] **RF-004: Add React.memo to Components** (Unassigned)
  - Task ID: RF-004
  - Action: Identify and memoize the most frequently re-rendered components
  - Impact: Improved rendering performance
  - Estimate: 1-2 days

- [ ] **RF-005: Refactor Oversized Files** (Unassigned)
  - Task ID: RF-005
  - Files: `vipPortal.ts`, `LiveCatalog.tsx`
  - Action: Break down into smaller, more manageable files
  - Impact: Better maintainability
  - Estimate: 2-3 days

- [ ] **RF-006: Remove Unused Dependencies** (Unassigned)
  - Task ID: RF-006
  - Action: Uninstall Clerk and Socket.io
  - Impact: Reduced bundle size
  - Estimate: 1-2 hours

### Performance & Architecture

- [ ] **Implement Redis Caching Layer**
  - Depends on: `dataProvider` abstraction
  - Add cache invalidation logic
  - Implement predictive prefetching
  - Estimate: 4-5 days
  - Impact: 3-5x performance improvement

- [ ] **Add Offline-First PWA**
  - Service worker implementation
  - IndexedDB caching
  - Optimistic UI updates
  - Conflict resolution
  - Estimate: 1 week
  - Depends on: Caching layer

### Cannabis-Specific Features

- [ ] **Enhance COA Management**
  - Move from JSON metadata to dedicated table
  - Lab integration API (if needed)
  - Automatic compliance checking (optional)
  - Estimate: 3-4 days

- [ ] **Add METRC Integration** (Optional)
  - Only if targeting retail markets
  - Cannabis compliance platform integration
  - Create `server/services/metrcService.ts`
  - Estimate: 1 week
  - Priority: TBD based on business needs

---

## 📦 Backlog (On Hold - Don't Forget)

### Phase 4: Continuous Improvement (Ongoing)

**Objective:** Establish a culture of quality and continuous improvement.

- [ ] **CI-001: Convert TODOs to Backlog Tickets** (Unassigned)
  - Task ID: CI-001
  - Action: Create tickets for all 84+ `TODO` comments
  - Impact: Better task tracking
  - Estimate: 2-3 hours
  - Priority: LOW

- [ ] **CI-002: Complete Incomplete Features** (Unassigned)
  - Task ID: CI-002
  - Modules: Dashboard, calendar, COGS
  - Action: Address missing logic in incomplete features
  - Impact: Feature completeness
  - Estimate: Varies by feature
  - Priority: LOW

- [ ] **CI-003: Improve Test Coverage** (Unassigned)
  - Task ID: CI-003
  - Action: Add tests for all new features and refactored code
  - Impact: Better code quality and confidence
  - Estimate: Ongoing
  - Priority: LOW

### Architectural Debt

- [ ] **Migrate 20+ Files to Abstraction Layer**
  - Reason: Technical debt from missing abstractions
  - Context: Replace direct `getDb()` calls with `dataProvider`
  - Priority: Medium (do gradually)
  - Estimate: 1-2 days per 5 files
  - Added: 2025-11-12

### User Decision Required

- [ ] **Payment Processing Integration**
  - Reason: Need to select provider
  - Options: Stripe, Square, PayPal, or none
  - Context: Currently just tracking payment methods
  - Priority: Low (customizable payment methods work fine)
  - Added: From previous sessions

- [ ] **Email Notification System**
  - Reason: User feedback says "no internal messaging"
  - Context: External email only (SendGrid, Mailgun, etc.)
  - Priority: Low (nice to have)
  - Added: From previous sessions

### Future Phases (Phase 3+)

- [ ] **Multi-Factor Authentication (MFA)**
  - Phase: 3
  - Depends on: `authProvider` abstraction
  - Context: VPN + device cert + biometric
  - Priority: Low (current Clerk auth is fine)
  - Estimate: 1 week

- [ ] **Air-Gapped Home Office Deployment**
  - Phase: 4
  - Context: VPN-only access, home server deployment
  - Priority: Low (current DO deployment works)
  - Estimate: 2 weeks
  - See: PRODUCT_DEVELOPMENT_STRATEGY.md

- [ ] **Mobile Native App**
  - Phase: 5+
  - Context: iOS/Android native apps
  - Priority: Very Low (PWA may be sufficient)
  - Estimate: 2-3 months

### Explicitly Excluded (Per User Feedback)

These should **NOT** be built:

- ❌ Tax reporting automation
- ❌ Rush order flagging
- ❌ Batch transfers between locations
- ❌ Sample follow-up reminders
- ❌ Client tier management
- ❌ Pricing rule engine (complex)
- ❌ Manager approval workflows (not needed yet)
- ❌ User role restrictions (RBAC covers this)
- ❌ Credit memos (only receipts matter)
- ❌ Internal messaging system
- ❌ Backorders
- ❌ Payment processing rails (methods only)

---

## ✅ Completed (Last 30 Days)

### November 2025

- [x] **Integrate Technical Debt Roadmap** (2025-11-12)
  - Session: Claude-20251112-roadmap-1cf97d3c
  - Deliverables:
    - Comprehensive 4-phase technical debt plan
    - Critical security vulnerabilities identified
    - Stabilization and refactoring roadmap
  - Status: Delivered

- [x] **Comprehensive Codebase Analysis** (2025-11-12)
  - Session: Claude-011CV4V
  - Deliverables:
    - Complete architecture analysis
    - THCA-specific requirements assessment
    - Protocol compliance evaluation
    - Recommendations for next priorities
  - Status: Delivered

- [x] **DigitalOcean MCP Server Setup** (2025-11-12)
  - Session: Claude-011CV4V
  - Deliverables:
    - MCP server configuration
    - Documentation for setup
    - API key integration
  - Status: Configured (needs session restart to activate)

### October 2025

- [x] **Product Intake Flow** (Priority Feature) (2025-10-26)
  - Batch-by-batch processing
  - Internal & vendor notes
  - COGS agreement tracking
  - Automatic inventory updates
  - Vendor receipt generation
  - Status: Production-ready

- [x] **Recurring Orders System** (2025-10-26)
  - Flexible scheduling
  - Order templates
  - Automatic generation
  - Client notifications
  - Status: Production-ready

- [x] **Advanced Tag Features** (2025-10-26)
  - Boolean search (AND/OR/NOT)
  - Tag hierarchy
  - Tag groups
  - Bulk operations
  - Status: Production-ready

- [x] **Sample Management** (2025-10-25)
  - Sample request tracking
  - Fulfillment workflow
  - Sample-to-sale conversion
  - Cost accounting
  - Analytics
  - Status: Production-ready

- [x] **Dashboard Enhancements** (2025-10-24)
  - Inventory alerts
  - Sales performance metrics
  - AR aging
  - Profitability metrics
  - Data export
  - Status: Production-ready

- [x] **Sales Sheet Enhancements** (2025-10-23)
  - Version control
  - Clone & modify
  - Expiration dates
  - Bulk order creation
  - Usage statistics
  - Status: Production-ready

---

## 📊 Roadmap Statistics

**Overall Progress:**
- ✅ Completed: 19+ major modules
- 🔄 In Progress: 0 tasks
- 📋 This Sprint: 13 tasks (4 critical, 9 high/medium)
- 🔜 Next Sprint: 10 tasks
- 📦 Backlog: 15 items
- ❌ Excluded: 12 items

**Code Health:**
- TypeScript Errors: 0
- Test Coverage: 80%+
- Database Tables: 60+
- API Routers: 68
- Lines of Code: ~150,000+

**Deployment Status:**
- Production URL: https://terp-app-b9s35.ondigitalocean.app
- Last Deploy: Auto (on every merge to main)
- Deploy Success Rate: 95%+
- Average Deploy Time: 3-5 minutes

**Security Status:**
- 🔴 Critical Vulnerabilities: 4 (CL-001 through CL-004)
- 🟡 High Priority Issues: 6 (ST-001 through ST-006)
- Action Required: Immediate attention to Phase 1 tasks

---

## 🎯 Priority Decision Framework

**When adding new tasks, use this framework:**

### 🔴 CRITICAL Priority (Do Immediately)
- Security vulnerabilities
- Data integrity issues
- Production-breaking bugs
- **Examples:** SQL injection, exposed secrets, unauthorized access

### 🔴 HIGH Priority (Do This Sprint)
- Blocks other work
- Critical bug or security issue
- User explicitly requested as urgent
- Technical debt causing pain
- **Examples:** Abstraction layer, critical bugs

### 🟡 MEDIUM Priority (Do Next Sprint)
- Improves performance significantly
- Enhances user experience
- Reduces technical debt
- Nice-to-have features with high value
- **Examples:** Redis caching, COA enhancements

### 🟢 LOW Priority (Backlog)
- Nice to have, not urgent
- Future phase work
- Needs user decision
- Low value or high effort
- **Examples:** Email notifications, mobile app

### ⚫ EXCLUDED (Don't Build)
- User explicitly said not needed
- Out of scope
- Violates system philosophy
- **Examples:** See "Explicitly Excluded" above

---

## 🔄 Roadmap Update Protocol

### When Claude Updates

**Before starting task:**
```markdown
- [~] Task name (Claude-SessionID) 🔴 Priority
```

**After completing task:**
```markdown
- [x] Task name (Deployed: 2025-11-12)
```

**If blocked:**
```markdown
- [!] Task name (Blocked by: reason)
```

### When User Updates

**Adding new task:**
1. Pick priority level (🔴/🟡/🟢)
2. Add to appropriate section
3. Include estimate if known
4. Note dependencies if any

**Moving to backlog:**
1. Move from sprint to backlog
2. Add reason for hold
3. Add context for future reference
4. Set review date if applicable

**Removing task:**
1. Strike through with ~~strikethrough~~
2. Add reason for removal
3. Move to "Explicitly Excluded" if rejected

---

## 📞 Questions?

**For roadmap questions:**
- Check CLAUDE_WORKFLOW.md for process
- Check DEVELOPMENT_PROTOCOLS.md for rules
- Ask Claude to update roadmap based on your feedback

**For priority questions:**
- Use decision framework above
- When in doubt, mark as 🟡 MEDIUM
- Claude will ask for clarification if needed

---

## 📋 4-Phase Technical Debt Plan Summary

This roadmap now includes a comprehensive 4-phase plan to address all technical debt, security vulnerabilities, and architectural issues:

1. **Phase 1: Critical Lockdown (1-2 Days)** - Immediate security patches (CL-001 through CL-004)
2. **Phase 2: Stabilization (1 Week)** - Documentation cleanup, dead code removal (ST-001 through ST-006)
3. **Phase 3: Refactoring (2-3 Weeks)** - Architecture improvements, performance optimization (RF-001 through RF-006)
4. **Phase 4: Continuous Improvement (Ongoing)** - Quality culture, test coverage (CI-001 through CI-003)

**The Goal:** Transform TERP from a feature-rich but brittle application into a robust, secure, and maintainable platform, setting the stage for future growth and scalability.

---

**Maintained By:** Claude + Evan
**Review Frequency:** Weekly
**Last Review:** 2025-11-12
