# TERP Master Roadmap
## Single Source of Truth for All Development

**Version:** 1.0
**Last Updated:** November 12, 2025
**Status:** Active

---

## 🎯 Current Sprint (This Week: Nov 12-18, 2025)

### 🔴 HIGH PRIORITY

- [x] **Complete Codebase Analysis** (Claude-Session-011CV4V)
  - Status: Completed
  - Delivered: Comprehensive analysis report
  - Deployed: N/A (documentation only)

- [~] **Integrate Technical Debt Roadmap** (Claude-Session-20251112-roadmap-1cf97d3c) 🔴 HIGH
  - Status: In Progress
  - Task: Add comprehensive 4-phase technical debt plan to roadmap
  - Includes: Critical security fixes, stabilization, refactoring
  - Estimate: 30 minutes

- [ ] **Implement Abstraction Layer** (Unassigned) 🔴 URGENT
  - Create `server/_core/authProvider.ts`
  - Create `server/_core/dataProvider.ts`
  - Critical for future architecture
  - Blocks: Redis caching, offline-first, MFA
  - Estimate: 2-3 days
  - Priority: MUST DO FIRST

- [ ] **Refactor Thick Routers** (Unassigned) 🟡 MEDIUM
  - `server/routers/vipPortal.ts` (49 KB)
  - `server/routers/vipPortalAdmin.ts` (40 KB)
  - `server/routers/accounting.ts` (28 KB)
  - Extract business logic to `*Db.ts` files
  - Estimate: 3-4 days
  - Depends on: Abstraction layer

### 🟡 MEDIUM PRIORITY

- [ ] **Complete Default Values Seeding** (Unassigned)
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
- ✅ Completed: 18+ major modules
- 🔄 In Progress: 1 task (analysis)
- 📋 This Sprint: 3 tasks
- 🔜 Next Sprint: 4 tasks
- 📦 Backlog: 12 items
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

---

## 🎯 Priority Decision Framework

**When adding new tasks, use this framework:**

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

**Maintained By:** Claude + Evan
**Review Frequency:** Weekly
**Last Review:** 2025-11-12
