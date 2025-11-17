# DATA-003: Seed Pricing Tables

**Task ID:** DATA-003  
**Priority:** P2 (Medium)  
**Estimate:** 2-3 hours  
**Status:** ready  
**Depends On:** INFRA-003 (must complete first)

---

## Objective

Seed 4 pricing-related tables with realistic, operationally coherent data:

1. `priceTiers` - 3-5 pricing tiers (Retail, Wholesale, VIP)
2. `productPricing` - Pricing for all products across tiers
3. `clientPricingTiers` - Assign clients to pricing tiers
4. `priceOverrides` - Special pricing for specific client-product combinations

---

## Context

**Why This Matters:**

- Pricing is core to cannabis ERP functionality
- Currently EMPTY - no pricing data exists
- Blocks order creation, invoicing, and revenue calculations
- Essential for realistic demos and testing

**Current State:**

- `priceTiers`: EMPTY (0 records)
- `productPricing`: EMPTY (0 records)
- `clientPricingTiers`: EMPTY (0 records)
- `priceOverrides`: EMPTY (0 records)
- Products: 100+ products exist
- Clients: 50 clients exist

**Operational Coherence Requirements:**

- Price tiers must have logical relationships (Retail > Wholesale > VIP)
- All products must have pricing in all tiers
- Clients must be assigned to appropriate tiers
- Price overrides should be realistic (volume discounts, special deals)

---

## Deliverables

1. ✅ `scripts/seed-pricing.ts` - Simple, working seed script
2. ✅ 3-5 price tiers created
3. ✅ Pricing for 100+ products across all tiers
4. ✅ 50 clients assigned to tiers
5. ✅ 10-20 price overrides for special deals
6. ✅ Validation that pricing logic works
7. ✅ Roadmap updated to complete

---

## Implementation Protocol

### ⚠️ PREREQUISITE: Wait for INFRA-003

**DO NOT START until INFRA-003 is complete!**

Check that INFRA-003 has:

- ✅ Fixed schema sync issues
- ✅ Run migrations successfully
- ✅ Schema validation passing

If INFRA-003 is not complete, WAIT. Starting early will cause schema errors.

---

### Phase 1: Setup & Validation (15 min)

**Step 1.1: Register session**

```bash
cd /home/ubuntu/TERP
echo "- DATA-003: Session-$(date +%Y%m%d)-DATA-003-$(openssl rand -hex 4) ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
git add docs/ACTIVE_SESSIONS.md
git commit -m "Register DATA-003 session"
git push origin main
```

**Step 1.2: Verify schema is ready**

```bash
# Run schema validation (created by INFRA-003)
pnpm exec tsx scripts/validate-schema-sync.ts

# Should output: ✅ Schema is in sync!
# If not, STOP and wait for INFRA-003
```

**Step 1.3: Query actual table schemas**

```typescript
// Check pricing table structures
import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("=== PRICE TIERS ===");
const tierCols = await db.execute(sql`DESCRIBE priceTiers`);
console.log(tierCols[0]);

console.log("\n=== PRODUCT PRICING ===");
const pricingCols = await db.execute(sql`DESCRIBE productPricing`);
console.log(pricingCols[0]);

console.log("\n=== CLIENT PRICING TIERS ===");
const clientTierCols = await db.execute(sql`DESCRIBE clientPricingTiers`);
console.log(clientTierCols[0]);

console.log("\n=== PRICE OVERRIDES ===");
const overrideCols = await db.execute(sql`DESCRIBE priceOverrides`);
console.log(overrideCols[0]);
```

**Step 1.4: Get existing data counts**

```typescript
const products = await db.execute(sql`SELECT COUNT(*) as count FROM products`);
const clients = await db.execute(sql`SELECT COUNT(*) as count FROM clients`);

console.log(`\nProducts: ${products[0][0].count}`);
console.log(`Clients: ${clients[0][0].count}`);
```

---

### Phase 2: Seed Price Tiers (30 min)

**Step 2.1: Create seed script**

```typescript
// scripts/seed-pricing.ts
import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING PRICING TABLES ===\n");

async function seedPriceTiers() {
  console.log("🔵 Seeding price tiers...");

  const tiers = [
    {
      name: "Retail",
      description: "Standard retail pricing for walk-in customers",
      discount_percentage: 0,
      min_order_value: 0,
      is_active: true,
    },
    {
      name: "Wholesale",
      description: "Wholesale pricing for bulk orders",
      discount_percentage: 15,
      min_order_value: 500,
      is_active: true,
    },
    {
      name: "VIP",
      description: "Premium pricing for VIP customers",
      discount_percentage: 25,
      min_order_value: 1000,
      is_active: true,
    },
    {
      name: "Medical",
      description: "Special pricing for medical patients",
      discount_percentage: 20,
      min_order_value: 0,
      is_active: true,
    },
  ];

  const tierIds: number[] = [];

  for (const tier of tiers) {
    const result = await db.execute(sql`
      INSERT INTO priceTiers (name, description, discount_percentage, min_order_value, is_active)
      VALUES (${tier.name}, ${tier.description}, ${tier.discount_percentage}, ${tier.min_order_value}, ${tier.is_active})
    `);

    // Get inserted ID
    const idResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
    const tierId = (idResult[0] as any[])[0].id;
    tierIds.push(tierId);

    console.log(`✓ Created tier: ${tier.name} (ID: ${tierId})`);
  }

  console.log(`\n✓ Inserted ${tiers.length} price tiers\n`);
  return tierIds;
}
```

**Step 2.2: Run tier seeding**

```bash
pnpm exec tsx scripts/seed-pricing.ts
```

**Step 2.3: Verify tiers**

```sql
SELECT * FROM priceTiers;
```

---

### Phase 3: Seed Product Pricing (45-60 min)

**Step 3.1: Add product pricing to script**

```typescript
// Add to seed-pricing.ts

async function seedProductPricing(tierIds: number[]) {
  console.log("🔵 Seeding product pricing...");

  // Get all products
  const productsResult = await db.execute(sql`SELECT id, name FROM products`);
  const products = productsResult[0] as any[];

  console.log(`Found ${products.length} products\n`);

  let pricingCount = 0;

  for (const product of products) {
    // Base price (random between $10-$100)
    const basePrice = Math.floor(Math.random() * 90) + 10;

    for (const tierId of tierIds) {
      // Get tier discount
      const tierResult = await db.execute(sql`
        SELECT discount_percentage FROM priceTiers WHERE id = ${tierId}
      `);
      const discount = (tierResult[0] as any[])[0].discount_percentage;

      // Calculate tier price
      const tierPrice = basePrice * (1 - discount / 100);

      // Insert pricing
      await db.execute(sql`
        INSERT INTO productPricing (product_id, price_tier_id, price, effective_date)
        VALUES (${product.id}, ${tierId}, ${tierPrice.toFixed(2)}, CURDATE())
      `);

      pricingCount++;
    }

    if (pricingCount % 50 === 0) {
      console.log(`✓ Processed ${pricingCount} pricing records...`);
    }
  }

  console.log(`\n✓ Inserted ${pricingCount} product pricing records\n`);
}
```

**Step 3.2: Run product pricing seeding**

```bash
pnpm exec tsx scripts/seed-pricing.ts
```

**Step 3.3: Verify product pricing**

```sql
SELECT COUNT(*) FROM productPricing;
SELECT pt.name, COUNT(*) as products
FROM productPricing pp
JOIN priceTiers pt ON pp.price_tier_id = pt.id
GROUP BY pt.name;
```

---

### Phase 4: Assign Clients to Tiers (30 min)

**Step 4.1: Add client tier assignment to script**

```typescript
// Add to seed-pricing.ts

async function assignClientTiers(tierIds: number[]) {
  console.log("🔵 Assigning clients to pricing tiers...");

  // Get all clients
  const clientsResult = await db.execute(sql`SELECT id, name FROM clients`);
  const clients = clientsResult[0] as any[];

  console.log(`Found ${clients.length} clients\n`);

  // Distribution: 60% Retail, 25% Wholesale, 10% VIP, 5% Medical
  const distribution = [
    { tier: tierIds[0], percentage: 60 }, // Retail
    { tier: tierIds[1], percentage: 25 }, // Wholesale
    { tier: tierIds[2], percentage: 10 }, // VIP
    { tier: tierIds[3], percentage: 5 }, // Medical
  ];

  let assignedCount = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];

    // Determine tier based on distribution
    let tierId;
    const rand = Math.random() * 100;
    if (rand < 60) {
      tierId = tierIds[0]; // Retail
    } else if (rand < 85) {
      tierId = tierIds[1]; // Wholesale
    } else if (rand < 95) {
      tierId = tierIds[2]; // VIP
    } else {
      tierId = tierIds[3]; // Medical
    }

    await db.execute(sql`
      INSERT INTO clientPricingTiers (client_id, price_tier_id, assigned_date)
      VALUES (${client.id}, ${tierId}, CURDATE())
    `);

    assignedCount++;
  }

  console.log(`✓ Assigned ${assignedCount} clients to pricing tiers\n`);
}
```

**Step 4.2: Run client tier assignment**

```bash
pnpm exec tsx scripts/seed-pricing.ts
```

**Step 4.3: Verify client assignments**

```sql
SELECT pt.name, COUNT(*) as clients
FROM clientPricingTiers cpt
JOIN priceTiers pt ON cpt.price_tier_id = pt.id
GROUP BY pt.name;
```

---

### Phase 5: Create Price Overrides (30 min)

**Step 5.1: Add price overrides to script**

```typescript
// Add to seed-pricing.ts

async function createPriceOverrides() {
  console.log("🔵 Creating price overrides...");

  // Get some clients and products for overrides
  const clientsResult = await db.execute(sql`SELECT id FROM clients LIMIT 10`);
  const clients = (clientsResult[0] as any[]).map(c => c.id);

  const productsResult = await db.execute(
    sql`SELECT id FROM products LIMIT 20`
  );
  const products = (productsResult[0] as any[]).map(p => p.id);

  let overrideCount = 0;

  // Create 15 random overrides
  for (let i = 0; i < 15; i++) {
    const clientId = clients[Math.floor(Math.random() * clients.length)];
    const productId = products[Math.floor(Math.random() * products.length)];

    // Get base price
    const priceResult = await db.execute(sql`
      SELECT price FROM productPricing 
      WHERE product_id = ${productId} 
      LIMIT 1
    `);
    const basePrice = (priceResult[0] as any[])[0].price;

    // Override with 10-30% discount
    const discount = 10 + Math.random() * 20;
    const overridePrice = basePrice * (1 - discount / 100);

    await db.execute(sql`
      INSERT INTO priceOverrides (client_id, product_id, override_price, reason, effective_date)
      VALUES (
        ${clientId}, 
        ${productId}, 
        ${overridePrice.toFixed(2)}, 
        'Volume discount - special deal',
        CURDATE()
      )
    `);

    overrideCount++;
  }

  console.log(`✓ Created ${overrideCount} price overrides\n`);
}
```

**Step 5.2: Run price override creation**

```bash
pnpm exec tsx scripts/seed-pricing.ts
```

**Step 5.3: Verify overrides**

```sql
SELECT COUNT(*) FROM priceOverrides;
SELECT * FROM priceOverrides LIMIT 10;
```

---

### Phase 6: Testing & Validation (30 min)

**Step 6.1: Validate pricing logic**

```sql
-- Check that all products have pricing in all tiers
SELECT
  (SELECT COUNT(*) FROM products) * (SELECT COUNT(*) FROM priceTiers) as expected,
  (SELECT COUNT(*) FROM productPricing) as actual;

-- Check tier distribution
SELECT pt.name, COUNT(*) as clients
FROM clientPricingTiers cpt
JOIN priceTiers pt ON cpt.price_tier_id = pt.id
GROUP BY pt.name;

-- Check price ranges by tier
SELECT pt.name,
  MIN(pp.price) as min_price,
  MAX(pp.price) as max_price,
  AVG(pp.price) as avg_price
FROM productPricing pp
JOIN priceTiers pt ON pp.price_tier_id = pt.id
GROUP BY pt.name;
```

**Step 6.2: Test pricing in app**

1. Open a product page
2. Verify pricing shows for different tiers
3. Check client pricing tier assignment
4. Verify price overrides apply correctly

**Step 6.3: Validate operational coherence**

```sql
-- Verify tier discounts are correct
SELECT pt.name, pt.discount_percentage,
  AVG(pp.price) as avg_price
FROM productPricing pp
JOIN priceTiers pt ON pp.price_tier_id = pt.id
GROUP BY pt.name, pt.discount_percentage
ORDER BY pt.discount_percentage;

-- Should show: Retail (0%) > Wholesale (15%) > Medical (20%) > VIP (25%)
```

---

### Phase 7: Documentation & Completion (15 min)

**Step 7.1: Update roadmap**

Edit `docs/roadmaps/MASTER_ROADMAP.md`:

```markdown
### DATA-003: Seed Pricing Tables

**Status:** ✅ Complete (2025-11-17)

**Resolution:** Successfully seeded 4 pricing tables with operationally coherent data:

- priceTiers: 4 tiers (Retail, Wholesale, VIP, Medical)
- productPricing: 400+ pricing records (100+ products × 4 tiers)
- clientPricingTiers: 50 client assignments
- priceOverrides: 15 special pricing deals

Pricing system now fully functional with realistic data. See scripts/seed-pricing.ts for implementation.
```

**Step 7.2: Archive session**

```bash
# Move session file
mv docs/sessions/active/Session-*-DATA-003-*.md docs/sessions/completed/

# Remove from ACTIVE_SESSIONS.md
# (edit the file to remove the DATA-003 line)

# Commit
git add -A
git commit -m "Complete DATA-003: Seed pricing tables

- Created 4 price tiers with logical discounts
- Seeded 400+ product pricing records
- Assigned 50 clients to appropriate tiers
- Created 15 price overrides for special deals
- Pricing system now fully testable and demoable"
git push origin main
```

---

## Success Criteria

- [ ] 4 price tiers created
- [ ] 400+ product pricing records (all products × all tiers)
- [ ] 50 clients assigned to tiers
- [ ] 15+ price overrides created
- [ ] Pricing logic validated (discounts correct)
- [ ] Pricing works in app
- [ ] Roadmap updated to complete
- [ ] Session archived

---

## Important Notes

⚠️ **Wait for INFRA-003 to complete before starting!**

If you start before INFRA-003, you may encounter:

- Schema mismatch errors
- Missing columns
- Failed inserts

**Coordination with DATA-002:**

- DATA-003 and DATA-002 can run in parallel
- No conflicts (different tables)
- Both should start AFTER INFRA-003 completes

---

## Pricing Logic Reference

**Tier Hierarchy (by discount):**

1. Retail: 0% discount (base price)
2. Wholesale: 15% discount
3. Medical: 20% discount
4. VIP: 25% discount

**Client Distribution:**

- 60% Retail (most common)
- 25% Wholesale (bulk buyers)
- 10% VIP (premium customers)
- 5% Medical (special pricing)

**Price Overrides:**

- Applied on top of tier pricing
- Typically 10-30% additional discount
- Used for volume deals, special relationships

---

## Estimated Time

- Phase 1: 15 min (setup)
- Phase 2: 30 min (seed tiers)
- Phase 3: 45-60 min (seed product pricing)
- Phase 4: 30 min (assign clients)
- Phase 5: 30 min (price overrides)
- Phase 6: 30 min (testing)
- Phase 7: 15 min (documentation)

**Total: 2-3 hours**

---

Good luck! This will make the pricing system fully functional and enable order creation, invoicing, and revenue tracking.
