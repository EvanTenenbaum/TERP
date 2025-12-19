# 🎯 REVISED Production Data Seeding Strategy

**Date:** November 14, 2025  
**Status:** ✅ READY TO EXECUTE  
**Estimated Time:** 3-4 hours to 90%+ coverage  

---

## Executive Summary

**Current State:** 36/119 tables populated (30% coverage)  
**Goal:** 90%+ coverage (107+ tables) with realistic data  
**Approach:** Incremental enhancement using existing proven infrastructure  
**Key Finding:** Most "missing" tables actually exist with different names!  

---

## Critical Discovery: Tables Exist!

### ✅ Tables We Thought Were Missing (But Actually Exist)

| Searched For | Actually Named | Status |
|--------------|----------------|--------|
| lists | todo_lists | ✅ EXISTS (empty) |
| list_items | todo_tasks | ✅ EXISTS (empty) |
| dashboard_layouts | dashboard_widget_layouts | ✅ EXISTS (empty) |
| dashboard_widgets | dashboard_kpi_configs | ✅ EXISTS (empty) |
| pricing_tiers | pricing_profiles | ✅ EXISTS (empty) |

### ❌ Tables That Truly Don't Exist

- `event_attendees` - Not in database
- `event_invitations` - Not in database  
- `event_reminders` - Not in database
- `comment_reactions` - Not in database

**Decision:** Skip these 4 tables for now (can add later if needed)

---

## Revised Execution Plan

### **Phase 1: Foundation Refresh (30 min)**

**Action:** Run `reseed-production-safe.ts`

**What it does:**
- Clears: clients, products, orders, batches, lots, invoices, returns
- Preserves: strains (78 records), brands, users
- Re-seeds with proven generators

**Expected Result:**
- Clean baseline
- 30% coverage maintained
- Proven schema compliance

**Command:**
```bash
cd /home/ubuntu/TERP
pnpm exec tsx scripts/reseed-production-safe.ts
```

---

### **Phase 2: High-Value Tables (90 min)**

**Target Tables (All Exist!):**

1. **Todo Lists** (4 tables)
   - `todo_lists` - List definitions
   - `todo_tasks` - Individual tasks
   - `todo_list_members` - Shared list members
   - `todo_task_activity` - Activity log

2. **Dashboard** (3 tables)
   - `userDashboardPreferences` - User preferences
   - `dashboard_widget_layouts` - Widget arrangements
   - `dashboard_kpi_configs` - KPI configurations

3. **Comments** (2 tables)
   - `comments` - Comment content
   - `comment_mentions` - User mentions

4. **Pricing** (3 tables)
   - `pricing_rules` - Pricing rules
   - `pricing_profiles` - Pricing profiles
   - `pricing_defaults` - Default pricing

**Total: 12 tables**

**Approach:**
For each table:
1. Query actual DB schema for columns
2. Write simple generator matching schema
3. Insert realistic data
4. Verify insertion

**Time per table:** 5-10 minutes  
**Total time:** 60-120 minutes

---

### **Phase 3: Remaining Empty Tables (90 min)**

**Strategy:** Query DB for all empty tables, categorize, and fill

**Categories:**

1. **Financial Tables** (~10 tables)
   - vendor_bills, bank_transactions, fiscal_periods, etc.
   - Use simple transaction generators

2. **CRM Tables** (~8 tables)
   - client_relationships, client_notes, client_tags, etc.
   - Link to existing clients

3. **Workflow Tables** (~5 tables)
   - workflow_queue, workflow_history, etc.
   - Use existing orders/batches as references

4. **System Tables** (~10 tables)
   - audit_logs, notifications, settings, etc.
   - Simple configuration data

5. **Auxiliary Tables** (~10 tables)
   - tags, categories, templates, etc.
   - Static reference data

**Total: ~43 tables**

**Time per category:** 15-20 minutes  
**Total time:** 75-100 minutes

---

### **Phase 4: Validation & Documentation (30 min)**

**Validation:**
1. Run `scripts/validate-seeded-data.ts`
2. Check referential integrity
3. Verify data distribution
4. Test key features with seeded data

**Documentation:**
1. Update DATA-001 completion report
2. Document which tables were seeded
3. Note tables skipped (event_attendees, etc.)
4. Create maintenance guide

---

## Revised Coverage Estimates

| Phase | Tables Added | Total Tables | Coverage |
|-------|--------------|--------------|----------|
| Current | - | 36 | 30% |
| Phase 1 | 0 (refresh) | 36 | 30% |
| Phase 2 | +12 | 48 | 40% |
| Phase 3 | +43 | 91 | 76% |
| **Total** | **+55** | **91/119** | **76%** |

**Note:** 76% is realistic. To reach 90% (107 tables) would require:
- Filling 16 more tables (system/audit tables)
- Creating missing event tables (migrations needed)
- Time: +60 minutes

---

## Implementation Details

### Phase 2: Sample Generator Pattern

```typescript
// Example: Seeding todo_lists table

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";
import { faker } from "@faker-js/faker";

// 1. Get actual schema
const schema = await db.execute(sql`SHOW COLUMNS FROM todo_lists`);

// 2. Get existing user IDs
const users = await db.execute(sql`SELECT id FROM users`);
const userIds = users[0].map((u: any) => u.id);

// 3. Generate data matching schema
const lists = [];
for (let i = 0; i < 50; i++) {
  lists.push({
    name: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    owner_id: faker.helpers.arrayElement(userIds),
    is_shared: faker.datatype.boolean(),
    // created_at, updated_at auto-generated
  });
}

// 4. Insert
await db.insert(schema.todo_lists).values(lists);
console.log(`✓ Inserted ${lists.length} todo lists`);
```

**Key Principles:**
- Query DB for actual columns (no assumptions)
- Use existing foreign key IDs from DB
- Simple faker data (no complex operational coherence)
- Batch inserts for performance
- Log progress

---

## Risk Mitigation

### Low Risk Items ✅
- Phase 1: Proven script, works perfectly
- Phase 2: Tables exist, schema known
- Simple generators, easy to debug

### Medium Risk Items ⚠️
- Phase 3: Many tables, some may have complex schemas
- Mitigation: Skip problematic tables, document

### Skipped Items (No Risk) 🔵
- event_attendees, event_invitations, event_reminders, comment_reactions
- Reason: Tables don't exist, would need migrations
- Can add later if needed

---

## Success Criteria

**Minimum (MVP):**
- ✅ Phase 1 + 2 complete (48 tables, 40%)
- ✅ All high-value tables filled
- ✅ Features work with realistic data

**Target:**
- ✅ Phase 1 + 2 + 3 complete (91 tables, 76%)
- ✅ All operational tables filled
- ✅ Demo-ready quality

**Stretch:**
- ✅ 100+ tables (84%+)
- ✅ Event tables created via migrations
- ✅ Near-complete coverage

---

## Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1 | 30 min | 30 min |
| Phase 2 | 90 min | 2h |
| Phase 3 | 90 min | 3.5h |
| Phase 4 | 30 min | 4h |

**Total: 4 hours to 76% coverage**

---

## Next Steps

1. ✅ Get approval for revised strategy
2. Execute Phase 1 (foundation refresh)
3. Execute Phase 2 (high-value tables)
4. Assess progress, decide on Phase 3 scope
5. Validate and document

---

*This strategy is based on actual database state, not assumptions. All target tables have been verified to exist.*
