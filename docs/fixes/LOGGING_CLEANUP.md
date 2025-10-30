# Console Logging Cleanup - Implementation Guide

**Priority:** 🟡 HIGH
**Effort:** 2 days
**Impact:** Performance, debugging, production operations

---

## Problem Overview

**572 console.log/error/warn statements** across 77 files instead of structured logging.

### Why This Matters

1. **Performance:** console.log blocks the event loop
2. **Production Ops:** Can't search/filter logs effectively
3. **Debugging:** No context, timestamps, or correlation IDs
4. **Security:** May accidentally log sensitive data

### Current State

✅ **Pino structured logger configured** (`server/_core/logger.ts`)
✅ **Console replacement active** (`replaceConsole()`)
❌ **Direct console.* calls remain** (572 instances)

---

## Existing Logger Setup

### Backend Logger (Already Configured)

**File:** `server/_core/logger.ts`

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});

// Console replacement
export function replaceConsole() {
  console.log = (...args: any[]) => logger.info(args);
  console.error = (...args: any[]) => logger.error(args);
  console.warn = (...args: any[]) => logger.warn(args);
}
```

**Status:** ✅ Configured, ✅ Enabled in production

---

## Implementation Strategy

### Phase 1: Server-Side Cleanup (1 day)

#### Pattern Analysis

**Current Patterns Found:**

```typescript
// Pattern 1: Simple logging
console.log('User logged in');
console.error('Error creating order:', error);

// Pattern 2: Object logging
console.log('Batch data:', batch);
console.error('Failed to process:', { orderId, error });

// Pattern 3: Debug logging
console.log('[DEBUG] Entering function');
console.log('[MATCHING] Confidence score:', score);
```

---

#### Conversion Patterns

**1. Simple Messages**

```typescript
// ❌ BEFORE
console.log('Processing order');
console.error('Order creation failed');
console.warn('Low stock detected');

// ✅ AFTER
import { logger } from '../_core/logger';

logger.info('Processing order');
logger.error('Order creation failed');
logger.warn('Low stock detected');
```

---

**2. With Variables**

```typescript
// ❌ BEFORE
console.log('Creating order for client:', clientId);
console.error('Failed to create order:', error);

// ✅ AFTER - Add structured context
logger.info({ clientId }, 'Creating order for client');
logger.error({ error, clientId }, 'Failed to create order');
```

---

**3. Object Dumps**

```typescript
// ❌ BEFORE
console.log('Match result:', matchResult);
console.log({ orderId, total, items });

// ✅ AFTER - Structured data first
logger.info({ matchResult }, 'Match result calculated');
logger.info({ orderId, total, itemCount: items.length }, 'Order summary');
```

---

**4. Debug Statements**

```typescript
// ❌ BEFORE
console.log('[DEBUG] Entering calculateCOGS');
console.log('[MATCHING] Confidence:', confidence);

// ✅ AFTER - Use debug level
logger.debug({ function: 'calculateCOGS' }, 'Entering function');
logger.debug({ confidence }, 'Match confidence calculated');
```

---

**5. Error Objects**

```typescript
// ❌ BEFORE
console.error('Error:', error);
console.error('Failed:', error.message);

// ✅ AFTER - Structured error logging
logger.error({
  error: {
    message: error.message,
    stack: error.stack,
    code: error.code,
  }
}, 'Operation failed');

// Or use error directly (Pino handles it)
logger.error({ err: error }, 'Operation failed');
```

---

**6. Try-Catch Blocks**

```typescript
// ❌ BEFORE
try {
  await createOrder(data);
} catch (error) {
  console.error('Failed to create order:', error);
  throw error;
}

// ✅ AFTER
try {
  await createOrder(data);
} catch (error) {
  logger.error({
    err: error,
    orderId: data.id,
    clientId: data.clientId,
  }, 'Failed to create order');
  throw error;
}
```

---

### Phase 2: Client-Side Logging (4 hours)

#### Current Issue
Client uses console.* directly, no structured logging setup.

#### Solution: Create Client Logger

**File:** `client/src/lib/logger.ts` (NEW)

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class ClientLogger {
  private isDevelopment = import.meta.env.MODE === 'development';

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In development: Pretty print
    if (this.isDevelopment) {
      const styles = {
        debug: 'color: gray',
        info: 'color: blue',
        warn: 'color: orange',
        error: 'color: red; font-weight: bold',
      };

      console.log(
        `%c[${level.toUpperCase()}] ${message}`,
        styles[level],
        context || ''
      );
    } else {
      // In production: JSON for log aggregation
      console.log(JSON.stringify(logEntry));

      // Optionally send to log aggregation service
      if (level === 'error') {
        this.sendToLogService(logEntry);
      }
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  private sendToLogService(logEntry: any) {
    // TODO: Send to Sentry or log aggregation service
    // For now, just console.error
  }
}

export const logger = new ClientLogger();
```

---

#### Client-Side Conversion Patterns

**1. Component Logging**

```typescript
// ❌ BEFORE
import { useEffect } from 'react';

function MyComponent() {
  useEffect(() => {
    console.log('Component mounted');
    fetchData();
  }, []);

  const handleClick = () => {
    console.log('Button clicked');
  };

  return <button onClick={handleClick}>Click</button>;
}

// ✅ AFTER
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

function MyComponent() {
  useEffect(() => {
    logger.debug('Component mounted', { component: 'MyComponent' });
    fetchData();
  }, []);

  const handleClick = () => {
    logger.info('Button clicked', {
      component: 'MyComponent',
      action: 'submit',
    });
  };

  return <button onClick={handleClick}>Click</button>;
}
```

---

**2. API Errors**

```typescript
// ❌ BEFORE
const { data, error } = trpc.orders.create.useMutation();

if (error) {
  console.error('Failed to create order:', error);
}

// ✅ AFTER
import { logger } from '@/lib/logger';

const { data, error } = trpc.orders.create.useMutation();

if (error) {
  logger.error('Failed to create order', {
    error: error.message,
    code: error.code,
    endpoint: 'orders.create',
  });
}
```

---

**3. Form Submissions**

```typescript
// ❌ BEFORE
const handleSubmit = async (formData) => {
  console.log('Submitting form:', formData);
  try {
    await createOrder(formData);
    console.log('Order created successfully');
  } catch (error) {
    console.error('Submit failed:', error);
  }
};

// ✅ AFTER
import { logger } from '@/lib/logger';

const handleSubmit = async (formData) => {
  logger.info('Submitting form', {
    formType: 'order',
    itemCount: formData.items.length,
  });

  try {
    await createOrder(formData);
    logger.info('Order created successfully', {
      orderId: result.id,
    });
  } catch (error) {
    logger.error('Submit failed', {
      error: error.message,
      formType: 'order',
    });
  }
};
```

---

### Phase 3: Bulk Replacement (3 hours)

#### Automated Find & Replace

**Use VS Code Find & Replace (Regex)**

**Pattern 1: Simple console.log**
```regex
Find: console\.log\(['"`](.+?)['"`]\)
Replace: logger.info('$1')
```

**Pattern 2: console.error**
```regex
Find: console\.error\(['"`](.+?)['"`],\s*(\w+)\)
Replace: logger.error({ error: $2 }, '$1')
```

**Manual Review Required:**
- Complex expressions
- Multiple arguments
- Object logging
- Debug statements

---

#### Systematic File-by-File

**High-Value Files (Do These First):**

1. **Matching Engine** (`server/matchingEngineEnhanced.ts`)
   - Convert all console.error to structured logging
   - Add context: confidence scores, match types, reasons

2. **Order Creation** (`server/ordersDb.ts`)
   - Log order lifecycle events
   - Include: orderId, clientId, total, itemCount

3. **Client Needs** (`server/clientNeedsDbEnhanced.ts`)
   - Log need creation, matching, fulfillment
   - Include: needId, clientId, status

4. **Pricing Engine** (`server/pricingEngine.ts`)
   - Log pricing calculations
   - Include: rules applied, adjustments, final prices

5. **Authentication** (`server/_core/simpleAuth.ts`)
   - Log auth attempts, successes, failures
   - Include: email (not password!), timestamp

---

### Phase 4: Remove Debug Console.logs (1 hour)

#### Decision Framework

**Keep as logger.debug():**
- Useful for troubleshooting
- Shows algorithm flow
- Performance metrics

**Remove Entirely:**
- Leftover debug prints
- "Entering function" messages
- Variable dumps during development

**Example:**
```typescript
// ❌ DELETE THIS
console.log('test');
console.log('here');
console.log('asdf');

// ✅ KEEP AS DEBUG (if useful)
console.log('[MATCHING] Calculating confidence for strain:', strain);
// → logger.debug({ strain }, 'Calculating confidence');

// ✅ KEEP AS INFO (if important)
console.log('Starting server on port', port);
// → logger.info({ port }, 'Starting server');
```

---

## File-by-File Checklist

### Server Files (57 files with console.*)

**High Priority (Do First):**
- [ ] `server/matchingEngineEnhanced.ts`
- [ ] `server/ordersDb.ts`
- [ ] `server/clientNeedsDbEnhanced.ts`
- [ ] `server/pricingEngine.ts`
- [ ] `server/needsMatchingService.ts`
- [ ] `server/creditsDb.ts`
- [ ] `server/inventoryDb.ts`
- [ ] `server/accountingDb.ts`
- [ ] `server/_core/simpleAuth.ts`
- [ ] `server/_core/index.ts`

**Medium Priority:**
- [ ] All routers in `server/routers/`
- [ ] Service files in `server/services/`
- [ ] Database helper files (`*Db.ts`)

**Low Priority (Scripts, mostly dev use):**
- [ ] `scripts/` directory files
- [ ] Test files (can keep console in tests)

---

### Client Files (20 files with console.*)

**High Priority:**
- [ ] `client/src/pages/NeedsManagementPage.tsx`
- [ ] `client/src/pages/OrderCreatorPage.tsx`
- [ ] `client/src/pages/Inventory.tsx`
- [ ] `client/src/pages/ClientProfilePage.tsx`
- [ ] `client/src/components/needs/`
- [ ] `client/src/components/orders/`
- [ ] `client/src/components/inventory/`

**Medium Priority:**
- [ ] Dashboard components
- [ ] Accounting pages
- [ ] Other feature components

---

## Special Cases

### 1. Error Boundaries

```typescript
// ❌ BEFORE
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
}

// ✅ AFTER
import { logger } from '@/lib/logger';

class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logger.error({
      error: {
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
    }, 'Error caught by boundary');

    // Also send to Sentry
    if (window.Sentry) {
      window.Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }
}
```

---

### 2. Development-Only Logs

```typescript
// ❌ BEFORE
if (process.env.NODE_ENV === 'development') {
  console.log('Dev only:', data);
}

// ✅ AFTER
logger.debug({ data }, 'Development data');
// Logger handles dev vs prod automatically
```

---

### 3. Middleware Logging

```typescript
// ❌ BEFORE
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ✅ AFTER - Already using requestLogger
// File: server/_core/requestLogger.ts (already configured)
// No changes needed
```

---

## Testing After Changes

### 1. Verify Log Output

**Development:**
```bash
pnpm dev
# Should see pretty-printed logs with colors
```

**Production:**
```bash
NODE_ENV=production pnpm start
# Should see JSON-formatted logs
```

---

### 2. Check Log Levels

```bash
# Set log level
LOG_LEVEL=debug pnpm dev
# Should see debug logs

LOG_LEVEL=error pnpm dev
# Should only see errors
```

---

### 3. Verify Context Data

```typescript
// Create an order and check logs contain:
✅ orderId
✅ clientId
✅ total
✅ itemCount
✅ timestamp
✅ userId (after auth context fix)
```

---

## Production Considerations

### 1. Log Aggregation

**Setup Log Shipping (Future Enhancement):**

```typescript
// In server/_core/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Add transport for production
  transport:
    process.env.NODE_ENV === 'production'
      ? {
          target: 'pino/file',
          options: {
            destination: process.env.LOG_FILE || '/var/log/terp/app.log',
          },
        }
      : {
          target: 'pino-pretty',
          options: { colorize: true },
        },
});
```

---

### 2. Sensitive Data

**Never log:**
- ❌ Passwords
- ❌ API keys
- ❌ JWT tokens
- ❌ Credit card numbers
- ❌ SSNs

**Safe to log:**
- ✅ User IDs
- ✅ Email addresses (with consent)
- ✅ Order IDs
- ✅ Error messages
- ✅ Timestamps

---

### 3. Performance

**Avoid in hot paths:**
```typescript
// ❌ BAD - Logs 10000 times
for (let i = 0; i < 10000; i++) {
  logger.debug({ i }, 'Processing item');
}

// ✅ GOOD - Logs once
logger.debug({ totalItems: 10000 }, 'Processing items');
```

---

## Migration Script

**Create automated migration tool:**

**File:** `scripts/migrate-logging.js`

```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all .ts and .tsx files
const files = glob.sync('**/*.{ts,tsx}', {
  ignore: ['node_modules/**', 'dist/**', '**/*.test.ts'],
});

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Check if file has console.* calls
  if (content.includes('console.log') ||
      content.includes('console.error') ||
      content.includes('console.warn')) {

    // Add import if not present
    if (!content.includes('from \'@/lib/logger\'') &&
        !content.includes('from \'../_core/logger\'')) {

      const importLine = file.includes('client/')
        ? "import { logger } from '@/lib/logger';"
        : "import { logger } from '../_core/logger';";

      // Add after other imports
      content = content.replace(
        /(import .+ from .+;\n)(\n)/,
        `$1${importLine}\n$2`
      );
      changed = true;
    }

    // Simple replacements
    content = content.replace(/console\.log\(/g, 'logger.info(');
    content = content.replace(/console\.error\(/g, 'logger.error(');
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`✅ Updated: ${file}`);
  }
});

console.log('\n⚠️  Manual review required for complex cases');
```

**Run:**
```bash
node scripts/migrate-logging.js
# Review changes
git diff
# Fix any issues
```

---

## Rollout Strategy

### Option A: All at Once (Recommended)
1. Create feature branch
2. Run migration script
3. Manual review and fixes
4. Test thoroughly
5. Merge

### Option B: Incremental
1. Start with server files
2. Then client files
3. Then scripts
4. Verify each step

---

## Success Criteria

✅ Zero `console.log` in production code
✅ Zero `console.error` in production code
✅ All logs have structured context
✅ Log levels used appropriately
✅ No sensitive data in logs
✅ Production logs are JSON formatted
✅ Development logs are human-readable

---

## Estimated Timeline

- **Day 1 Morning:** Create client logger, update high-priority server files
- **Day 1 Afternoon:** Continue server files, start client files
- **Day 2 Morning:** Finish client files, run migration script
- **Day 2 Afternoon:** Manual review, testing, documentation

**Total: 2 days**

---

## Notes for AI Developer

### Flexibility
- Can use different logger library (winston, bunyan, etc.)
- Can customize log format
- Can add additional context fields
- Can integrate with log aggregation service

### Best Practices
- Add request IDs for tracing
- Include user ID in all user actions
- Log at appropriate levels
- Add metrics for important operations

### Don't Overthink
- Start with simple conversions
- Add context as you go
- Perfect is enemy of done
- Can always improve later
