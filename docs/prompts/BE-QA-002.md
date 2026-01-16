# BE-QA-002: Implement VIP Tier Config Database Storage

<!-- METADATA (for validation) -->
<!-- TASK_ID: BE-QA-002 -->
<!-- TASK_TITLE: Implement VIP Tier Config Database Storage -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-14 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** BE-QA-002
**Estimated Time:** 8h
**Module:** `server/services/vipPortalAdminService.ts`

## Context

**Background:**
VIP tier configuration at `server/services/vipPortalAdminService.ts:440-493` is hardcoded. The update function is a no-op:
- Tier thresholds are static
- Tier benefits are hardcoded
- Admin cannot configure tiers

**Goal:**
Store VIP tier configuration in database and make it configurable.

**Success Criteria:**
- VIP tiers stored in database
- Admin can update tier configuration
- Changes take effect immediately

## Implementation Guide

### Step 1: Create VIP Tiers Schema

```typescript
// server/schema/vipTiers.ts
import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const vipTiers = sqliteTable("vip_tiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),           // "Bronze", "Silver", "Gold", etc.
  minSpend: real("min_spend").notNull(),  // Minimum spend to qualify
  discountPercent: real("discount_percent").default(0),
  freeShipping: integer("free_shipping", { mode: "boolean" }).default(false),
  prioritySupport: integer("priority_support", { mode: "boolean" }).default(false),
  earlyAccess: integer("early_access", { mode: "boolean" }).default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`)
});
```

### Step 2: Create Migration

```sql
CREATE TABLE vip_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  min_spend REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  free_shipping INTEGER DEFAULT 0,
  priority_support INTEGER DEFAULT 0,
  early_access INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Seed default tiers
INSERT INTO vip_tiers (name, min_spend, discount_percent, free_shipping, sort_order) VALUES
  ('Bronze', 0, 0, 0, 1),
  ('Silver', 1000, 5, 0, 2),
  ('Gold', 5000, 10, 1, 3),
  ('Platinum', 10000, 15, 1, 4);
```

### Step 3: Update Admin Service

```typescript
// server/services/vipPortalAdminService.ts

export async function getVipTiers() {
  const db = await getDb();
  return db.select().from(vipTiers).orderBy(vipTiers.sortOrder);
}

export async function updateVipTier(tierId: number, updates: Partial<VipTier>) {
  const db = await getDb();
  return db.update(vipTiers)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(vipTiers.id, tierId));
}

export async function createVipTier(tier: NewVipTier) {
  const db = await getDb();
  return db.insert(vipTiers).values(tier);
}

export async function deleteVipTier(tierId: number) {
  const db = await getDb();
  return db.delete(vipTiers).where(eq(vipTiers.id, tierId));
}
```

### Step 4: Update Client Tier Calculation

```typescript
export async function getClientVipTier(clientId: number) {
  const db = await getDb();

  // Get client's total spend
  const [client] = await db.select({ totalSpend: clients.totalSpend })
    .from(clients)
    .where(eq(clients.id, clientId));

  // Get applicable tier
  const tiers = await getVipTiers();
  const tier = tiers
    .filter(t => client.totalSpend >= t.minSpend)
    .sort((a, b) => b.minSpend - a.minSpend)[0];

  return tier || tiers[0]; // Default to first tier
}
```

### Step 5: Create Admin API Endpoints

Add tRPC procedures for CRUD operations on tiers.

## Deliverables

- [ ] Create vipTiers schema
- [ ] Create database migration
- [ ] Seed default tiers
- [ ] Update vipPortalAdminService to use database
- [ ] Add CRUD API endpoints
- [ ] Update client tier calculation

## Quick Reference

**File to modify:** `server/services/vipPortalAdminService.ts:440-493`

**Find hardcoded tiers:**
```bash
grep -rn "tier\|Tier" server/services/vipPortal* --include="*.ts"
```
