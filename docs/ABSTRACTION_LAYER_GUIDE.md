# Abstraction Layer Guide

**Date:** November 13, 2025  
**Status:** ✅ Complete  
**Session:** Session-20251113-abstraction-layer-ca06a8fe

## Overview

This guide explains the new authentication and data access abstraction layers implemented in the TERP codebase. These layers provide consistent interfaces that enable future architectural improvements like Redis caching, offline-first capabilities, and MFA.

## Architecture

### Before

```typescript
// Direct dependencies on implementation details
import { simpleAuth } from "./simpleAuth";
import * as db from "../db";

// Tightly coupled to specific implementations
const user = await simpleAuth.authenticateRequest(req);
const data = await db.getUser(userId);
```

### After

```typescript
// Clean abstraction layer
import { authProvider } from "./authProvider";
import { dataProvider } from "./dataProvider";

// Implementation-agnostic
const result = await authProvider.authenticate(req);
const data = await dataProvider.getUser(userId);
```

## Benefits

The abstraction layers provide several key advantages:

**Flexibility:** Swap implementations without changing application code. For example, replace `simpleAuth` with Clerk or Auth0 by implementing the `AuthProvider` interface.

**Caching:** Add Redis caching transparently by wrapping the data provider. Application code remains unchanged while gaining performance benefits.

**Testability:** Mock providers easily in tests without complex setup. The clean interfaces make unit testing straightforward.

**Future Features:** Enable MFA, SSO, OAuth, offline-first, and read replicas without refactoring existing code.

**Consistency:** Standardized error handling and result types across the entire application.

## authProvider

### Interface

```typescript
interface AuthProvider {
  authenticate(req: Request): Promise<AuthResult>;
  createSession(user: User): string;
  verifySession(token: string): SessionPayload | null;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  getProvider(): string;
}
```

### Usage

#### Authentication

```typescript
import { authProvider } from "./authProvider";

// Authenticate a request
const result = await authProvider.authenticate(req);

if (result.success) {
  // User authenticated successfully
  console.log("User:", result.user.email);
} else {
  // Authentication failed
  console.error("Error:", result.error, result.message);
  // Possible errors: NO_TOKEN, INVALID_TOKEN, TOKEN_EXPIRED, USER_NOT_FOUND
}
```

#### Session Management

```typescript
// Create session token
const token = authProvider.createSession(user);

// Verify session token
const payload = authProvider.verifySession(token);
if (payload) {
  console.log("User ID:", payload.userId);
}
```

#### Password Handling

```typescript
// Hash password for storage
const hash = await authProvider.hashPassword("SecurePassword123!");

// Verify password
const isValid = await authProvider.verifyPassword("SecurePassword123!", hash);
```

### Error Codes

The `authenticate` method returns detailed error codes:

- `NO_TOKEN`: No authentication token provided in request
- `INVALID_TOKEN`: Token is malformed or has invalid signature
- `TOKEN_EXPIRED`: Token has passed its expiration time
- `USER_NOT_FOUND`: Token is valid but user no longer exists
- `UNKNOWN`: Unexpected error occurred

### Current Implementation

The current implementation uses `SimpleAuth` (JWT + bcrypt). To swap providers, create a class implementing `AuthProvider` and update the export:

```typescript
// Example: Clerk implementation
class ClerkAuthProvider implements AuthProvider {
  async authenticate(req: Request): Promise<AuthResult> {
    // Clerk-specific logic
  }
  // ... other methods
}

export const authProvider: AuthProvider = new ClerkAuthProvider();
```

## dataProvider

### Interface

```typescript
interface DataProvider {
  getUser(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  query: typeof db.query;
  getProvider(): string;
}
```

### Usage

#### Basic Operations

```typescript
import { dataProvider } from "./dataProvider";

// Get user by ID
const user = await dataProvider.getUser("user_123");

// Get user by email
const user = await dataProvider.getUserByEmail("test@example.com");
```

#### Complex Queries

```typescript
// Access Drizzle query builder for complex operations
const users = await dataProvider.query.users.findMany({
  where: (users, { eq }) => eq(users.role, "admin"),
  limit: 10,
});
```

### Current Implementation

The current implementation uses Drizzle ORM directly. Future implementations can add caching:

```typescript
class CachedDataProvider implements DataProvider {
  constructor(
    private cache: RedisClient,
    private fallback: DataProvider
  ) {}

  async getUser(userId: string): Promise<User | null> {
    // Try cache first
    const cached = await this.cache.get(`user:${userId}`);
    if (cached) return JSON.parse(cached);

    // Fall back to database
    const user = await this.fallback.getUser(userId);
    if (user) {
      await this.cache.set(`user:${userId}`, JSON.stringify(user), "EX", 300);
    }
    return user;
  }

  // ... other methods
}

// Enable caching by swapping provider
export const dataProvider = new CachedDataProvider(
  redisClient,
  new DrizzleDataProvider()
);
```

## Migration Guide

### For New Code

Always use the abstraction layers in new code:

```typescript
// ✅ Good: Use abstraction layer
import { authProvider, dataProvider } from "./_core";

const result = await authProvider.authenticate(req);
const user = await dataProvider.getUser(userId);

// ❌ Bad: Direct implementation access
import { simpleAuth } from "./_core/simpleAuth";
import * as db from "./db";

const user = await simpleAuth.authenticateRequest(req);
const data = await db.getUser(userId);
```

### For Existing Code

Existing code can be migrated gradually. The abstraction layers are designed to be drop-in replacements:

#### Authentication Migration

```typescript
// Before
import { simpleAuth } from "./simpleAuth";

try {
  const user = await simpleAuth.authenticateRequest(req);
  // Handle success
} catch (error) {
  // Handle error
}

// After
import { authProvider } from "./authProvider";

const result = await authProvider.authenticate(req);
if (result.success) {
  const user = result.user;
  // Handle success
} else {
  // Handle error: result.error, result.message
}
```

#### Data Access Migration

```typescript
// Before
import * as db from "../db";

const user = await db.getUser(userId);

// After
import { dataProvider } from "./_core/dataProvider";

const user = await dataProvider.getUser(userId);
```

## Testing

### Mocking authProvider

```typescript
import { vi } from "vitest";
import { createAuthProvider } from "./_core/authProvider";

// Create mock provider
const mockAuthProvider = createAuthProvider({
  authenticate: vi.fn().mockResolvedValue({
    success: true,
    user: mockUser,
  }),
  createSession: vi.fn().mockReturnValue("mock-token"),
  verifySession: vi
    .fn()
    .mockReturnValue({ userId: "user_123", email: "test@example.com" }),
  hashPassword: vi.fn().mockResolvedValue("mock-hash"),
  verifyPassword: vi.fn().mockResolvedValue(true),
  getProvider: vi.fn().mockReturnValue("mock"),
});

// Use in tests
const result = await mockAuthProvider.authenticate(mockReq);
```

### Mocking dataProvider

```typescript
import { vi } from "vitest";
import { createDataProvider } from "./_core/dataProvider";

// Create mock provider
const mockDataProvider = createDataProvider({
  getUser: vi.fn().mockResolvedValue(mockUser),
  getUserByEmail: vi.fn().mockResolvedValue(mockUser),
  query: mockQuery,
  getProvider: vi.fn().mockReturnValue("mock"),
});

// Use in tests
const user = await mockDataProvider.getUser("user_123");
```

## Future Enhancements

### Planned Features

**Redis Caching:** Add a `CachedDataProvider` that wraps the Drizzle provider with Redis caching for frequently accessed data.

**Offline Support:** Implement an `OfflineDataProvider` using IndexedDB for offline-first capabilities with background sync.

**MFA:** Extend `AuthProvider` with MFA methods like `enableMFA()`, `verifyMFA()`, and `generateBackupCodes()`.

**Read Replicas:** Create a `ReadReplicaDataProvider` that routes read operations to replicas and writes to the primary database.

**Rate Limiting:** Add rate limiting to authentication attempts in the auth provider.

**Audit Logging:** Wrap providers with audit logging to track all data access and authentication events.

### Extension Points

The abstraction layers are designed for extension. Key extension points include:

- Implement `AuthProvider` for new authentication systems
- Implement `DataProvider` for new data sources or caching strategies
- Wrap existing providers with decorators for cross-cutting concerns (logging, metrics, caching)
- Use `createAuthProvider()` and `createDataProvider()` for runtime provider swapping

## Files

**Implementation:**

- `server/_core/authProvider.ts` - Authentication abstraction layer
- `server/_core/dataProvider.ts` - Data access abstraction layer

**Tests:**

- `server/_core/authProvider.test.ts` - 16 tests (100% passing)
- `server/_core/dataProvider.test.ts` - 6 tests (100% passing)

**Documentation:**

- `docs/ABSTRACTION_LAYER_GUIDE.md` - This guide
- `docs/sessions/active/Session-20251113-abstraction-layer-ca06a8fe.md` - Session notes

## Support

For questions or issues with the abstraction layers:

1. Review this guide and the inline JSDoc comments in the source files
2. Check the test files for usage examples
3. Consult the session notes for implementation details
4. Contact the development team for assistance

---

**Last Updated:** November 13, 2025  
**Maintainer:** TERP Development Team  
**Status:** Production Ready
