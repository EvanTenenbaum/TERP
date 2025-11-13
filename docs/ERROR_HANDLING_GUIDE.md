# Global Error Handling Guide

**Implemented:** ST-002 - November 12, 2025  
**Status:** Active

## Overview

TERP now has comprehensive global error handling for all tRPC procedures. This system automatically:
- Catches and logs all errors
- Generates unique error IDs for tracking
- Categorizes errors by severity
- Formats errors consistently for clients
- Provides structured logging for debugging

## Architecture

### Error Handling Flow

```
Client Request
    ↓
tRPC Procedure
    ↓
Error Handling Middleware (catches errors)
    ↓
Error Normalization (convert to TRPCError)
    ↓
Error Logging (with full context)
    ↓
Error Formatting (sanitize for client)
    ↓
Client Response (with error ID)
```

### Components

1. **`errorHandling.ts`** - Core error handling logic
2. **`trpc.ts`** - Integration with tRPC procedures
3. **`logger.ts`** - Structured logging (Pino)

## Features

### 1. Automatic Error Catching

All tRPC procedures automatically catch and handle errors:

```typescript
// No manual try/catch needed!
export const myProcedure = protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input, ctx }) => {
    // If this throws, it's automatically caught and logged
    const data = await db.query.users.findFirst({
      where: eq(users.id, input.id),
    });
    
    if (!data) {
      // This error is automatically logged with context
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    
    return data;
  });
```

### 2. Unique Error IDs

Every error gets a unique ID for tracking:

```json
{
  "message": "User not found",
  "code": "NOT_FOUND",
  "errorId": "err_1699824567890_a1b2c3d",
  "timestamp": "2025-11-12T20:15:67.890Z"
}
```

Users can provide this error ID when reporting issues, making debugging much easier.

### 3. Error Severity Levels

Errors are automatically categorized:

| Severity | Error Codes | Log Level |
|----------|-------------|-----------|
| **CRITICAL** | `INTERNAL_SERVER_ERROR`, `TIMEOUT` | `error` |
| **HIGH** | `FORBIDDEN`, `UNAUTHORIZED` | `error` |
| **MEDIUM** | `NOT_FOUND`, `CONFLICT` | `warn` |
| **LOW** | `BAD_REQUEST`, `TOO_MANY_REQUESTS`, etc. | `info` |

### 4. Structured Error Logs

All errors are logged with full context:

```json
{
  "errorId": "err_1699824567890_a1b2c3d",
  "code": "NOT_FOUND",
  "message": "User not found",
  "severity": "medium",
  "userId": 123,
  "userRole": "admin",
  "procedure": "users.getById",
  "input": { "id": 456 },
  "stack": "Error: User not found\n    at ...",
  "timestamp": "2025-11-12T20:15:67.890Z"
}
```

### 5. Environment-Aware Responses

**Development:**
- Full error details
- Stack traces included
- Detailed debugging information

**Production:**
- Sanitized error messages
- No stack traces
- Error ID for tracking

## Usage

### Basic Error Throwing

```typescript
import { TRPCError } from "@trpc/server";

// Throw errors as usual - they're automatically handled
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid email format",
});
```

### Error Tracking Utilities

For errors that are caught and handled (not thrown to client):

```typescript
import { errorTracking } from "../_core/errorHandling";

try {
  await someRiskyOperation();
} catch (error) {
  // Track the error for monitoring
  const errorId = errorTracking.trackHandledError(error as Error, {
    operation: "someRiskyOperation",
    userId: ctx.user.id,
    additionalContext: { productId: 123 },
  });
  
  // Continue with fallback logic
  return fallbackData;
}
```

### Validation Error Tracking

```typescript
import { errorTracking } from "../_core/errorHandling";

if (!isValidEmail(input.email)) {
  errorTracking.trackValidationError(
    "email",
    input.email,
    "Invalid email format",
    { userId: ctx.user.id }
  );
  
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Invalid email format",
  });
}
```

### Business Logic Error Tracking

```typescript
import { errorTracking } from "../_core/errorHandling";

if (availableQty < requestedQty) {
  errorTracking.trackBusinessError(
    "orderCreation",
    "Insufficient inventory",
    {
      productId: input.productId,
      available: availableQty,
      requested: requestedQty,
    }
  );
  
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: `Insufficient inventory. Available: ${availableQty}, Requested: ${requestedQty}`,
  });
}
```

## Error Codes Reference

### Standard tRPC Error Codes

| Code | HTTP Status | When to Use |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input, validation errors |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `TIMEOUT` | 408 | Operation took too long |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `PRECONDITION_FAILED` | 412 | Business logic constraint violated |
| `PAYLOAD_TOO_LARGE` | 413 | Request too large |
| `METHOD_NOT_SUPPORTED` | 405 | Operation not allowed |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `CLIENT_CLOSED_REQUEST` | 499 | Client cancelled request |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

## Best Practices

### 1. Use Specific Error Codes

```typescript
// ❌ Bad - Generic error
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "Something went wrong",
});

// ✅ Good - Specific error
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Product not found",
});
```

### 2. Provide Helpful Error Messages

```typescript
// ❌ Bad - Vague message
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid input",
});

// ✅ Good - Specific message
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Email must be a valid email address",
});
```

### 3. Include Context in Tracked Errors

```typescript
// ❌ Bad - No context
errorTracking.trackHandledError(error, {
  operation: "updateProduct",
});

// ✅ Good - Rich context
errorTracking.trackHandledError(error, {
  operation: "updateProduct",
  userId: ctx.user.id,
  additionalContext: {
    productId: input.id,
    attemptedChanges: input,
  },
});
```

### 4. Don't Swallow Errors

```typescript
// ❌ Bad - Silent failure
try {
  await criticalOperation();
} catch (error) {
  // Error is lost!
  return null;
}

// ✅ Good - Track or throw
try {
  await criticalOperation();
} catch (error) {
  errorTracking.trackHandledError(error as Error, {
    operation: "criticalOperation",
    userId: ctx.user.id,
  });
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to complete operation",
  });
}
```

## Monitoring

### Log Locations

**Development:**
- Console output (pretty-printed with colors)
- Structured JSON logs

**Production:**
- Structured JSON logs to stdout
- Can be shipped to log aggregation service (e.g., Datadog, Loggly)

### Querying Logs

Find all errors for a specific user:
```bash
grep '"userId":123' logs.json | jq
```

Find all CRITICAL errors:
```bash
grep '"severity":"critical"' logs.json | jq
```

Find errors by ID:
```bash
grep '"errorId":"err_1699824567890_a1b2c3d"' logs.json | jq
```

## Future Enhancements

### Planned (ST-008)
- Sentry integration for error tracking
- Error rate alerts
- Error grouping and deduplication
- Error trend analysis

### Possible
- Automatic error recovery for transient failures
- Circuit breaker pattern for failing services
- Error budget tracking
- User-facing error dashboard

## Related Documentation

- `docs/CL-001-INVESTIGATION-REPORT.md` - SQL injection fix
- `docs/CL-003-SECURITY.md` - Admin endpoint security
- `server/_core/logger.ts` - Logging infrastructure
- `server/_core/errorHandling.ts` - Error handling implementation

## Testing

Run error handling tests:
```bash
pnpm test errorHandling.test.ts
```

All 10 tests should pass:
- ✅ Successful procedure execution
- ✅ TRPCError catching and logging
- ✅ Non-TRPCError conversion
- ✅ Unique error ID generation
- ✅ Error severity categorization
- ✅ User context inclusion
- ✅ Input logging
- ✅ Handled error tracking
- ✅ Validation error tracking
- ✅ Business error tracking
