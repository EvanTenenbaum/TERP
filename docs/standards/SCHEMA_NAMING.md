# Schema Naming Conventions

## Overview

This document defines the naming conventions for database schema in the TERP project. Following these conventions ensures consistency between Drizzle ORM definitions and the actual MySQL database.

## Core Rule: Name Alignment

> **Critical Rule**: Drizzle field name MUST equal DB column name

This prevents schema drift and ensures the ORM accurately represents the database structure.

### Example

```typescript
// ✅ CORRECT - Field name matches column name
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// ❌ INCORRECT - Camel case field name differs from snake_case column
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(), // Field is createdAt, column is created_at
});
```

## Naming Conventions

### Table Names

- Use **snake_case** for table names
- Use **plural** nouns for entity tables
- Use descriptive, clear names

```typescript
// ✅ Good
export const users = mysqlTable('users', { ... });
export const calendar_events = mysqlTable('calendar_events', { ... });
export const order_line_items = mysqlTable('order_line_items', { ... });

// ❌ Bad
export const User = mysqlTable('User', { ... });  // Should be lowercase plural
export const tbl_users = mysqlTable('tbl_users', { ... });  // No prefixes
```

### Column Names

- Use **snake_case** for column names
- Field name in Drizzle MUST match column name exactly
- Use clear, descriptive names

```typescript
// ✅ Good
id: int('id').primaryKey(),
user_id: int('user_id').references(() => users.id),
created_at: timestamp('created_at').defaultNow(),
is_active: boolean('is_active').default(true),

// ❌ Bad
userId: int('user_id'),  // Mismatched names
CreatedAt: timestamp('CreatedAt'),  // Should be snake_case
```

### Foreign Keys

- Name: `{referenced_table}_id`
- Example: `user_id`, `order_id`, `client_id`

```typescript
user_id: int('user_id').references(() => users.id),
order_id: int('order_id').references(() => orders.id),
```

### Boolean Columns

- Prefix with `is_` or `has_`
- Examples: `is_active`, `is_deleted`, `has_shipping`

```typescript
is_active: boolean('is_active').default(true),
is_verified: boolean('is_verified').default(false),
has_attachments: boolean('has_attachments').default(false),
```

### Timestamp Columns

- Use descriptive names indicating the action
- Common patterns:
  - `created_at` - When record was created
  - `updated_at` - When record was last updated
  - `deleted_at` - Soft delete timestamp (nullable)
  - `completed_at` - When action was completed

```typescript
created_at: timestamp('created_at').defaultNow(),
updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
deleted_at: timestamp('deleted_at'),
```

## Enum Handling

### Defining Enums

Use MySQL enum type with explicit values matching application constants:

```typescript
// Define enum values as a const array
export const orderStatusValues = [
  'DRAFT',
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

// Use in schema
status: mysqlEnum('status', orderStatusValues).default('DRAFT'),
```

### Enum Naming Conventions

- Use **SCREAMING_SNAKE_CASE** for enum values
- Use descriptive, action-oriented names
- Keep values short but clear

```typescript
// ✅ Good
status: mysqlEnum('status', ['DRAFT', 'PENDING', 'APPROVED']),
event_type: mysqlEnum('event_type', ['MEETING', 'TASK', 'REMINDER']),

// ❌ Bad
status: mysqlEnum('status', ['draft', 'Pending', 'APPROVED']),  // Inconsistent casing
```

### Enum Best Practices

1. **Define enum values in a separate const** for type safety
2. **Export the type** for use in application code
3. **Use the same values** in both Drizzle and application code

```typescript
// In schema file
export const orderStatusValues = ['DRAFT', 'PENDING', 'CONFIRMED'] as const;
export type OrderStatus = typeof orderStatusValues[number];

// Use in table definition
status: mysqlEnum('status', orderStatusValues).default('DRAFT'),
```

## Index Naming

- Prefix with `idx_`
- Include table and column names
- Example: `idx_users_email`, `idx_orders_created_at`

```typescript
export const users = mysqlTable('users', {
  // columns...
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  createdAtIdx: index('idx_users_created_at').on(table.created_at),
}));
```

## Unique Constraint Naming

- Prefix with `uq_`
- Include table and column names
- Example: `uq_users_email`

```typescript
export const users = mysqlTable('users', {
  email: varchar('email', { length: 255 }).notNull().unique(),
}, (table) => ({
  emailUnique: uniqueIndex('uq_users_email').on(table.email),
}));
```

## Foreign Key Naming

- Prefix with `fk_`
- Format: `fk_{source_table}_{target_table}`
- Example: `fk_orders_users`

## Migration Notes

When adding new columns or tables:

1. Follow naming conventions exactly
2. Ensure Drizzle field names match DB column names
3. Run `pnpm validate:schema` before committing
4. Document any deviations with clear justification

## Validation

Run schema validation to check for naming convention violations:

```bash
pnpm validate:schema
```

This will detect:
- Mismatched field/column names
- Naming convention violations
- Schema drift issues
