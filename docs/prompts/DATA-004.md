# DATA-004: Seed Orders & Line Items

**Task ID:** DATA-004  
**Priority:** P1 (High)  
**Estimate:** 1.5-2 hours  
**Status:** ready  
**Depends On:** DATA-002, DATA-003 (completed)

---

## Objective

Seed 20-30 realistic orders with line items to enable sales workflow testing and demonstrate order management functionality.

**Tables to Seed:**

1. `orders` - 20-30 order records
2. `orderLineItems` - 50-100 line items across orders
3. `orderStatusHistory` - Status change tracking for orders

---

## Context

**Why This Matters:**

- Orders are the core of the ERP system
- Currently 0 orders in the database
- Blocks testing of order workflows, invoicing, and sales reporting
- Essential for demonstrating end-to-end sales functionality

**Current State:**

- `orders`: 0 records (EMPTY)
- `orderLineItems`: 0 records (EMPTY)
- `orderStatusHistory`: Some records exist from other operations
- Products: 100+ products exist
- Clients: 68 clients exist
- Pricing Profiles: 5 profiles exist (from DATA-003)

**Business Requirements:**

- Orders must have realistic dates (past 3 months)
- Orders must use existing clients
- Line items must reference real products
- Order totals must be calculated correctly
- Mix of order statuses (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED)
- Mix of order types based on client pricing profiles

---

## Deliverables

1. ✅ `scripts/seed-orders.ts` - Order seeding script
2. ✅ 20-30 orders created
3. ✅ 50-100 order line items created
4. ✅ Order status history populated
5. ✅ Realistic order totals and dates
6. ✅ Mix of order statuses
7. ✅ Validation that order data is correct
8. ✅ Roadmap updated to complete

---

## Implementation Protocol

### Phase 1: Setup & Schema Discovery (20 min)

**Step 1.1: Register session**

```bash
cd /home/ubuntu/TERP
SESSION_ID="Session-$(date +%Y%m%d)-DATA-004-$(openssl rand -hex 4)"
echo "- DATA-004: $SESSION_ID ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
git add docs/ACTIVE_SESSIONS.md
git commit -m "Register DATA-004 session"
git push origin main
```

**Step 1.2: Query actual table schemas**

```sql
-- Check orders table structure
DESCRIBE orders;

-- Check orderLineItems table structure
DESCRIBE orderLineItems;

-- Check orderStatusHistory table structure
DESCRIBE orderStatusHistory;

-- Verify existing data
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM orderLineItems;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM clients;
```

**Step 1.3: Get sample data for reference**

```sql
-- Get some products
SELECT id, name, category, price FROM products LIMIT 10;

-- Get some clients
SELECT id, name, email FROM clients LIMIT 10;

-- Get pricing profiles
SELECT id, name FROM pricing_profiles;
```

---

### Phase 2: Create Seeding Script (30-40 min)

**Step 2.1: Create script structure**

```typescript
// scripts/seed-orders.ts
import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING ORDERS & LINE ITEMS ===\n");

async function seedOrders() {
  try {
    // Phase 1: Verify prerequisites
    console.log("📋 Phase 1: Verifying prerequisites...");

    const tablesResult = await db.execute(sql`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'defaultdb' 
      AND TABLE_NAME IN ('orders', 'orderLineItems', 'orderStatusHistory')
    `);
    const tables = (tablesResult[0] as { TABLE_NAME: string }[]).map(
      t => t.TABLE_NAME
    );
    console.log(
      `✓ Found ${tables.length}/3 required tables: ${tables.join(", ")}\n`
    );

    // Get existing data
    const clientsResult = await db.execute(
      sql`SELECT id, name FROM clients LIMIT 30`
    );
    const clients = clientsResult[0] as { id: number; name: string }[];

    const productsResult = await db.execute(
      sql`SELECT id, name, price FROM products LIMIT 50`
    );
    const products = productsResult[0] as {
      id: number;
      name: string;
      price: string;
    }[];

    const usersResult = await db.execute(sql`SELECT id FROM users LIMIT 5`);
    const users = usersResult[0] as { id: number }[];

    console.log(`✓ Found ${clients.length} clients`);
    console.log(`✓ Found ${products.length} products`);
    console.log(`✓ Found ${users.length} users\n`);

    if (clients.length === 0 || products.length === 0) {
      console.error("❌ Missing required data (clients or products)");
      process.exit(1);
    }

    // Phase 2: Seed Orders
    console.log("📦 Phase 2: Seeding orders...");

    const orderStatuses = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];
    const orderCount = 25; // Target 25 orders
    const createdOrders: number[] = [];

    for (let i = 0; i < orderCount; i++) {
      const client = clients[i % clients.length];
      const user = users[i % users.length];
      const status =
        orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

      // Random date in past 90 days
      const daysAgo = Math.floor(Math.random() * 90);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      // Generate order number
      const orderNumber = `ORD-${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(4, "0")}`;

      // Insert order (adjust columns based on actual schema)
      const orderResult = await db.execute(sql`
        INSERT INTO orders (
          orderNumber,
          clientId,
          userId,
          orderStatus,
          orderDate,
          totalAmount,
          createdAt
        ) VALUES (
          ${orderNumber},
          ${client.id},
          ${user.id},
          ${status},
          ${orderDate.toISOString().split("T")[0]},
          0, -- Will update after line items
          ${orderDate.toISOString()}
        )
      `);

      // Get the inserted order ID
      const orderIdResult = await db.execute(
        sql`SELECT LAST_INSERT_ID() as id`
      );
      const orderId = (orderIdResult[0] as { id: number }[])[0].id;
      createdOrders.push(orderId);

      // Add line items (2-5 per order)
      const lineItemCount = 2 + Math.floor(Math.random() * 4);
      let orderTotal = 0;

      for (let j = 0; j < lineItemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = 1 + Math.floor(Math.random() * 10);
        const unitPrice = parseFloat(product.price || "0");
        const lineTotal = unitPrice * quantity;
        orderTotal += lineTotal;

        await db.execute(sql`
          INSERT INTO orderLineItems (
            orderId,
            productId,
            quantity,
            unitPrice,
            totalPrice
          ) VALUES (
            ${orderId},
            ${product.id},
            ${quantity},
            ${unitPrice},
            ${lineTotal}
          )
        `);
      }

      // Update order total
      await db.execute(sql`
        UPDATE orders 
        SET totalAmount = ${orderTotal}
        WHERE id = ${orderId}
      `);

      // Add status history entry
      await db.execute(sql`
        INSERT INTO orderStatusHistory (
          orderId,
          fulfillmentStatus,
          changedAt,
          changedBy
        ) VALUES (
          ${orderId},
          ${status},
          ${orderDate.toISOString()},
          ${user.id}
        )
      `);
    }

    console.log(`✓ Created ${orderCount} orders\n`);

    // Phase 3: Validation
    console.log("✅ Phase 3: Validating seeded data...");

    const ordersCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM orders`
    );
    const lineItemsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM orderLineItems`
    );
    const statusHistoryCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM orderStatusHistory WHERE orderId IN (${sql.join(createdOrders, sql`, `)})`
    );

    console.log("📊 Summary:");
    console.log(
      `  - Orders: ${(ordersCount[0] as { count: number }[])[0].count}`
    );
    console.log(
      `  - Order Line Items: ${(lineItemsCount[0] as { count: number }[])[0].count}`
    );
    console.log(
      `  - Status History Entries: ${(statusHistoryCount[0] as { count: number }[])[0].count}`
    );

    // Show order distribution by status
    const statusDist = await db.execute(sql`
      SELECT orderStatus, COUNT(*) as count 
      FROM orders 
      GROUP BY orderStatus
    `);
    console.log("\n📈 Orders by Status:");
    (statusDist[0] as { orderStatus: string; count: number }[]).forEach(row => {
      console.log(`  - ${row.orderStatus}: ${row.count}`);
    });
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedOrders();
```

**Step 2.2: Adjust script based on actual schema**

After querying the schema in Step 1.2, adjust the script to match actual column names:

- Check if `orderNumber` or `order_number`
- Check if `clientId` or `client_id`
- Check if `orderStatus` or `order_status`
- Check if `totalAmount` or `total_amount`
- Adjust all column names to match snake_case or camelCase

---

### Phase 3: Execute Seeding (10-15 min)

**Step 3.1: Run the seeding script**

```bash
cd /home/ubuntu/TERP
pnpm exec tsx scripts/seed-orders.ts
```

**Step 3.2: Verify results**

```sql
-- Check order counts
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM orderLineItems;

-- Check order distribution
SELECT orderStatus, COUNT(*)
FROM orders
GROUP BY orderStatus;

-- Check order totals
SELECT
  o.id,
  o.orderNumber,
  o.totalAmount,
  COUNT(oli.id) as line_items
FROM orders o
LEFT JOIN orderLineItems oli ON o.id = oli.orderId
GROUP BY o.id
LIMIT 10;

-- Verify line item totals match order totals
SELECT
  o.id,
  o.orderNumber,
  o.totalAmount as order_total,
  SUM(oli.totalPrice) as line_items_total,
  (o.totalAmount - SUM(oli.totalPrice)) as difference
FROM orders o
JOIN orderLineItems oli ON o.id = oli.orderId
GROUP BY o.id
HAVING ABS(difference) > 0.01;
-- Should return 0 rows if totals match
```

---

### Phase 4: Documentation (15-20 min)

**Step 4.1: Update session file**

Create `docs/sessions/active/Session-[ID].md`:

```markdown
# Session: DATA-004 - Seed Orders & Line Items

**Session ID:** [Your Session ID]  
**Task:** DATA-004  
**Started:** [Date/Time]  
**Status:** Complete

## Objective

Seed 20-30 orders with line items to enable sales workflow testing.

## Progress

- [x] Phase 1: Setup & Schema Discovery
- [x] Phase 2: Create Seeding Script
- [x] Phase 3: Execute Seeding
- [x] Phase 4: Documentation

## Results

- Orders created: [count]
- Line items created: [count]
- Status history entries: [count]
- Order statuses: [distribution]

## Files Created

- `scripts/seed-orders.ts`
- `docs/sessions/active/Session-[ID].md`

## Next Steps

- Archive session
- Update roadmap
- Push to main
```

**Step 4.2: Update roadmap**

Update `docs/roadmaps/MASTER_ROADMAP.md` to mark DATA-004 as complete.

**Step 4.3: Archive session**

```bash
mv docs/sessions/active/Session-[ID].md docs/sessions/completed/
sed -i '/DATA-004/d' docs/ACTIVE_SESSIONS.md
```

---

### Phase 5: Commit & Push (5 min)

```bash
git add -A
git commit -m "DATA-004: Seed orders and line items

- Created seed-orders.ts script
- Seeded [count] orders with [count] line items
- Added status history tracking
- All order totals validated
- Complete documentation"

git push origin main
```

---

## Success Criteria

✅ 20-30 orders created  
✅ 50-100 order line items created  
✅ Order totals match sum of line items  
✅ Orders distributed across different statuses  
✅ Orders span past 90 days  
✅ All orders linked to existing clients  
✅ All line items linked to existing products  
✅ Status history populated  
✅ Script is reusable  
✅ Documentation complete

---

## Notes

### Schema Considerations

- Check actual table structure before writing INSERT statements
- Orders table may use snake_case or camelCase column names
- Verify foreign key constraints (clientId, productId, userId)
- Check if orderNumber is auto-generated or manual

### Data Quality

- Ensure order dates are realistic (past 90 days)
- Ensure order totals are calculated correctly
- Ensure mix of order statuses for realistic testing
- Ensure line items have realistic quantities (1-10)

### Testing After Seeding

- Verify orders display in UI
- Test order filtering by status
- Test order total calculations
- Test line item display
- Test status history tracking

---

**Estimated Time:** 1.5-2 hours  
**Complexity:** Medium  
**Dependencies:** Products, Clients, Users (all exist)
