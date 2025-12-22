# 📋 TERP Technical Debt Registry

**Last Reviewed**: 2025-12-19  
**Next Review**: 2025-12-27 (Weekly Friday)

---

## How to Use This File

1. **When taking a shortcut**: Add entry to "Active Technical Debt"
2. **When fixing debt**: Move to "Resolved Technical Debt" with resolution notes
3. **Weekly review (Friday)**: Check if any "Harden by" conditions are met
4. **Before releases**: Address all 🔴 HIGH risk items

**Related Protocol**: `.kiro/steering/11-mvp-iteration-protocol.md`

---

## Risk Levels

| Level | Definition | Action Required |
|-------|------------|-----------------|
| 🔴 HIGH | Data loss, security issue, major UX problem | Fix within 1 week |
| 🟡 MEDIUM | Problems at scale, degraded experience | Fix before threshold hit |
| 🟢 LOW | Minor inconvenience, cosmetic, unlikely | Fix when convenient |

---

## Active Technical Debt

### Template (copy for new entries)
```markdown
### [DEBT-XXX] Brief description
- **Feature**: Module/feature name
- **Maturity**: 🧪 EXPERIMENTAL / 🔨 FUNCTIONAL / 🏛️ HARDENED
- **Shortcut**: What was skipped or done quickly
- **Risk**: 🔴 HIGH / 🟡 MEDIUM / 🟢 LOW - Explanation
- **Harden by**: Specific trigger (e.g., "Before 500 clients", "Before launch")
- **Effort**: Estimated hours to fix
- **Created**: YYYY-MM-DD
- **Owner**: (optional) Who should fix this
```

---

### Active Items

### [DEBT-001] Redundant clients.list queries across pages
- **Feature**: Multiple pages (Orders, Quotes, PurchaseOrders, SalesSheetCreator, OrderCreator)
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Each page fetches `trpc.clients.list.useQuery({ limit: 1000 })` independently
- **Risk**: 🟡 MEDIUM - Redundant API calls, increased server load, slower page loads
- **Harden by**: Before 100+ concurrent users
- **Effort**: 2h - Migrate pages to use `useClientsData` hook (hook already created)
- **Created**: 2025-12-22
- **Notes**: 
  - Found in Orders.tsx, Quotes.tsx, PurchaseOrdersPage.tsx, SalesSheetCreatorPage.tsx, OrderCreatorPage.tsx
  - **SOLUTION CREATED**: `client/src/hooks/useClientsData.ts` provides shared hook with caching
  - Migration: Replace `trpc.clients.list.useQuery({ limit: 1000 })` with `useClientsData()`
  - React Query already deduplicates concurrent requests, but hook provides consistent interface

### [DEBT-002] z.any() usage in configuration.ts router
- **Feature**: Configuration router
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for config values and validation input
- **Risk**: 🟢 LOW - Internal admin endpoint, not user-facing
- **Harden by**: Before exposing configuration API externally
- **Effort**: 2h - Replace with configValueSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-003] z.any() usage in orderEnhancements.ts router
- **Feature**: Order enhancements (recurring orders)
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for orderTemplate field
- **Risk**: 🟢 LOW - Template structure is flexible by design
- **Harden by**: Before recurring orders feature goes to production
- **Effort**: 2h - Replace with orderTemplateSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-004] z.any() usage in clientNeedsEnhanced.ts router
- **Feature**: Client needs matching
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for matches array
- **Risk**: 🟢 LOW - Internal matching logic
- **Harden by**: Before marketplace feature launch
- **Effort**: 2h - Replace with matchRecordsArraySchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-005] z.any() usage in dashboard.ts router
- **Feature**: Dashboard widgets
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for widget config
- **Risk**: 🟢 LOW - Internal dashboard configuration
- **Harden by**: Before dashboard customization feature launch
- **Effort**: 1h - Replace with dashboardWidgetConfigSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-006] z.any() usage in freeformNotes.ts router
- **Feature**: Freeform notes (rich text)
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for rich text content
- **Risk**: 🟢 LOW - Content is sanitized on display
- **Harden by**: Before notes feature goes to production
- **Effort**: 2h - Replace with noteContentSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-007] z.any() usage in inventory.ts router (saved filters)
- **Feature**: Inventory saved filters
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for filter JSON object
- **Risk**: 🟢 LOW - Internal filter storage
- **Harden by**: Before saved filters feature launch
- **Effort**: 1h - Replace with savedFilterSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-008] z.any() usage in clients.ts router (metadata)
- **Feature**: Client transactions metadata
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for transaction metadata
- **Risk**: 🟢 LOW - Flexible metadata storage
- **Harden by**: Before client transactions feature hardening
- **Effort**: 1h - Replace with configObjectSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

---

## Resolved Technical Debt

<!-- Move resolved items here with resolution notes -->

### Template for resolved items
```markdown
### [DEBT-XXX] Brief description ✅
- **Resolved**: YYYY-MM-DD
- **Resolution**: How it was fixed
- **Commits**: `abc1234`
- **Original entry**: (copy from above)
```

---

*No resolved debt entries yet.*

---

## Debt Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total active debt items | 8 | < 20 |
| HIGH risk items | 0 | 0 |
| MEDIUM risk items | 1 | < 10 |
| LOW risk items | 7 | - |
| Oldest unresolved item | 2025-12-22 | < 30 days |

---

## Review Log

| Date | Reviewer | Items Reviewed | Actions Taken |
|------|----------|----------------|---------------|
| 2025-12-22 | QUAL-002/DATA-004 Sprint | 8 items added | Audit of z.any() usage and redundant queries |
| 2025-12-19 | System | Initial setup | Created registry |

---

## Quick Commands

```bash
# Count active debt items
grep -c "### \[DEBT-" docs/TECHNICAL_DEBT.md

# Find HIGH risk items
grep -A5 "Risk.*HIGH" docs/TECHNICAL_DEBT.md

# Find items by feature
grep -A10 "Feature.*Orders" docs/TECHNICAL_DEBT.md
```
