# DATA Tasks - Copy-Paste Agent Prompts

## Overview

These prompts are for seeding additional database tables with realistic, production-quality data. Both tasks depend on INFRA-003 being completed first.

**Prerequisites:**

- INFRA-003 must be complete (schema sync fixed)
- All prompts follow strict TERP protocols
- Full implementation details in `docs/prompts/DATA-00X.md`

---

## Agent 1: Comments & Dashboard Data (DATA-002)

### Copy-Paste Prompt

````
You are working on the TERP project (cannabis ERP system).

TASK: DATA-002 - Seed Comments and Dashboard Tables
PRIORITY: P2 (Medium)
ESTIMATE: 2-4 hours
DEPENDS ON: INFRA-003 (MUST be complete before starting)

=== CRITICAL: CHECK PREREQUISITE ===

BEFORE STARTING, verify INFRA-003 is complete:

1. Check roadmap: docs/roadmaps/MASTER_ROADMAP.md
2. Look for: "INFRA-003" with [x] checkbox
3. If NOT complete, STOP and wait

Run schema validation:
```bash
cd /home/ubuntu/TERP
pnpm exec tsx scripts/validate-schema-sync.ts
````

Expected output: "✅ Schema is in sync!"
If you see errors, STOP - INFRA-003 is not complete.

=== SETUP ===

1. Clone repository:

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
```

2. Read protocols:

- docs/DEVELOPMENT_PROTOCOLS.md (the Bible)
- docs/CLAUDE_WORKFLOW.md
- docs/prompts/DATA-002.md (full task specification)

3. Register session:

```bash
SESSION_ID="Session-$(date +%Y%m%d)-DATA-002-$(openssl rand -hex 4)"
echo "- DATA-002: $SESSION_ID ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
git add docs/ACTIVE_SESSIONS.md
git commit -m "Register DATA-002 session"
git push origin main
```

4. Create session file:

```bash
cat > "docs/sessions/active/$SESSION_ID.md" << 'EOF'
# DATA-002: Seed Comments and Dashboard Tables

**Session ID:** [SESSION_ID]
**Started:** [DATE]
**Agent:** Manus
**Status:** In Progress

## Objective
Seed 5 tables with realistic data for recently-fixed features

## Progress
- [ ] Phase 1: Setup & Validation (15 min)
- [ ] Phase 2: Seed Comments (45-60 min)
- [ ] Phase 3: Seed Dashboard Tables (45-60 min)
- [ ] Phase 4: Testing & Validation (30 min)
- [ ] Phase 5: Completion (15 min)

## Tables to Seed
1. comments (100+ records)
2. comment_mentions (20+ records)
3. userDashboardPreferences (4 records)
4. dashboard_widget_layouts (8-12 records)
5. dashboard_kpi_configs (20-40 records)
EOF
```

5. Update roadmap to "in progress":

```bash
# Mark task as in progress in docs/roadmaps/MASTER_ROADMAP.md
# Change: - [ ] **DATA-002:
# To:     - [~] **DATA-002: (Session-$SESSION_ID)
```

6. Push registration:

```bash
git add -A
git commit -m "DATA-002: Register session and mark in progress"
git push origin main
```

=== IMPLEMENTATION ===

Follow the detailed implementation in docs/prompts/DATA-002.md:

**Phase 1: Setup & Validation (15 min)**

- Verify schema is ready
- Check existing data counts
- Confirm users, clients, events exist

**Phase 2: Seed Comments (45-60 min)**

- Create scripts/seed-comments-dashboard.ts
- Seed 50+ comments on clients
- Seed 30+ comments on events
- Seed comment mentions for @functionality
- Use realistic comment content
- Verify comments appear in database

**Phase 3: Seed Dashboard Tables (45-60 min)**

- Seed userDashboardPreferences for all users
- Create 2-3 custom layouts per user
- Create 5-10 KPI configs per user
- Use realistic dashboard configurations
- Verify dashboard data in database

**Phase 4: Testing & Validation (30 min)**

- Test comments feature in UI
- Test @mentions work
- Test dashboard widgets appear
- Test custom layouts work
- Test KPI configs work
- Document any issues found

**Phase 5: Completion (15 min)**

- Update roadmap to complete
- Archive session file
- Remove from ACTIVE_SESSIONS.md
- Push all changes
- Create completion summary

=== TESTING REQUIREMENTS ===

MANDATORY before marking complete:

1. **Database Validation:**

```sql
SELECT COUNT(*) FROM comments; -- Should be 80+
SELECT COUNT(*) FROM comment_mentions; -- Should be 20+
SELECT COUNT(*) FROM userDashboardPreferences; -- Should be 4
SELECT COUNT(*) FROM dashboard_widget_layouts; -- Should be 8-12
SELECT COUNT(*) FROM dashboard_kpi_configs; -- Should be 20-40
```

2. **UI Testing:**

- Open app and navigate to client page
- Verify comments appear
- Verify @mentions work
- Open dashboard
- Verify widgets appear
- Verify custom layouts work

3. **Data Quality:**

- Comments have realistic content
- Mentions reference actual users
- Dashboard configs are valid JSON
- All foreign keys are valid

=== COMPLETION CHECKLIST ===

Before marking complete, verify:

- [x] INFRA-003 was complete before starting
- [ ] Schema validation passed
- [ ] All 5 tables seeded successfully
- [ ] Database counts match expectations
- [ ] Comments feature tested in UI
- [ ] Dashboard feature tested in UI
- [ ] No errors in console
- [ ] Seed script committed to repo
- [ ] Roadmap updated to complete
- [ ] Session archived
- [ ] ACTIVE_SESSIONS.md updated
- [ ] All changes pushed to GitHub

=== FILES TO MODIFY ===

- scripts/seed-comments-dashboard.ts (create)
- docs/roadmaps/MASTER_ROADMAP.md (mark complete)
- docs/sessions/active/$SESSION_ID.md (update progress)
- docs/ACTIVE_SESSIONS.md (remove when complete)

=== PROTOCOLS TO FOLLOW ===

1. **Commit frequently** - after each phase
2. **Test thoroughly** - don't skip UI testing
3. **Use realistic data** - not Lorem Ipsum
4. **Verify foreign keys** - all IDs must exist
5. **Handle errors gracefully** - log and continue
6. **Document issues** - if something doesn't work
7. **Update roadmap** - mark complete only when done
8. **Archive session** - move to completed/ folder

=== ESTIMATED TIME ===

- Phase 1: 15 min
- Phase 2: 45-60 min
- Phase 3: 45-60 min
- Phase 4: 30 min
- Phase 5: 15 min
  **Total: 2-4 hours**

=== REFERENCE ===

Full specification: docs/prompts/DATA-002.md
Development protocols: docs/DEVELOPMENT_PROTOCOLS.md
Workflow guide: docs/CLAUDE_WORKFLOW.md

```

---

## Agent 2: Pricing Data (DATA-003)

### Copy-Paste Prompt

```

You are working on the TERP project (cannabis ERP system).

TASK: DATA-003 - Seed Pricing Tables
PRIORITY: P2 (Medium)
ESTIMATE: 2-3 hours
DEPENDS ON: INFRA-003 (MUST be complete before starting)

=== CRITICAL: CHECK PREREQUISITE ===

BEFORE STARTING, verify INFRA-003 is complete:

1. Check roadmap: docs/roadmaps/MASTER_ROADMAP.md
2. Look for: "INFRA-003" with [x] checkbox
3. If NOT complete, STOP and wait

Run schema validation:

```bash
cd /home/ubuntu/TERP
pnpm exec tsx scripts/validate-schema-sync.ts
```

Expected output: "✅ Schema is in sync!"
If you see errors, STOP - INFRA-003 is not complete.

=== SETUP ===

1. Clone repository:

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
```

2. Read protocols:

- docs/DEVELOPMENT_PROTOCOLS.md (the Bible)
- docs/CLAUDE_WORKFLOW.md
- docs/prompts/DATA-003.md (full task specification)

3. Register session:

```bash
SESSION_ID="Session-$(date +%Y%m%d)-DATA-003-$(openssl rand -hex 4)"
echo "- DATA-003: $SESSION_ID ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
git add docs/ACTIVE_SESSIONS.md
git commit -m "Register DATA-003 session"
git push origin main
```

4. Create session file:

```bash
cat > "docs/sessions/active/$SESSION_ID.md" << 'EOF'
# DATA-003: Seed Pricing Tables

**Session ID:** [SESSION_ID]
**Started:** [DATE]
**Agent:** Manus
**Status:** In Progress

## Objective
Seed 4 pricing tables with realistic, operationally coherent data

## Progress
- [ ] Phase 1: Setup & Validation (15 min)
- [ ] Phase 2: Seed Price Tiers (30 min)
- [ ] Phase 3: Seed Product Pricing (45 min)
- [ ] Phase 4: Assign Client Tiers (30 min)
- [ ] Phase 5: Create Price Overrides (30 min)
- [ ] Phase 6: Testing & Validation (30 min)
- [ ] Phase 7: Completion (15 min)

## Tables to Seed
1. priceTiers (3-5 tiers)
2. productPricing (300+ records - all products x all tiers)
3. clientPricingTiers (50 records - all clients)
4. priceOverrides (10-20 special deals)
EOF
```

5. Update roadmap to "in progress":

```bash
# Mark task as in progress in docs/roadmaps/MASTER_ROADMAP.md
# Change: - [ ] **DATA-003:
# To:     - [~] **DATA-003: (Session-$SESSION_ID)
```

6. Push registration:

```bash
git add -A
git commit -m "DATA-003: Register session and mark in progress"
git push origin main
```

=== IMPLEMENTATION ===

Follow the detailed implementation in docs/prompts/DATA-003.md:

**Phase 1: Setup & Validation (15 min)**

- Verify schema is ready
- Query actual table schemas
- Check existing products and clients
- Confirm 100+ products exist
- Confirm 50 clients exist

**Phase 2: Seed Price Tiers (30 min)**

- Create 3-5 pricing tiers:
  - Retail (highest price)
  - Wholesale (medium price)
  - VIP (lowest price)
  - Optional: Bulk, Partner tiers
- Use realistic tier names and descriptions
- Verify tiers created successfully

**Phase 3: Seed Product Pricing (45 min)**

- Get all products from database
- Create pricing for each product in each tier
- Use realistic pricing logic:
  - Retail: base price
  - Wholesale: 20-30% discount
  - VIP: 40-50% discount
- Ensure operational coherence (Retail > Wholesale > VIP)
- Verify all products have pricing in all tiers

**Phase 4: Assign Client Tiers (30 min)**

- Get all clients from database
- Assign each client to a pricing tier
- Use realistic distribution:
  - 60% Retail
  - 30% Wholesale
  - 10% VIP
- Verify all clients assigned

**Phase 5: Create Price Overrides (30 min)**

- Create 10-20 special pricing overrides
- Examples:
  - Volume discounts for specific clients
  - Special deals on specific products
  - Promotional pricing
- Use realistic override scenarios
- Verify overrides created

**Phase 6: Testing & Validation (30 min)**

- Test pricing calculation logic
- Verify tier pricing works
- Verify client tier assignments work
- Verify price overrides work
- Test in UI if possible
- Document any issues

**Phase 7: Completion (15 min)**

- Update roadmap to complete
- Archive session file
- Remove from ACTIVE_SESSIONS.md
- Push all changes
- Create completion summary

=== TESTING REQUIREMENTS ===

MANDATORY before marking complete:

1. **Database Validation:**

```sql
SELECT COUNT(*) FROM priceTiers; -- Should be 3-5
SELECT COUNT(*) FROM productPricing; -- Should be 300+ (products x tiers)
SELECT COUNT(*) FROM clientPricingTiers; -- Should be 50
SELECT COUNT(*) FROM priceOverrides; -- Should be 10-20

-- Verify pricing logic
SELECT pt.name, pp.price
FROM productPricing pp
JOIN priceTiers pt ON pp.tier_id = pt.id
WHERE pp.product_id = (SELECT id FROM products LIMIT 1)
ORDER BY pp.price DESC;
-- Should show: Retail > Wholesale > VIP
```

2. **Operational Coherence:**

- All products have pricing in all tiers
- Retail price > Wholesale price > VIP price
- All clients assigned to a tier
- Price overrides are realistic
- No negative prices
- No NULL prices

3. **UI Testing (if possible):**

- Create test order
- Verify correct pricing applied based on client tier
- Verify price overrides work
- Verify pricing calculation is correct

=== COMPLETION CHECKLIST ===

Before marking complete, verify:

- [x] INFRA-003 was complete before starting
- [ ] Schema validation passed
- [ ] All 4 tables seeded successfully
- [ ] Database counts match expectations
- [ ] Pricing logic is operationally coherent
- [ ] All products have pricing in all tiers
- [ ] All clients assigned to tiers
- [ ] Price overrides are realistic
- [ ] No errors in console
- [ ] Seed script committed to repo
- [ ] Roadmap updated to complete
- [ ] Session archived
- [ ] ACTIVE_SESSIONS.md updated
- [ ] All changes pushed to GitHub

=== FILES TO MODIFY ===

- scripts/seed-pricing.ts (create)
- docs/roadmaps/MASTER_ROADMAP.md (mark complete)
- docs/sessions/active/$SESSION_ID.md (update progress)
- docs/ACTIVE_SESSIONS.md (remove when complete)

=== PROTOCOLS TO FOLLOW ===

1. **Commit frequently** - after each phase
2. **Test thoroughly** - verify pricing logic
3. **Ensure operational coherence** - prices must make sense
4. **Verify foreign keys** - all IDs must exist
5. **Handle errors gracefully** - log and continue
6. **Document issues** - if something doesn't work
7. **Update roadmap** - mark complete only when done
8. **Archive session** - move to completed/ folder

=== ESTIMATED TIME ===

- Phase 1: 15 min
- Phase 2: 30 min
- Phase 3: 45 min
- Phase 4: 30 min
- Phase 5: 30 min
- Phase 6: 30 min
- Phase 7: 15 min
  **Total: 2-3 hours**

=== OPERATIONAL COHERENCE REQUIREMENTS ===

**Critical:** Pricing must be realistic and logically consistent:

1. **Tier Hierarchy:** Retail > Wholesale > VIP (always)
2. **Product Coverage:** Every product must have pricing in every tier
3. **Client Assignment:** Every client must be assigned to exactly one tier
4. **Override Logic:** Price overrides should be lower than tier price (discounts)
5. **No Negative Prices:** All prices must be positive
6. **Realistic Margins:** Wholesale ~20-30% off, VIP ~40-50% off

=== REFERENCE ===

Full specification: docs/prompts/DATA-003.md
Development protocols: docs/DEVELOPMENT_PROTOCOLS.md
Workflow guide: docs/CLAUDE_WORKFLOW.md

```

---

## Important Notes

### Prerequisites

**BOTH tasks require INFRA-003 to be complete first!**

INFRA-003 fixes database schema sync issues. Starting DATA-002 or DATA-003 before INFRA-003 is complete will cause errors.

**Check before starting:**
1. Look at roadmap: docs/roadmaps/MASTER_ROADMAP.md
2. Find "INFRA-003" entry
3. Verify it has [x] checkbox (complete)
4. Run schema validation script
5. If not complete, WAIT

### Execution Order

**Recommended order:**
1. INFRA-003 (prerequisite)
2. DATA-002 (comments & dashboard) - can run in parallel with DATA-003
3. DATA-003 (pricing) - can run in parallel with DATA-002

Both DATA tasks are independent and can be executed in parallel by different agents.

### Time Estimates

- DATA-002: 2-4 hours
- DATA-003: 2-3 hours
- **Total: 4-7 hours** (or 2-4 hours if parallel)

### Success Criteria

**DATA-002 Success:**
- 80+ comments seeded
- 20+ comment mentions
- 4 user dashboard preferences
- 8-12 custom layouts
- 20-40 KPI configs
- Comments feature works in UI
- Dashboard feature works in UI

**DATA-003 Success:**
- 3-5 price tiers created
- 300+ product pricing records (all products x all tiers)
- 50 client tier assignments
- 10-20 price overrides
- Pricing logic is operationally coherent
- Retail > Wholesale > VIP (always)
- Pricing calculation works correctly

### Common Issues

**Issue 1: Schema validation fails**
- **Cause:** INFRA-003 not complete
- **Solution:** Wait for INFRA-003, don't start early

**Issue 2: Foreign key errors**
- **Cause:** Referenced IDs don't exist
- **Solution:** Query database first, use actual IDs

**Issue 3: Pricing logic incorrect**
- **Cause:** Not following tier hierarchy
- **Solution:** Verify Retail > Wholesale > VIP for all products

**Issue 4: UI testing fails**
- **Cause:** Frontend not updated or data format wrong
- **Solution:** Check console errors, verify data format matches schema

---

## Deployment

Both tasks seed data directly to production database. No deployment needed.

**Verification:**
1. Run seed scripts
2. Query database to verify counts
3. Test features in UI
4. Mark tasks complete in roadmap

---

## Questions?

- Full specifications: docs/prompts/DATA-002.md, docs/prompts/DATA-003.md
- Development protocols: docs/DEVELOPMENT_PROTOCOLS.md
- Workflow guide: docs/CLAUDE_WORKFLOW.md
- Roadmap: docs/roadmaps/MASTER_ROADMAP.md
```
