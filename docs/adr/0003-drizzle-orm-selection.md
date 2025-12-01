# ADR-0003: Drizzle ORM Selection

**Status:** Accepted
**Date:** 2025-12-01
**Author:** Original Architecture
**Deciders:** Project Foundation

## Context

TERP requires a database abstraction layer for MySQL. The application needs:
- Type-safe database queries
- Migration management
- Relational data modeling
- Good performance for complex queries
- Developer-friendly API

Options evaluated:
1. Prisma
2. TypeORM
3. Drizzle ORM
4. Raw SQL with mysql2

## Decision

We use **Drizzle ORM** as the database abstraction layer.

Key implementation details:
- Drizzle ORM v0.44.x with MySQL adapter
- Schema defined in TypeScript (`drizzle/schema.ts`)
- drizzle-kit for migrations
- mysql2 as the underlying driver

## Consequences

### Positive

- **SQL-first approach**: Queries map closely to SQL, easy to understand
- **Excellent TypeScript support**: Full type inference from schema
- **Lightweight**: Minimal runtime overhead compared to Prisma
- **Explicit migrations**: SQL migrations checked into git
- **No query engine**: No binary dependencies (unlike Prisma)
- **Flexible querying**: Can drop to raw SQL when needed
- **Relations API**: Clean syntax for joined queries

### Negative

- **Less mature**: Smaller ecosystem than Prisma/TypeORM
- **Manual migrations**: Must write migration SQL (drizzle-kit generates, but review needed)
- **Learning curve**: Different API from more popular ORMs
- **Limited auto-relations**: Must define relations explicitly

### Neutral

- Schema and types in same file (schema.ts exports types)
- Connection pooling via mysql2 pool
- Can use raw SQL for complex queries

## Alternatives Considered

### Alternative 1: Prisma

Most popular TypeScript ORM with excellent DX.

**Rejected because:**
- Requires Prisma engine binary (deployment complexity)
- Schema in separate .prisma file, not TypeScript
- Generated client adds build step
- Heavier runtime for serverless deployments

### Alternative 2: TypeORM

Mature ORM with decorator-based entities.

**Rejected because:**
- Decorator syntax verbose
- Type safety not as strong as Drizzle
- More magic, less explicit
- Performance concerns with complex relations

### Alternative 3: Raw SQL with mysql2

Direct SQL queries without abstraction.

**Rejected because:**
- No type safety
- Manual result type mapping
- SQL injection risk without care
- More boilerplate for common operations

## Implementation Notes

### Schema Definition

```typescript
// drizzle/schema.ts
export const orders = mysqlTable('orders', {
  id: int('id').primaryKey().autoincrement(),
  clientId: int('client_id').notNull().references(() => clients.id),
  status: varchar('status', { length: 50 }).notNull(),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type inference
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
```

### Query Patterns

```typescript
// Simple query
const order = await db.query.orders.findFirst({
  where: eq(orders.id, orderId),
});

// With relations
const orderWithItems = await db.query.orders.findFirst({
  where: eq(orders.id, orderId),
  with: {
    lineItems: true,
    client: true,
  },
});

// Complex query with builder
const results = await db
  .select({
    clientName: clients.name,
    totalOrders: count(orders.id),
  })
  .from(orders)
  .leftJoin(clients, eq(orders.clientId, clients.id))
  .groupBy(clients.id);
```

### Migration Workflow

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate

# Push schema directly (dev only)
pnpm db:push
```

## References

- Drizzle Documentation: https://orm.drizzle.team/docs
- Schema file: `drizzle/schema.ts`
- Config: `drizzle.config.ts`
- Database connection: `server/db.ts`
