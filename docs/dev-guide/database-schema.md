# Database Schema Guide

**Last Updated:** 2025-12-31

---

## Overview

TERP uses Drizzle ORM with MySQL for database management. This guide covers schema design, migrations, and best practices.

---

## Schema Location

The database schema is defined in:

```
drizzle/
├── schema.ts      # Main schema definitions
└── migrations/    # Generated SQL migrations
```

---

## Defining Tables

### Basic Table

```typescript
// drizzle/schema.ts
import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/mysql-core";

export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
```

### Column Types

| Drizzle Type  | MySQL Type | Use Case               |
| ------------- | ---------- | ---------------------- |
| `int()`       | INT        | IDs, counts            |
| `bigint()`    | BIGINT     | Large numbers          |
| `varchar()`   | VARCHAR    | Short strings          |
| `text()`      | TEXT       | Long text              |
| `boolean()`   | TINYINT(1) | True/false             |
| `timestamp()` | TIMESTAMP  | Date/time              |
| `date()`      | DATE       | Date only              |
| `decimal()`   | DECIMAL    | Money, precise numbers |
| `json()`      | JSON       | JSON data              |

### Column Modifiers

```typescript
// Required field
name: varchar("name", { length: 255 }).notNull(),

// Default value
isActive: boolean("is_active").default(true),

// Auto-increment
id: int("id").primaryKey().autoincrement(),

// Current timestamp
createdAt: timestamp("created_at").defaultNow(),

// Update on change
updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),

// Unique constraint
email: varchar("email", { length: 255 }).unique(),
```

---

## Relationships

### One-to-Many

```typescript
// Parent table
export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
});

// Child table with foreign key
export const orders = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id")
    .notNull()
    .references(() => clients.id),
  total: decimal("total", { precision: 10, scale: 2 }),
});

// Define relations for queries
export const clientsRelations = relations(clients, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
}));
```

### Many-to-Many

```typescript
// Junction table
export const orderItems = mysqlTable("order_items", {
  id: int("id").primaryKey().autoincrement(),
  orderId: int("order_id")
    .notNull()
    .references(() => orders.id),
  batchId: int("batch_id")
    .notNull()
    .references(() => batches.id),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
});
```

---

## Indexes

### Creating Indexes

```typescript
import { index, uniqueIndex } from "drizzle-orm/mysql-core";

export const clients = mysqlTable(
  "clients",
  {
    id: int("id").primaryKey().autoincrement(),
    email: varchar("email", { length: 255 }),
    teriCode: varchar("teri_code", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    // Single column index
    emailIdx: index("email_idx").on(table.email),

    // Unique index
    teriCodeIdx: uniqueIndex("teri_code_idx").on(table.teriCode),

    // Composite index
    createdEmailIdx: index("created_email_idx").on(
      table.createdAt,
      table.email
    ),
  })
);
```

### Index Guidelines

- Index foreign keys
- Index columns used in WHERE clauses
- Index columns used in ORDER BY
- Use composite indexes for multi-column queries
- Avoid over-indexing (slows writes)

---

## Enums

```typescript
import { mysqlEnum } from "drizzle-orm/mysql-core";

export const orderStatusEnum = mysqlEnum("order_status", [
  "DRAFT",
  "QUOTE",
  "CONFIRMED",
  "PICKING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const orders = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  status: orderStatusEnum("status").default("DRAFT"),
});
```

---

## Soft Deletes

Implement soft deletes for data recovery:

```typescript
export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  deletedAt: timestamp("deleted_at"), // NULL = not deleted
});

// Query active records only
const activeClients = await db.query.clients.findMany({
  where: isNull(clients.deletedAt),
});

// Soft delete
await db
  .update(clients)
  .set({ deletedAt: new Date() })
  .where(eq(clients.id, clientId));
```

---

## Migrations

### Generating Migrations

After modifying `schema.ts`:

```bash
# Generate migration
pnpm db:generate

# Apply migration
pnpm db:migrate
```

### Migration Files

Generated in `drizzle/migrations/`:

```
migrations/
├── 0000_initial.sql
├── 0001_add_clients_table.sql
├── 0002_add_orders_table.sql
└── meta/
    └── _journal.json
```

### Development vs Production

| Command           | Use Case                         |
| ----------------- | -------------------------------- |
| `pnpm db:push`    | Development - direct schema sync |
| `pnpm db:migrate` | Production - apply migrations    |

**Warning:** `db:push` can cause data loss. Use migrations in production.

---

## Querying

### Select

```typescript
import { getDb } from "../db";
import { eq, like, and, or, desc, asc } from "drizzle-orm";

const db = await getDb();

// Find all
const allClients = await db.query.clients.findMany();

// Find with conditions
const activeClients = await db.query.clients.findMany({
  where: eq(clients.isActive, true),
});

// Find one
const client = await db.query.clients.findFirst({
  where: eq(clients.id, 1),
});

// Complex conditions
const results = await db.query.clients.findMany({
  where: and(
    eq(clients.isActive, true),
    or(like(clients.name, "%Acme%"), like(clients.email, "%acme%"))
  ),
  orderBy: [desc(clients.createdAt)],
  limit: 10,
  offset: 0,
});
```

### With Relations

```typescript
const clientWithOrders = await db.query.clients.findFirst({
  where: eq(clients.id, 1),
  with: {
    orders: {
      limit: 10,
      orderBy: [desc(orders.createdAt)],
    },
  },
});
```

### Insert

```typescript
// Single insert
const result = await db.insert(clients).values({
  name: "New Client",
  email: "new@example.com",
});

// Get inserted ID
const newId = result[0].insertId;

// Bulk insert
await db.insert(clients).values([
  { name: "Client 1", email: "c1@example.com" },
  { name: "Client 2", email: "c2@example.com" },
]);
```

### Update

```typescript
await db
  .update(clients)
  .set({
    name: "Updated Name",
    updatedAt: new Date(),
  })
  .where(eq(clients.id, 1));
```

### Delete

```typescript
// Hard delete
await db.delete(clients).where(eq(clients.id, 1));

// Soft delete (preferred)
await db
  .update(clients)
  .set({ deletedAt: new Date() })
  .where(eq(clients.id, 1));
```

---

## Transactions

```typescript
import { getDb } from "../db";

const db = await getDb();

await db.transaction(async tx => {
  // Create order
  const orderResult = await tx.insert(orders).values({
    clientId: 1,
    status: "CONFIRMED",
  });

  const orderId = orderResult[0].insertId;

  // Create order items
  await tx.insert(orderItems).values([
    { orderId, batchId: 1, quantity: "10" },
    { orderId, batchId: 2, quantity: "5" },
  ]);

  // Update inventory
  await tx
    .update(batches)
    .set({ onHandQty: sql`on_hand_qty - 10` })
    .where(eq(batches.id, 1));
});
```

---

## Best Practices

### Naming Conventions

| Element      | Convention             | Example             |
| ------------ | ---------------------- | ------------------- |
| Tables       | snake_case, plural     | `order_items`       |
| Columns      | snake_case             | `client_id`         |
| Foreign Keys | `{table}_id`           | `client_id`         |
| Indexes      | `{table}_{column}_idx` | `clients_email_idx` |
| Enums        | snake_case             | `order_status`      |

### Data Types

- Use `decimal` for money (not `float`)
- Use `timestamp` for dates with time
- Use `varchar` with appropriate length limits
- Use `text` only when needed (no length limit)

### Performance

1. **Index foreign keys** - Always index FK columns
2. **Use appropriate types** - Don't use `text` for short strings
3. **Limit query results** - Always use pagination
4. **Select specific columns** - Don't select `*` in production
5. **Use transactions** - For multi-table operations

### Schema Changes

1. **Add columns as nullable** - Or with defaults
2. **Never rename columns** - Add new, migrate data, drop old
3. **Test migrations** - On a copy of production data
4. **Back up before migrations** - Always

---

## Drizzle Studio

View and edit data in browser:

```bash
pnpm db:studio
```

Opens at [https://local.drizzle.studio](https://local.drizzle.studio)

---

## Troubleshooting

### "Column doesn't exist"

Schema and database are out of sync:

```bash
pnpm db:push  # Development
pnpm db:migrate  # Production
```

### "Duplicate entry"

Unique constraint violation. Check for existing records.

### "Foreign key constraint fails"

Referenced record doesn't exist or is being deleted with dependent records.

### "Data too long"

Value exceeds column length. Increase varchar length or use text.

---

_For more details, see the [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview)._
