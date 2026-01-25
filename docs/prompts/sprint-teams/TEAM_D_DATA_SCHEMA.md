# Sprint Team D: Data, Schema & Seeding

**Branch:** `claude/sprint-team-d-data`
**Priority:** P0 security task first, then parallel with other teams
**Estimated Duration:** 3-4 days

---

## Your Mission

You are **Sprint Team D**, responsible for database schema integrity, migrations, and seed data. Your work ensures data consistency and provides test/demo data for other teams.

---

## CRITICAL: Read Before Starting

1. **Read `/CLAUDE.md`** - All agent protocols apply
2. **Check `/docs/ACTIVE_SESSIONS.md`** - Ensure no conflicts
3. **Create session file** in `/docs/sessions/active/`
4. **Work on branch:** `claude/sprint-team-d-data`

---

## Your Owned Files

You have **exclusive write access** to:

```
drizzle/**
server/db/schema.ts
scripts/seed/**
drizzle/migrations/**
drizzle/meta/**
```

**DO NOT MODIFY:**
- `server/routers/**` (Team C owns)
- `client/src/**` (Team B owns)
- `server/accountingHooks.ts` (Team A owns)
- `server/_core/**` (Team E owns)

---

## Task Execution Order

### Phase 1: P0 CRITICAL - Security (Day 1, First Task)

#### SEC-023: Rotate Exposed Database Credentials (2-4 hours)

**THIS IS YOUR FIRST PRIORITY. DO NOT PROCEED TO OTHER TASKS UNTIL COMPLETE.**

**Problem:** Production database credentials exposed in:
`drizzle/migrations/0007_DEPLOYMENT_INSTRUCTIONS.md`

**Steps:**

1. **Rotate credentials in DigitalOcean:**
   - Log into DigitalOcean console
   - Navigate to database cluster
   - Reset database password
   - Update all environment variables

2. **Update all services:**
   ```bash
   # Update production environment
   doctl apps update <app-id> --spec app.yaml

   # Verify new credentials work
   mysql -h <host> -u <user> -p
   ```

3. **Redact the file:**
   ```markdown
   # In 0007_DEPLOYMENT_INSTRUCTIONS.md
   # Replace password with:
   Password: [REDACTED - Use environment variable DATABASE_PASSWORD]
   ```

4. **Scrub from git history:**
   ```bash
   # Use BFG Repo-Cleaner or git-filter-repo
   bfg --replace-text passwords.txt
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

5. **Verify old credentials no longer work:**
   ```bash
   # This should FAIL:
   mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
         -u doadmin -p'OLD_PASSWORD'
   ```

**Deliverables:**
- [ ] New database credentials generated
- [ ] All services updated
- [ ] File redacted
- [ ] Git history cleaned
- [ ] Old credentials verified invalid

---

### Phase 2: Data Seeding (Days 1-2)

#### DATA-012: Seed Work Surface Feature Flags (4 hours)

**File:** Create `scripts/seed/seeders/seed-feature-flags.ts`

```typescript
import { db } from '@/server/db';
import { featureFlags } from '@/server/db/schema';

const workSurfaceFlags = [
  { key: 'work-surface-enabled', defaultValue: true, description: 'Master toggle for Work Surfaces' },
  { key: 'work-surface-direct-intake', defaultValue: false, description: 'Direct Intake Work Surface' },
  { key: 'work-surface-purchase-orders', defaultValue: false, description: 'Purchase Orders Work Surface' },
  { key: 'work-surface-orders', defaultValue: false, description: 'Orders Work Surface' },
  { key: 'work-surface-inventory', defaultValue: false, description: 'Inventory Work Surface' },
  { key: 'work-surface-invoices', defaultValue: false, description: 'Invoices Work Surface' },
  { key: 'work-surface-clients', defaultValue: false, description: 'Clients Work Surface' },
  { key: 'work-surface-keyboard-contract', defaultValue: true, description: 'Keyboard shortcuts' },
  { key: 'work-surface-save-state', defaultValue: true, description: 'Auto-save state' },
  { key: 'work-surface-inspector-panel', defaultValue: true, description: 'Inspector panel' },
  { key: 'work-surface-validation-timing', defaultValue: true, description: 'Validation timing' },
  { key: 'work-surface-concurrent-edit', defaultValue: true, description: 'Concurrent edit detection' },
  { key: 'work-surface-golden-flow-intake', defaultValue: false, description: 'Golden Flow: Intake' },
  { key: 'work-surface-golden-flow-order', defaultValue: false, description: 'Golden Flow: Order' },
  { key: 'work-surface-golden-flow-invoice', defaultValue: false, description: 'Golden Flow: Invoice' },
  { key: 'email-enabled', defaultValue: false, description: 'Email notifications' },
  { key: 'sms-enabled', defaultValue: false, description: 'SMS notifications' },
];

export async function seedFeatureFlags() {
  for (const flag of workSurfaceFlags) {
    await db.insert(featureFlags)
      .values({
        key: flag.key,
        enabled: flag.defaultValue,
        description: flag.description,
        createdAt: new Date(),
      })
      .onDuplicateKeyUpdate({ set: { description: flag.description } });
  }

  console.log(`Seeded ${workSurfaceFlags.length} feature flags`);
}
```

**Add to package.json:**
```json
"seed:feature-flags": "tsx scripts/seed/seeders/seed-feature-flags.ts"
```

---

#### DATA-013: Seed Gamification Module Defaults (4-8 hours)

**File:** Create `scripts/seed/seeders/seed-gamification.ts`

```typescript
const achievements = [
  { id: 1, name: 'First Sale', description: 'Complete your first sale', points: 100, icon: 'trophy' },
  { id: 2, name: 'High Roller', description: 'Complete a sale over $10,000', points: 500, icon: 'dollar' },
  { id: 3, name: 'Streak Master', description: '5 sales in a row', points: 250, icon: 'fire' },
  { id: 4, name: 'Client Whisperer', description: 'Get 5 repeat customers', points: 300, icon: 'users' },
  { id: 5, name: 'Early Bird', description: 'First sale of the day', points: 50, icon: 'sun' },
  { id: 6, name: 'Closer', description: 'Convert a quote to sale', points: 150, icon: 'check' },
  { id: 7, name: 'VIP Handler', description: 'Serve a VIP client', points: 200, icon: 'star' },
  { id: 8, name: 'Team Player', description: 'Assist another rep', points: 100, icon: 'handshake' },
  { id: 9, name: 'Perfect Week', description: '5+ sales in a week', points: 400, icon: 'calendar' },
  { id: 10, name: 'Top Dog', description: 'Highest sales in month', points: 1000, icon: 'crown' },
];

const rewardCatalog = [
  { id: 1, name: 'Gift Card $25', pointsCost: 500, category: 'gift_card', stock: 10 },
  { id: 2, name: 'Gift Card $50', pointsCost: 900, category: 'gift_card', stock: 5 },
  { id: 3, name: 'Extra PTO Day', pointsCost: 2000, category: 'time_off', stock: 3 },
  { id: 4, name: 'Lunch with CEO', pointsCost: 5000, category: 'experience', stock: 1 },
  { id: 5, name: 'Company Swag', pointsCost: 300, category: 'merch', stock: 20 },
];

const referralSettings = {
  enabled: true,
  referrerRewardPercent: 5.0, // Couch Tax
  refereeDiscount: 0,
  minOrderValue: 100,
  maxRewardPerReferral: 500,
};

export async function seedGamification() {
  // Seed achievements
  await db.insert(achievements).values(achievements).onDuplicateKeyUpdate({ set: {} });

  // Seed rewards
  await db.insert(rewardCatalog).values(rewardCatalog).onDuplicateKeyUpdate({ set: {} });

  // Seed referral settings
  await db.insert(referralSettings).values(referralSettings).onDuplicateKeyUpdate({ set: {} });

  console.log('Seeded gamification module');
}
```

---

#### DATA-014: Seed Scheduling Module Defaults (4 hours)

**File:** Create `scripts/seed/seeders/seed-scheduling.ts`

```typescript
const rooms = [
  { name: 'Conference A', type: 'meeting', capacity: 10 },
  { name: 'Conference B', type: 'meeting', capacity: 6 },
  { name: 'Conference C', type: 'meeting', capacity: 4 },
  { name: 'Loading Dock 1', type: 'loading', capacity: 1 },
  { name: 'Loading Dock 2', type: 'loading', capacity: 1 },
];

const shiftTemplates = [
  { name: 'Day Shift', startTime: '09:00', endTime: '17:00', breakMinutes: 60 },
  { name: 'Opening', startTime: '06:00', endTime: '14:00', breakMinutes: 30 },
  { name: 'Closing', startTime: '14:00', endTime: '22:00', breakMinutes: 30 },
  { name: 'Flex Morning', startTime: '07:00', endTime: '15:00', breakMinutes: 45 },
];

const appointmentTypes = [
  { name: 'Consultation', durationMinutes: 30, color: '#4CAF50' },
  { name: 'Pickup', durationMinutes: 15, color: '#2196F3' },
  { name: 'Delivery', durationMinutes: 30, color: '#FF9800' },
  { name: 'Meeting', durationMinutes: 60, color: '#9C27B0' },
  { name: 'Training', durationMinutes: 120, color: '#F44336' },
];

const overtimeRules = [
  { threshold: 8, multiplier: 1.5, period: 'daily', description: 'Daily overtime after 8 hours' },
  { threshold: 40, multiplier: 1.5, period: 'weekly', description: 'Weekly overtime after 40 hours' },
  { threshold: 12, multiplier: 2.0, period: 'daily', description: 'Double time after 12 hours' },
];

export async function seedScheduling() {
  await db.insert(rooms).values(rooms);
  await db.insert(shiftTemplates).values(shiftTemplates);
  await db.insert(appointmentTypes).values(appointmentTypes);
  await db.insert(overtimeRules).values(overtimeRules);
  console.log('Seeded scheduling module');
}
```

---

#### DATA-015: Seed Storage Sites and Zones (2-4 hours)

**File:** Create `scripts/seed/seeders/seed-storage.ts`

```typescript
const sites = [
  { name: 'Main Warehouse', type: 'warehouse', address: '123 Main St' },
  { name: 'Samples Room', type: 'samples', address: '123 Main St' },
  { name: 'Shipping Dock', type: 'shipping', address: '123 Main St' },
  { name: 'Cold Storage', type: 'cold', address: '456 Industrial Ave' },
];

const zones = [
  { siteId: 1, name: 'Zone A', temperatureMin: 60, temperatureMax: 75 },
  { siteId: 1, name: 'Zone B', temperatureMin: 60, temperatureMax: 75 },
  { siteId: 4, name: 'Cold Zone 1', temperatureMin: 32, temperatureMax: 40 },
  { siteId: 4, name: 'Cold Zone 2', temperatureMin: 32, temperatureMax: 40 },
];

export async function seedStorage() {
  const insertedSites = await db.insert(sites).values(sites).returning();
  // Map site IDs and insert zones
  for (const zone of zones) {
    zone.siteId = insertedSites.find(s => s.id === zone.siteId)?.id ?? zone.siteId;
  }
  await db.insert(storageZones).values(zones);
  console.log('Seeded storage sites and zones');
}
```

---

#### DATA-021: Seed Mock Product Images (6 hours)

**File:** Create `scripts/seed/seeders/seed-product-images.ts`

```typescript
const categoryImageMappings = {
  Flower: 'nature,botanical,green,plant',
  Concentrates: 'amber,honey,gold,crystal',
  Edibles: 'candy,gummy,chocolate,treat',
  PreRolls: 'paper,texture,natural,craft',
  Vapes: 'technology,device,modern,sleek',
};

export async function seedProductImages(options: { dryRun?: boolean; force?: boolean } = {}) {
  const products = await db.query.products.findMany({
    where: options.force ? undefined : isNull(products.primaryImageUrl),
    columns: { id: true, name: true, category: true },
  });

  console.log(`Found ${products.length} products to seed images for`);

  if (options.dryRun) {
    console.log('Dry run - no changes made');
    return;
  }

  let success = 0;
  for (const product of products) {
    const keywords = categoryImageMappings[product.category] || 'product,item';
    const seed = `${product.category}-${product.id}`;

    // Try multiple sources with fallback
    const imageUrl = await getValidImageUrl([
      `https://picsum.photos/seed/${seed}/400/400`,
      `https://source.unsplash.com/400x400/?${keywords}`,
      `https://via.placeholder.com/400x400/4CAF50/ffffff?text=${encodeURIComponent(product.name.slice(0, 10))}`,
    ]);

    if (imageUrl) {
      await db.update(products)
        .set({ primaryImageUrl: imageUrl })
        .where(eq(products.id, product.id));
      success++;
    }
  }

  console.log(`Seeded images for ${success}/${products.length} products`);
}

async function getValidImageUrl(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) return url;
    } catch {
      continue;
    }
  }
  return null;
}
```

**Add commands to package.json:**
```json
"seed:images": "tsx scripts/seed/seeders/seed-product-images.ts",
"seed:images:dry-run": "tsx scripts/seed/seeders/seed-product-images.ts --dry-run",
"seed:images:force": "tsx scripts/seed/seeders/seed-product-images.ts --force"
```

---

### Phase 3: Schema Fixes (Days 2-3)

#### SCHEMA-001: Fix products.name vs nameCanonical Mismatch (4 hours)

**File:** `server/db/schema.ts`

**Problem:** Code references `products.name` but actual column is `products.nameCanonical`.

**Steps:**
1. Check actual database column name
2. Update schema to match
3. Update all code references
4. Run migration if needed

```typescript
// If database has nameCanonical:
export const products = mysqlTable('products', {
  id: int('id').primaryKey().autoIncrement(),
  nameCanonical: varchar('name_canonical', { length: 255 }).notNull(), // Match DB
  // Add alias for code compatibility:
  get name() { return this.nameCanonical; }
});
```

---

#### SCHEMA-002: Document batches.quantity vs onHandQty (2 hours)

**File:** `server/db/schema.ts`

Add clear documentation:

```typescript
export const batches = mysqlTable('batches', {
  /**
   * quantity: Original quantity received in this batch
   * This value NEVER changes after initial receipt
   */
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),

  /**
   * onHandQty: Current available quantity
   * Updated with every sale, adjustment, return
   * Always: onHandQty <= quantity
   */
  onHandQty: decimal('on_hand_qty', { precision: 10, scale: 2 }).notNull(),
});
```

---

#### SCHEMA-003: Add clients.tier and clients.isActive (4 hours)

**File:** `server/db/schema.ts`

```typescript
// Add migration:
await db.execute(sql`
  ALTER TABLE clients
  ADD COLUMN tier VARCHAR(20) DEFAULT 'standard',
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE
`);

// Update schema:
export const clients = mysqlTable('clients', {
  // ... existing columns
  tier: varchar('tier', { length: 20 }).default('standard'),
  isActive: boolean('is_active').default(true),
});
```

---

#### DATA-022: Add Calendar Recurring Events Schema (4 hours)

**File:** `server/db/schema.ts`

Add schema for recurring calendar events:

```typescript
export const calendarRecurrenceRules = mysqlTable('calendar_recurrence_rules', {
  id: int('id').primaryKey().autoIncrement(),
  eventId: int('event_id').references(() => calendarEvents.id),
  frequency: varchar('frequency', { length: 20 }).notNull(), // daily, weekly, monthly, yearly
  interval: int('interval').default(1),
  daysOfWeek: varchar('days_of_week', { length: 50 }), // comma-separated
  dayOfMonth: int('day_of_month'),
  endDate: timestamp('end_date'),
  occurrences: int('occurrences'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

#### TERP-0006: Cleanup Migration Constraints (4-8 hours)

**Files:**
- `drizzle/0053_fix_dashboard_preferences_index.sql`
- `drizzle/0054_fix_long_constraint_names.sql`

Create idempotent cleanup migrations:

```sql
-- 0053_fix_dashboard_preferences_index.sql
-- Safely drop and recreate index
DROP INDEX IF EXISTS idx_dashboard_preferences_user_widget ON dashboard_preferences;

CREATE INDEX idx_dp_user_widget ON dashboard_preferences(user_id, widget_id);

-- 0054_fix_long_constraint_names.sql
-- Rename overly long FK constraints
-- MySQL limit is 64 characters

-- Check if old constraint exists and rename
-- This is database-specific, may need conditional logic
```

---

### Phase 4: Additional Seeding (Day 3-4)

#### DATA-016 through DATA-020: Additional Seed Data

| Task | Content |
|------|---------|
| DATA-016 | Organization settings (name, timezone, currency) |
| DATA-017 | VIP portal configurations |
| DATA-018 | VIP tier configurations (Bronze, Silver, Gold, Platinum) |
| DATA-019 | Integration settings (Stripe, Twilio placeholders) |
| DATA-020 | Rate limit configurations |

Create a unified seed runner:

```typescript
// scripts/seed/seeders/seed-all.ts
import { seedFeatureFlags } from './seed-feature-flags';
import { seedGamification } from './seed-gamification';
import { seedScheduling } from './seed-scheduling';
import { seedStorage } from './seed-storage';
import { seedProductImages } from './seed-product-images';

export async function seedAll() {
  console.log('Starting full seed...');

  await seedFeatureFlags();
  await seedGamification();
  await seedScheduling();
  await seedStorage();
  await seedProductImages();

  console.log('All seeding complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAll().catch(console.error);
}
```

---

## Verification Protocol

```bash
# Schema validation
pnpm validate:schema

# Run migrations
pnpm db:migrate

# Test seed scripts
pnpm seed:feature-flags
pnpm seed:images --dry-run

# Full verification
pnpm check && pnpm lint && pnpm test && pnpm build
```

---

## Creating Your PR

```bash
gh pr create --base staging/integration-sprint-2026-01-25 \
  --title "Team D: Data, Schema & Seeding" \
  --body "$(cat <<'EOF'
## Summary
- CRITICAL: SEC-023 - Rotated exposed database credentials
- Seeded DATA-012..DATA-022 - Feature flags, gamification, scheduling, storage, images
- Fixed SCHEMA-001..003 - Schema consistency fixes
- Created TERP-0006 - Cleanup migrations

## Security
- [x] Credentials rotated
- [x] Old credentials verified invalid
- [x] Git history cleaned
- [x] File redacted

## Seed Data Added
- 17 feature flags
- 10 achievements
- 5 rewards
- Scheduling defaults
- Storage sites/zones
- Product images

## Verification
- [x] pnpm validate:schema passes
- [x] pnpm db:migrate passes
- [x] All seed scripts tested
EOF
)"
```

---

## Cross-Team Dependencies

**Requests FROM other teams:**
- Team C: API-017 needs `minStockLevel`, `targetStockLevel` columns on products
- Handle via coordination tickets

**You block:**
- Team C: For schema changes
- Team E: For Work Surface feature flags

---

## Questions?

Create a coordination ticket or ask Evan.
