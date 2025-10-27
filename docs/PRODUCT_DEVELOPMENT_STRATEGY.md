# TERP Product Development Strategy
## Aligning Current Development with Future Vision

**Version:** 1.0  
**Date:** October 27, 2025  
**Purpose:** Ensure all development work aligns with the secure home office architecture without creating rework

---

## Executive Summary

We have a comprehensive **8-week, 160-hour specification** for transforming TERP into a secure home office ERP with air-gapped architecture, VPN access, offline-first PWA, and enterprise-grade security.

**The Challenge:** How do we continue current development without creating work that will need to be undone or redone when implementing this vision?

**The Solution:** Implement a **compatibility-first development protocol** that ensures all current work is either:
1. **Forward-compatible** with the future architecture
2. **Isolated** in a way that can be easily replaced
3. **Abstracted** behind interfaces that won't change

---

## Part 1: Architectural Compatibility Principles

### Principle 1: Separation of Concerns

**Current Risk:** Mixing authentication, business logic, and data access makes future refactoring painful.

**Solution:** Enforce strict layering:

```
┌─────────────────────────────────────┐
│  Presentation Layer (React)         │  ← Can change UI without affecting logic
├─────────────────────────────────────┤
│  API Layer (tRPC Routers)           │  ← Can add security without changing endpoints
├─────────────────────────────────────┤
│  Business Logic Layer (*Db.ts)      │  ← Can optimize without changing API
├─────────────────────────────────────┤
│  Data Access Layer (Drizzle ORM)    │  ← Can add caching without changing logic
└─────────────────────────────────────┘
```

**Implementation Rule:**
- **NEVER** put authentication logic in business logic functions
- **NEVER** put database queries in router handlers
- **ALWAYS** use the existing `*Db.ts` pattern for data access

**Example (GOOD):**
```typescript
// Router (API layer)
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      return await ordersDb.createOrder(input, ctx.user.organizationId);
    }),
});

// Business logic (ordersDb.ts)
export async function createOrder(input: CreateOrderInput, orgId: number) {
  const db = await getDb();
  return await db.transaction(async (tx) => {
    // Business logic here
  });
}
```

**Example (BAD - Will need refactoring):**
```typescript
// DON'T DO THIS - Mixes concerns
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Direct database access in router - BAD!
      const order = await db.insert(orders).values({...});
      return order;
    }),
});
```

---

### Principle 2: Authentication Abstraction

**Future Requirement:** Multi-factor authentication (VPN + device certificate + biometric)

**Current State:** Simple Clerk authentication

**Solution:** Abstract authentication behind interfaces that won't change

**File to Create:** `server/_core/authProvider.ts`

```typescript
/**
 * Authentication provider interface
 * Future implementations can add MFA without changing callers
 */
export interface AuthProvider {
  validateSession(req: Request): Promise<User | null>;
  requireAuth(req: Request): Promise<User>;
  requireAdmin(req: Request): Promise<User>;
}

/**
 * Current implementation (Clerk)
 * Can be replaced with MFA implementation without changing API
 */
export class ClerkAuthProvider implements AuthProvider {
  async validateSession(req: Request): Promise<User | null> {
    // Current Clerk logic
  }
  
  async requireAuth(req: Request): Promise<User> {
    const user = await this.validateSession(req);
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    return user;
  }
  
  async requireAdmin(req: Request): Promise<User> {
    const user = await this.requireAuth(req);
    if (user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN" });
    return user;
  }
}

// Singleton instance
export const authProvider: AuthProvider = new ClerkAuthProvider();
```

**Implementation Rule:**
- **ALWAYS** use `authProvider` interface, never call Clerk directly
- **NEVER** hardcode authentication logic in routers
- **PREPARE** for future MFA by keeping auth logic isolated

---

### Principle 3: Data Access Abstraction

**Future Requirement:** Redis caching layer, offline sync, optimistic updates

**Current State:** Direct MySQL queries via Drizzle

**Solution:** Abstract data access behind repository pattern

**File to Create:** `server/_core/dataProvider.ts`

```typescript
/**
 * Data provider interface
 * Future implementations can add caching/offline without changing callers
 */
export interface DataProvider {
  query<T>(fn: (db: Database) => Promise<T>): Promise<T>;
  mutate<T>(fn: (db: Database) => Promise<T>): Promise<T>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

/**
 * Current implementation (Direct MySQL)
 * Can be replaced with cached/offline implementation
 */
export class MySQLDataProvider implements DataProvider {
  async query<T>(fn: (db: Database) => Promise<T>): Promise<T> {
    const db = await getDb();
    return await fn(db);
  }
  
  async mutate<T>(fn: (db: Database) => Promise<T>): Promise<T> {
    const db = await getDb();
    // Future: Add cache invalidation here
    return await fn(db);
  }
  
  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const db = await getDb();
    return await db.transaction(fn);
  }
}

// Singleton instance
export const dataProvider: DataProvider = new MySQLDataProvider();
```

**Implementation Rule:**
- **ALWAYS** use `dataProvider` interface in `*Db.ts` files
- **NEVER** call `getDb()` directly in new code
- **PREPARE** for caching by isolating database access

---

## Part 2: Development Protocols for Manus Agents

### Protocol 1: File Organization Standards

**Rule:** All new files MUST follow this structure to be compatible with future architecture

```
server/
├── _core/                    # Core infrastructure (DON'T TOUCH unless necessary)
│   ├── authProvider.ts       # Authentication abstraction
│   ├── dataProvider.ts       # Data access abstraction
│   ├── errors.ts             # Error handling
│   ├── logger.ts             # Logging
│   └── monitoring.ts         # Monitoring
├── auth/                     # Authentication logic (FUTURE: MFA goes here)
│   └── (reserved for future)
├── routers/                  # API endpoints (THIN - just validation & delegation)
│   ├── orders.ts
│   ├── inventory.ts
│   └── ...
├── *Db.ts                    # Business logic (THICK - all logic here)
│   ├── ordersDb.ts
│   ├── inventoryDb.ts
│   └── ...
└── utils/                    # Shared utilities
    └── ...
```

**Implementation Rule:**
- **Routers** should be THIN (< 50 lines per procedure)
- **Business logic** should be in `*Db.ts` files
- **Core infrastructure** should be abstracted and reusable

---

### Protocol 2: Database Schema Evolution

**Rule:** All schema changes MUST be additive, never breaking

**Future Requirements:**
- Device certificates table
- Biometric authenticators table
- Offline sync metadata
- Audit logs
- Redis cache keys

**Implementation Rule:**
- **NEVER** rename existing columns (add new ones instead)
- **NEVER** delete existing tables (mark as deprecated instead)
- **ALWAYS** use migrations for schema changes
- **PREPARE** for future tables by keeping schema organized

**Example (GOOD - Additive):**
```typescript
// Adding new field for future MFA
export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  // ... existing fields ...
  
  // NEW: Prepare for MFA (nullable for backward compatibility)
  mfaEnabled: boolean('mfa_enabled').default(false),
  deviceCertificateRequired: boolean('device_certificate_required').default(false),
});
```

**Example (BAD - Breaking):**
```typescript
// DON'T DO THIS - Breaks existing code
export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  emailAddress: varchar('email_address', { length: 255 }), // RENAMED - BREAKS CODE!
});
```

---

### Protocol 3: API Design for Future Compatibility

**Rule:** All API endpoints MUST be designed to support offline-first and caching

**Future Requirements:**
- Optimistic updates
- Conflict resolution
- Cache invalidation
- Offline queue

**Implementation Rule:**
- **ALWAYS** return full objects (not just IDs) for optimistic updates
- **ALWAYS** include timestamps for conflict resolution
- **ALWAYS** return affected records for cache invalidation
- **NEVER** design APIs that require multiple round trips

**Example (GOOD - Offline-friendly):**
```typescript
// Returns full order object for optimistic update
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const order = await ordersDb.createOrder(input, ctx.user.organizationId);
      return {
        order,  // Full object for optimistic update
        affectedRecords: {  // For cache invalidation
          orders: [order.id],
          inventory: order.items.map(i => i.inventoryId),
        },
        timestamp: new Date(),  // For conflict resolution
      };
    }),
});
```

**Example (BAD - Not offline-friendly):**
```typescript
// DON'T DO THIS - Just returns ID, requires another query
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const orderId = await ordersDb.createOrder(input);
      return { orderId };  // BAD - client needs to fetch full object
    }),
});
```

---

## Part 3: "The Bible" Integration

### Add to DEVELOPMENT_PROTOCOLS.md

**New Section: Future Architecture Compatibility**

```markdown
## Future Architecture Compatibility Protocol

### Context
TERP is evolving toward a secure home office architecture with:
- Air-gapped core server
- VPN-only access
- Multi-factor authentication (VPN + device certificate + biometric)
- Offline-first PWA
- Redis caching
- Comprehensive monitoring

### Protocol
All development work MUST be compatible with this future architecture.

### Rules

1. **Authentication Abstraction**
   - Use `authProvider` interface, never call Clerk directly
   - Keep authentication logic in `server/auth/` directory
   - Prepare for MFA by isolating auth logic

2. **Data Access Abstraction**
   - Use `dataProvider` interface, never call `getDb()` directly
   - Keep business logic in `*Db.ts` files
   - Prepare for caching by isolating database access

3. **API Design**
   - Return full objects for optimistic updates
   - Include timestamps for conflict resolution
   - Return affected records for cache invalidation
   - Design for offline-first from day one

4. **Schema Evolution**
   - Only additive changes (no renames, no deletions)
   - Use migrations for all schema changes
   - Keep schema organized for future tables

5. **File Organization**
   - Routers: THIN (< 50 lines per procedure)
   - Business logic: In `*Db.ts` files
   - Core infrastructure: Abstracted and reusable

### Verification Checklist

Before pushing any code, verify:
- [ ] Authentication uses `authProvider` interface
- [ ] Data access uses `dataProvider` interface
- [ ] API returns full objects (not just IDs)
- [ ] Schema changes are additive only
- [ ] Business logic is in `*Db.ts` files
- [ ] Routers are thin (< 50 lines per procedure)
```

---

## Part 4: Phased Implementation Strategy

### Phase 0: Foundation (NOW - Week 1)

**Goal:** Set up abstractions without breaking existing code

**Tasks:**
1. ✅ Create `server/_core/authProvider.ts`
2. ✅ Create `server/_core/dataProvider.ts`
3. ✅ Update Bible with compatibility protocols
4. ✅ Create migration guide for existing code
5. ✅ Test that abstractions work with current code

**Deliverable:** Abstraction layer that works with current Clerk auth and MySQL

---

### Phase 1: Security Foundation (Week 2-3)

**Goal:** Add MFA infrastructure without breaking current auth

**Tasks:**
1. Create `server/auth/` directory structure
2. Implement device certificate validation (stub)
3. Implement biometric auth (stub)
4. Implement VPN validation (stub)
5. Create MFA orchestration layer
6. Add database tables for certificates/authenticators

**Deliverable:** MFA infrastructure that can be enabled per-user (opt-in)

**Compatibility:** Current Clerk auth still works, MFA is optional

---

### Phase 2: Offline Foundation (Week 4-5)

**Goal:** Add PWA and offline support without breaking online mode

**Tasks:**
1. Create service worker
2. Implement IndexedDB caching
3. Add offline queue for mutations
4. Implement optimistic UI updates
5. Add conflict resolution

**Deliverable:** PWA that works offline, but online mode unchanged

**Compatibility:** App works exactly the same online, offline is bonus

---

### Phase 3: Performance (Week 6)

**Goal:** Add Redis caching without changing API behavior

**Tasks:**
1. Set up Redis
2. Implement cache layer in `dataProvider`
3. Add cache invalidation logic
4. Implement predictive prefetching

**Deliverable:** Faster app with caching, but behavior unchanged

**Compatibility:** API behavior identical, just faster

---

### Phase 4: Monitoring (Week 7)

**Goal:** Add observability without affecting functionality

**Tasks:**
1. Set up Prometheus
2. Add metrics middleware
3. Create Grafana dashboards
4. Implement health checks
5. Set up alerting

**Deliverable:** Full observability stack

**Compatibility:** No impact on functionality, just visibility

---

### Phase 5: Deployment (Week 8)

**Goal:** Dockerize and deploy to home office

**Tasks:**
1. Create Dockerfiles
2. Create Docker Compose
3. Set up WireGuard VPN
4. Deploy to home server
5. Test end-to-end

**Deliverable:** Production deployment

**Compatibility:** Same codebase, different deployment target

---

## Part 5: Manus Agent Context Document

### Create: `docs/MANUS_AGENT_CONTEXT.md`

```markdown
# Context for Manus AI Agents

## Current State
- React 19 + tRPC + MySQL ERP system
- Basic Clerk authentication
- Direct database access via Drizzle ORM
- Deployed to DigitalOcean

## Future Vision
- Secure home office deployment
- Air-gapped core server
- VPN-only access (WireGuard)
- Multi-factor authentication (VPN + device cert + biometric)
- Offline-first PWA
- Redis caching
- Comprehensive monitoring

## Your Mission
Build features that work NOW but are compatible with the FUTURE architecture.

## Critical Rules

### 1. Use Abstractions
- **Auth:** Use `authProvider` interface (not Clerk directly)
- **Data:** Use `dataProvider` interface (not `getDb()` directly)

### 2. Design for Offline
- Return full objects (not just IDs)
- Include timestamps for conflict resolution
- Return affected records for cache invalidation

### 3. Keep Code Organized
- Routers: THIN (< 50 lines per procedure)
- Business logic: In `*Db.ts` files
- Core infrastructure: In `server/_core/`

### 4. Schema Evolution
- Only additive changes (no renames, no deletions)
- Use migrations for all changes

### 5. Before Pushing
- [ ] Uses `authProvider` interface
- [ ] Uses `dataProvider` interface
- [ ] Returns full objects (not IDs)
- [ ] Schema changes are additive
- [ ] Business logic in `*Db.ts`
- [ ] Router is thin (< 50 lines)

## Questions?
Read `docs/PRODUCT_DEVELOPMENT_STRATEGY.md` for full details.
```

---

## Part 6: Migration Guide for Existing Code

### Gradual Migration Strategy

**Rule:** Don't refactor everything at once, migrate gradually

**Priority 1: New Code (NOW)**
- All new code MUST use abstractions
- All new APIs MUST be offline-friendly
- All new schemas MUST be additive

**Priority 2: Critical Paths (Week 1-2)**
- Migrate authentication in routers to `authProvider`
- Migrate database access in `*Db.ts` to `dataProvider`
- Update critical APIs to return full objects

**Priority 3: Everything Else (Week 3-4)**
- Migrate remaining routers
- Migrate remaining business logic
- Update all APIs

**Priority 4: Cleanup (Week 5+)**
- Remove direct Clerk calls
- Remove direct `getDb()` calls
- Consolidate patterns

---

## Part 7: Success Metrics

### How to Know We're Doing It Right

**Metric 1: Abstraction Usage**
- ✅ 100% of new code uses `authProvider`
- ✅ 100% of new code uses `dataProvider`
- ✅ 0% direct Clerk calls in new code
- ✅ 0% direct `getDb()` calls in new code

**Metric 2: API Design**
- ✅ 100% of new mutations return full objects
- ✅ 100% of new mutations include timestamps
- ✅ 100% of new mutations return affected records

**Metric 3: Code Organization**
- ✅ Average router procedure < 50 lines
- ✅ All business logic in `*Db.ts` files
- ✅ All core infrastructure in `server/_core/`

**Metric 4: Schema Evolution**
- ✅ 0 breaking schema changes
- ✅ 100% of changes use migrations
- ✅ All new fields are nullable or have defaults

---

## Conclusion

**The Strategy:**
1. **Abstractions First:** Set up `authProvider` and `dataProvider` NOW
2. **Design for Future:** All new code follows offline-first patterns
3. **Gradual Migration:** Move existing code to abstractions over time
4. **Phase by Phase:** Implement future architecture in 8-week phases
5. **No Rework:** Every line of code written today works in the future architecture

**The Promise:**
If we follow this strategy, we can:
- ✅ Continue building features NOW
- ✅ Not waste any development time
- ✅ Smoothly transition to future architecture
- ✅ Never have to undo or redo work

**The Key:**
Every Manus agent MUST read:
1. `docs/PRODUCT_DEVELOPMENT_STRATEGY.md` (this document)
2. `docs/MANUS_AGENT_CONTEXT.md` (quick reference)
3. `docs/DEVELOPMENT_PROTOCOLS.md` (The Bible)

**Next Steps:**
1. Create abstraction files (`authProvider.ts`, `dataProvider.ts`)
2. Update The Bible with compatibility protocols
3. Create Manus agent context document
4. Start Phase 0 implementation

---

**This strategy ensures zero wasted effort!** 🎯

