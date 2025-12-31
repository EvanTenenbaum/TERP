# REFACTOR-001: Codebase Duplication & Consistency Cleanup
## Progress Report - Foundation Stabilization Sprint

**Date:** December 31, 2025
**Status:** Partial Progress (Phase 3 items addressed)

---

## Phase 3 Items (Addressed This Sprint)

### ✅ Standardize TRPC Imports
- All routers now use `../_core/trpc` for procedure imports
- `TRPCError` correctly imported from `@trpc/server`
- Fixed 7 routers with incorrect import paths in earlier sprint work

### ✅ Empty State Component Consistency
- All components use `@/components/ui/empty-state`
- No legacy `empty.tsx` imports found
- Consistent pattern across dashboard widgets and pages

### ✅ Authorization Strategy
- All admin endpoints use `adminProcedure` (BUG-035 fix)
- All protected endpoints use `protectedProcedure`
- VIP Portal uses dedicated `vipPortalProcedure`

---

## Deferred to Future Sprint

### Phase 1: High-Impact Consolidation (8h)
- [ ] Merge inventory routers (`inventory.ts`, `inventoryMovements.ts`, `inventoryShrinkage.ts`)
- [ ] Merge audit log tables into central `auditLogs`
- [ ] Deprecate `dashboard.ts` in favor of `dashboardEnhanced.ts`

**Risk:** HIGH - Requires extensive testing and migration

### Phase 2: Schema & Naming Cleanup (8h)
- [ ] Rename `batches` table to `inventory`
- [ ] Create `vendor_notes` join table
- [ ] Rename `customerPreferences.ts` to `clientPreferences.ts`

**Risk:** HIGH - Breaking changes to schema

---

## Recommendations

1. **Schedule dedicated refactoring sprint** - 2 weeks with full test coverage
2. **Create migration scripts** - For schema changes
3. **Feature flag approach** - Gradual rollout of consolidated routers
4. **Comprehensive testing** - E2E tests before and after

---

## Current Codebase Health

| Metric | Status |
|--------|--------|
| TRPC imports | ✅ Consistent |
| Empty state usage | ✅ Consistent |
| Authorization | ✅ Consistent |
| Router organization | ⚠️ Some duplication |
| Schema naming | ⚠️ Mixed conventions |

---

## Next Steps

1. Complete Foundation Sprint (current)
2. Schedule REFACTOR-001 Phase 1 for next sprint
3. Create comprehensive test suite before refactoring
