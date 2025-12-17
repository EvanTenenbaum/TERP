# TERP Naming Conventions

**Version**: 1.0  
**Last Updated**: 2025-12-16  
**Status**: MANDATORY

This document defines the naming conventions for the TERP codebase.

---

## Database Naming Conventions

### Tables

- **Format**: `snake_case`, plural
- **Examples**: `clients`, `batch_items`, `purchase_orders`

```sql
-- ✅ CORRECT
CREATE TABLE batch_items (...)
CREATE TABLE purchase_orders (...)
CREATE TABLE client_transactions (...)

-- ❌ WRONG
CREATE TABLE BatchItems (...)
CREATE TABLE purchaseOrders (...)
CREATE TABLE ClientTransaction (...)
```

### Columns

- **Format**: `snake_case` (preferred) or `camelCase` (legacy)
- **Note**: New columns should use `snake_case`
- **Examples**: `created_at`, `customer_id`, `total_amount`

```sql
-- ✅ CORRECT (new columns)
created_at TIMESTAMP
customer_id INT
total_amount DECIMAL(15, 2)

-- ⚠️ LEGACY (existing columns - do not change without migration)
customerId INT
createdBy INT
```

### Foreign Keys

- **Format**: `{referenced_table_singular}_id`
- **Examples**: `client_id`, `batch_id`, `user_id`

```sql
-- ✅ CORRECT
client_id INT REFERENCES clients(id)
batch_id INT REFERENCES batches(id)
user_id INT REFERENCES users(id)

-- ❌ WRONG
clientID INT
batchRef INT
fk_user INT
```

### Indexes

- **Format**: `idx_{table}_{column(s)}`
- **Examples**: `idx_invoices_customer_id`, `idx_batches_product_id`

```sql
-- ✅ CORRECT
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_batches_product_id ON batches(product_id);

-- ❌ WRONG
CREATE INDEX invoices_idx ON invoices(customer_id);
CREATE INDEX IX_Batches_ProductId ON batches(product_id);
```

### Constraints

- **Primary Key**: `pk_{table}`
- **Foreign Key**: `fk_{table}_{referenced_table}`
- **Unique**: `uq_{table}_{column(s)}`
- **Check**: `ck_{table}_{description}`

---

## TypeScript Naming Conventions

### Variables and Functions

- **Format**: `camelCase`
- **Examples**: `userId`, `calculateTotal`, `getClientById`

```typescript
// ✅ CORRECT
const userId = 123;
const totalAmount = calculateTotal(items);
function getClientById(id: number): Promise<Client> { ... }

// ❌ WRONG
const user_id = 123;
const TotalAmount = calculateTotal(items);
function GetClientById(id: number): Promise<Client> { ... }
```

### Types and Interfaces

- **Format**: `PascalCase`
- **Examples**: `Client`, `BatchItem`, `CreateOrderInput`

```typescript
// ✅ CORRECT
interface Client { ... }
type BatchItem = { ... }
interface CreateOrderInput { ... }

// ❌ WRONG
interface client { ... }
type batch_item = { ... }
interface createOrderInput { ... }
```

### Constants

- **Format**: `SCREAMING_SNAKE_CASE` for true constants
- **Format**: `camelCase` for configuration objects

```typescript
// ✅ CORRECT
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 50;
const API_BASE_URL = 'https://api.example.com';

const defaultConfig = {
  pageSize: 50,
  timeout: 5000,
};

// ❌ WRONG
const maxRetryCount = 3;  // Should be SCREAMING_SNAKE_CASE
const DEFAULT_CONFIG = { ... };  // Objects should be camelCase
```

### Enums

- **Format**: `PascalCase` for enum name
- **Format**: `SCREAMING_SNAKE_CASE` for enum values

```typescript
// ✅ CORRECT
enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
}

// ❌ WRONG
enum orderStatus {
  pending = "pending",
  Processing = "Processing",
}
```

---

## Drizzle Schema Conventions

### Table Definitions

- **Table name**: `snake_case` in database, `camelCase` in TypeScript
- **Column name**: Match database convention

```typescript
// ✅ CORRECT
export const clientTransactions = mysqlTable("client_transactions", {
  id: serial("id").primaryKey(),
  clientId: int("client_id").references(() => clients.id),
  transactionDate: timestamp("transaction_date"),
  amount: decimal("amount", { precision: 15, scale: 2 }),
});

// ❌ WRONG
export const ClientTransactions = mysqlTable("ClientTransactions", {
  ID: serial("ID").primaryKey(),
  ClientID: int("ClientID"),
});
```

### Relations

- **Format**: `camelCase`, descriptive name

```typescript
// ✅ CORRECT
export const clientsRelations = relations(clients, ({ many }) => ({
  invoices: many(invoices),
  transactions: many(clientTransactions),
}));

// ❌ WRONG
export const clients_relations = relations(clients, ({ many }) => ({
  Invoices: many(invoices),
}));
```

---

## File Naming Conventions

### TypeScript Files

- **Components**: `PascalCase.tsx` (e.g., `ClientCard.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatCurrency.ts`)
- **Tests**: `{filename}.test.ts` (e.g., `formatCurrency.test.ts`)
- **Types**: `types.ts` or `{feature}.types.ts`

### Directories

- **Format**: `kebab-case` or `camelCase`
- **Examples**: `client-portal/`, `components/`, `utils/`

---

## API Naming Conventions

### tRPC Routers

- **Router name**: `camelCase` + `Router` suffix
- **Procedure name**: `camelCase`, verb-first

```typescript
// ✅ CORRECT
export const clientsRouter = router({
  getById: protectedProcedure.input(...).query(...),
  create: protectedProcedure.input(...).mutation(...),
  updateBalance: protectedProcedure.input(...).mutation(...),
});

// ❌ WRONG
export const ClientsRouter = router({
  GetById: protectedProcedure.input(...).query(...),
  Create_Client: protectedProcedure.input(...).mutation(...),
});
```

### Input/Output Schemas

- **Format**: `{action}{Entity}Input` or `{action}{Entity}Output`

```typescript
// ✅ CORRECT
const createClientInput = z.object({ ... });
const updateOrderInput = z.object({ ... });
const getInvoiceOutput = z.object({ ... });

// ❌ WRONG
const ClientCreateInput = z.object({ ... });
const order_update_input = z.object({ ... });
```

---

## Migration from Legacy Conventions

### Current State

Some existing code uses `camelCase` for database columns (e.g., `customerId`, `createdBy`). This is legacy and should not be changed without a proper migration plan.

### New Code

All new database columns should use `snake_case`:

```typescript
// New columns
created_at: timestamp('created_at'),
updated_at: timestamp('updated_at'),
client_id: int('client_id'),
```

### Migration Plan

1. New columns: Always use `snake_case`
2. Existing columns: Keep as-is until explicit migration
3. Dual-write period: When renaming, support both names temporarily
4. Full migration: Remove old column after verification

---

## Enforcement

### Automated Checks

1. **ESLint**: Enforces TypeScript naming conventions
2. **Schema Validation**: Checks for naming inconsistencies
3. **PR Review**: Manual verification of naming conventions

### Pre-commit Hooks

The pre-commit hook will warn about naming convention violations in new code.

---

## Quick Reference

| Context                  | Convention            | Example                  |
| ------------------------ | --------------------- | ------------------------ |
| Database table           | snake_case, plural    | `client_transactions`    |
| Database column (new)    | snake_case            | `created_at`             |
| Database column (legacy) | camelCase             | `customerId`             |
| Foreign key              | {table}\_id           | `client_id`              |
| Index                    | idx*{table}*{column}  | `idx_invoices_client_id` |
| TypeScript variable      | camelCase             | `totalAmount`            |
| TypeScript type          | PascalCase            | `ClientTransaction`      |
| TypeScript constant      | SCREAMING_SNAKE_CASE  | `MAX_RETRY_COUNT`        |
| React component          | PascalCase            | `ClientCard.tsx`         |
| tRPC router              | camelCase + Router    | `clientsRouter`          |
| tRPC procedure           | camelCase, verb-first | `getById`, `create`      |

---

**Follow these conventions consistently to maintain code quality and readability.**
