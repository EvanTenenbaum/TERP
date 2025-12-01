# Database Schema Standards Protocol

**Version:** 1.0
**Last Updated:** 2025-12-01
**Status:** Active & Enforced

This protocol defines database schema standards for consistency, performance, and data integrity.

---

## 1. Data Type Standards

### Numeric Types

| Data Category | Type | Example |
|---------------|------|---------|
| Monetary values | `decimal(15, 2)` | Prices, totals, payments |
| Quantities | `decimal(15, 4)` | Stock counts, order quantities |
| Percentages | `decimal(5, 2)` | Tax rates, discount rates |
| IDs | `int` auto-increment | Primary keys |
| External IDs | `varchar(50)` | UUIDs, external system IDs |

```typescript
// ✅ CORRECT
unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),

// ❌ FORBIDDEN
quantity: varchar('quantity', { length: 20 }), // NO! Use decimal
price: int('price'), // NO! Use decimal for money
```

### Boolean Types

```typescript
// ✅ CORRECT
isActive: boolean('is_active').notNull().default(true),
isCompleted: boolean('is_completed').notNull().default(false),

// ❌ FORBIDDEN
isActive: int('is_active').notNull().default(1), // NO! Use boolean
isSample: int('isSample').notNull().default(0), // NO! Use boolean
```

### String Types

| Data Category | Type | Example |
|---------------|------|---------|
| Short text (< 255 chars) | `varchar(length)` | Names, codes, statuses |
| Long text | `text` | Descriptions, notes |
| Fixed-length codes | `char(length)` | Country codes, currency codes |
| Enums | `varchar` with enum type | Status values |

```typescript
// ✅ CORRECT
name: varchar('name', { length: 255 }).notNull(),
description: text('description'),
status: varchar('status', { length: 50 }).notNull().$type<OrderStatus>(),
countryCode: char('country_code', { length: 2 }),

// ❌ FORBIDDEN
status: varchar('status', { length: 500 }), // Too long for status
name: text('name'), // Use varchar for short text
```

### Timestamp Types

```typescript
// ✅ CORRECT - All tables should have these
createdAt: timestamp('created_at').defaultNow().notNull(),
updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
deletedAt: timestamp('deleted_at'), // For soft deletes

// ❌ FORBIDDEN
createdAt: varchar('created_at', { length: 50 }), // NO! Use timestamp
created: int('created'), // NO! Use timestamp
```

---

## 2. Naming Conventions

### Tables

| Convention | Example |
|------------|---------|
| Plural | `orders`, `clients`, `products` |
| snake_case | `order_line_items`, `client_contacts` |
| Descriptive | `purchase_order_items` not `po_items` |

```typescript
// ✅ CORRECT
export const orderLineItems = mysqlTable('order_line_items', { ... });
export const clientPaymentTerms = mysqlTable('client_payment_terms', { ... });

// ❌ FORBIDDEN
export const orderLineItem = mysqlTable('orderLineItem', { ... }); // camelCase
export const oli = mysqlTable('oli', { ... }); // Abbreviations
```

### Columns

| Convention | Example |
|------------|---------|
| snake_case | `created_at`, `client_id`, `unit_price` |
| Foreign keys end with `_id` | `client_id`, `order_id` |
| Boolean prefix `is_` or `has_` | `is_active`, `has_shipping` |
| Timestamps end with `_at` | `created_at`, `shipped_at` |

```typescript
// ✅ CORRECT
clientId: int('client_id').notNull().references(() => clients.id),
isActive: boolean('is_active').notNull().default(true),
completedAt: timestamp('completed_at'),

// ❌ FORBIDDEN
ClientId: int('ClientId'), // PascalCase
client: int('client'), // Missing _id suffix
active: boolean('active'), // Missing is_ prefix
```

### Indexes

```typescript
// Format: idx_tablename_column(s)
// ✅ CORRECT
clientIdIdx: index('idx_orders_client_id').on(orders.clientId),
statusDateIdx: index('idx_orders_status_created').on(orders.status, orders.createdAt),

// ❌ FORBIDDEN
index1: index('index1').on(orders.clientId), // Non-descriptive
```

---

## 3. Required Columns

### All Tables MUST Have

```typescript
export const myTable = mysqlTable('my_table', {
  id: int('id').primaryKey().autoincrement(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  // ... other columns
});
```

### Transactional Tables MUST Have

For tables where records can be "deleted" but should be retained:

```typescript
export const orders = mysqlTable('orders', {
  id: int('id').primaryKey().autoincrement(),
  // ... other columns
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});
```

---

## 4. Foreign Key Standards

### Always Define References

```typescript
// ✅ CORRECT
clientId: int('client_id')
  .notNull()
  .references(() => clients.id, { onDelete: 'restrict' }),

orderId: int('order_id')
  .notNull()
  .references(() => orders.id, { onDelete: 'cascade' }),
```

### OnDelete Strategies

| Relationship | Strategy | Example |
|--------------|----------|---------|
| Parent-child (required) | `cascade` | Order → Line items |
| Reference (required) | `restrict` | Order → Client |
| Reference (optional) | `set null` | Order → Sales rep |

```typescript
// Line items deleted when order deleted
orderId: int('order_id')
  .notNull()
  .references(() => orders.id, { onDelete: 'cascade' }),

// Cannot delete client with orders
clientId: int('client_id')
  .notNull()
  .references(() => clients.id, { onDelete: 'restrict' }),

// Sales rep can be removed from order
salesRepId: int('sales_rep_id')
  .references(() => users.id, { onDelete: 'set null' }),
```

---

## 5. Index Requirements

### MUST Have Index

| Column Type | Reason |
|-------------|--------|
| All foreign keys | Join performance |
| Columns in WHERE clauses | Query performance |
| Columns in ORDER BY | Sort performance |
| Unique constraints | Enforcement + lookup |

### Composite Indexes

For frequently-used filter combinations:

```typescript
// If queries often filter by status AND client
statusClientIdx: index('idx_orders_status_client')
  .on(orders.status, orders.clientId),

// If queries often filter by date range AND status
dateStatusIdx: index('idx_orders_created_status')
  .on(orders.createdAt, orders.status),
```

### Index Naming

```typescript
// Single column: idx_table_column
idx_orders_client_id

// Composite: idx_table_col1_col2
idx_orders_status_created

// Unique: uniq_table_column
uniq_users_email
```

---

## 6. Enum Standards

### Define Enums Clearly

```typescript
// ✅ CORRECT: Values are UPPER_SNAKE_CASE
export const orderStatusEnum = mysqlEnum('order_status', [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

// In table
status: orderStatusEnum('status').notNull().default('PENDING'),
```

### TypeScript Enum Alignment

```typescript
// Ensure TypeScript enum matches database enum
export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// Use in schema
status: varchar('status', { length: 50 })
  .notNull()
  .$type<OrderStatus>()
  .default(OrderStatus.PENDING),
```

---

## 7. JSON Column Standards

### When to Use JSON

| Use Case | Appropriate |
|----------|-------------|
| Dynamic/flexible config | ✅ Yes |
| Metadata without queries | ✅ Yes |
| Frequently queried data | ❌ No (use columns) |
| Relational data | ❌ No (use tables) |

### Always Type JSON Columns

```typescript
// ✅ CORRECT: Typed JSON
interface WidgetConfig {
  id: string;
  isVisible: boolean;
  order?: number;
}

widgetConfig: json('widget_config')
  .$type<WidgetConfig[]>()
  .notNull()
  .default([]),

// ❌ FORBIDDEN: Untyped JSON
metadata: json('metadata'), // No type!
```

---

## 8. Soft Delete Pattern

### Standard Implementation

```typescript
// In schema
export const orders = mysqlTable('orders', {
  // ... columns
  deletedAt: timestamp('deleted_at'),
});

// In queries - ALWAYS filter
const activeOrders = await db.query.orders.findMany({
  where: isNull(orders.deletedAt),
});

// Soft delete
await db.update(orders)
  .set({ deletedAt: new Date() })
  .where(eq(orders.id, orderId));
```

### Create Query Helper

```typescript
// db/helpers.ts
export function notDeleted<T extends { deletedAt: unknown }>(
  table: T
) {
  return isNull(table.deletedAt);
}

// Usage
const orders = await db.query.orders.findMany({
  where: notDeleted(orders),
});
```

---

## 9. Migration Standards

### Migration File Naming

```
NNNN_description_of_change.sql

Examples:
0001_create_users_table.sql
0002_add_orders_table.sql
0003_add_client_id_index.sql
0004_change_quantity_to_decimal.sql
```

### Migration Content

```sql
-- Always include comment header
-- Migration: 0004_change_quantity_to_decimal
-- Date: 2025-12-01
-- Description: Change quantity columns from VARCHAR to DECIMAL

-- 1. Add new column
ALTER TABLE batches ADD COLUMN quantity_new DECIMAL(15, 4);

-- 2. Migrate data
UPDATE batches SET quantity_new = CAST(quantity AS DECIMAL(15, 4));

-- 3. Drop old column (or rename)
ALTER TABLE batches DROP COLUMN quantity;

-- 4. Rename new column
ALTER TABLE batches CHANGE quantity_new quantity DECIMAL(15, 4) NOT NULL;
```

### Review Before Applying

- [ ] Reviewed generated SQL
- [ ] Tested on staging/dev database
- [ ] Backward compatible (or coordinated with app deploy)
- [ ] Has rollback plan

---

## 10. Computed/Denormalized Fields

### When to Denormalize

| Scenario | Approach |
|----------|----------|
| Expensive aggregations | Denormalize with scheduled refresh |
| Frequently read, rarely changed | Denormalize with trigger |
| Real-time required | Calculate on read |

### Document Denormalized Fields

```typescript
// ✅ CORRECT: Document the denormalization
export const clients = mysqlTable('clients', {
  // ...

  // DENORMALIZED: Updated by cron job every hour
  // Source: SUM(orders.total) WHERE status != 'CANCELLED'
  totalSpent: decimal('total_spent', { precision: 15, scale: 2 }).default('0'),

  // DENORMALIZED: Updated on order completion
  // Source: COUNT(orders) WHERE status = 'DELIVERED'
  orderCount: int('order_count').default(0),
});
```

### Create Refresh Functions

```typescript
// scripts/refresh-client-totals.ts
export async function refreshClientTotals(clientId?: number) {
  const condition = clientId ? eq(orders.clientId, clientId) : undefined;

  // Calculate from source
  const totals = await db
    .select({
      clientId: orders.clientId,
      totalSpent: sum(orders.total),
    })
    .from(orders)
    .where(and(
      ne(orders.status, 'CANCELLED'),
      isNull(orders.deletedAt),
      condition,
    ))
    .groupBy(orders.clientId);

  // Update denormalized fields
  for (const { clientId, totalSpent } of totals) {
    await db.update(clients)
      .set({ totalSpent })
      .where(eq(clients.id, clientId));
  }
}
```

---

## 11. Schema File Organization

```typescript
// drizzle/schema.ts structure

// 1. Imports
import { mysqlTable, int, varchar, ... } from 'drizzle-orm/mysql-core';

// 2. Enums
export const orderStatusEnum = mysqlEnum('order_status', [...]);

// 3. Core tables (users, clients, vendors)
export const users = mysqlTable('users', { ... });
export const clients = mysqlTable('clients', { ... });

// 4. Transaction tables (orders, invoices)
export const orders = mysqlTable('orders', { ... });
export const orderLineItems = mysqlTable('order_line_items', { ... });

// 5. Support tables (calendar, todos)
export const calendarEvents = mysqlTable('calendar_events', { ... });

// 6. Type exports at the end
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
```

---

**Schema changes that don't follow these standards will be rejected.**
