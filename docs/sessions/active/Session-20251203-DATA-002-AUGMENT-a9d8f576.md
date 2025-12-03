# Session: DATA-002-AUGMENT - Augment Seeded Data for Realistic Relationships

**Task ID:** DATA-002-AUGMENT  
**Agent:** External (Claude/Cursor)  
**Started:** 2025-12-03  
**Expected Completion:** 2025-12-03  
**Module:** `scripts/seed-*.ts`, Database  
**Priority:** HIGH  
**Estimate:** 6-8h

---

## Progress

- [ ] Phase 1: Pre-Flight Check
  - [ ] Register session
  - [ ] Verify environment
  - [ ] Verify database access
- [ ] Phase 2: Session Startup
  - [ ] Create feature branch
  - [ ] Understand current data state
  - [ ] Update roadmap status
- [ ] Phase 3: Development
  - [ ] Create referential integrity audit script
  - [ ] Run audit and document findings
  - [ ] Create data augmentation scripts
  - [ ] Implement augmentation logic
  - [ ] Create validation test suite
  - [ ] Run augmentation scripts
  - [ ] Verify results
- [ ] Phase 4: Completion
  - [ ] Verify all deliverables
  - [ ] Create completion report
  - [ ] Update roadmap to complete
  - [ ] Archive session
  - [ ] Push to main

---

## Notes

- Following TDD approach where applicable
- Database-first approach (database is source of truth)
- Must ensure all foreign key relationships are complete
- Must establish realistic business logic relationships
- Must validate referential integrity across all tables

## Files to Create/Edit

- `scripts/audit-data-relationships.ts` (new)
- `scripts/augment-orders.ts` (new)
- `scripts/augment-inventory-movements.ts` (new)
- `scripts/augment-financial-chains.ts` (new)
- `scripts/augment-client-relationships.ts` (new)
- `scripts/fix-temporal-coherence.ts` (new)
- `scripts/validate-data-quality.ts` (new)
- `docs/DATA-002-AUDIT-REPORT.md` (new)
- `docs/roadmaps/MASTER_ROADMAP.md` (update status)
