# Future Architecture Compatibility - Cheat Sheet

**⚡ Ultra-quick reference - Full details in MANUS_AGENT_CONTEXT.md**

---

## ✅ DO

```typescript
// Auth
import { authProvider } from '../_core/authProvider';
const user = await authProvider.requireAuth(req);

// Data
import { dataProvider } from '../_core/dataProvider';
const data = await dataProvider.query(db => db.select()...);

// API Response
return {
  resource,  // Full object
  affectedRecords: { type: [ids] },
  timestamp: new Date(),
};

// Schema
export const table = mysqlTable('table', {
  id: serial('id'),
  // NEW: nullable or default
  newField: varchar('new_field').default(''),
});

// Code Organization
// Router: < 50 lines, just validation
// Business logic: In *Db.ts files
```

---

## ❌ DON'T

```typescript
// Auth
import { getAuth } from '@clerk/express';  // Direct call

// Data
import { getDb } from '../db';  // Direct call
const db = await getDb();

// API Response
return { id };  // Just ID, no full object

// Schema
export const table = mysqlTable('table', {
  renamedField: varchar('renamed'),  // BREAKS CODE!
});

// Code Organization
// 100+ lines of logic in router  // TOO FAT!
```

---

## Pre-Push ✓

- [ ] Uses `authProvider`/`dataProvider`
- [ ] Returns full objects + metadata
- [ ] Schema additive only
- [ ] Router < 50 lines

---

**That's it! Build fast, stay compatible.** 🚀

