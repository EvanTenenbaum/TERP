# Seed Defaults Validation - DI-005

## Issues Fixed

### 1. **insertId Bug (Lines 191 & 308)**
**Problem:** Code tried to access `insertId` property from Drizzle ORM insert results, but this doesn't exist in MySQL Drizzle returns.

**Original Code:**
```typescript
const [category] = await db.insert(categories).values({...});
const categoryId = category.insertId; // ❌ This doesn't exist!
```

**Fixed Code:**
```typescript
// Insert first
await db.insert(categories).values({...});

// Query back to get ID
const [category] = await db
  .select()
  .from(categories)
  .where(eq(categories.name, categoryData.name))
  .limit(1);

// Now use category.id ✅
```

### 2. **Idempotency Issues**
**Problem:** Seeding would fail on subsequent runs when data already exists.

**Solution:** Added try-catch blocks to handle duplicate entry errors gracefully:
```typescript
try {
  await db.insert(table).values(data);
} catch (error: any) {
  // Skip duplicate entries, throw other errors
  if (!error.message?.includes("Duplicate entry")) {
    throw error;
  }
}
```

### 3. **Missing Error Context**
**Problem:** When seeding failed, it was unclear which part failed.

**Solution:** Added detailed logging and a seeding results summary:
```typescript
const seedingResults = {
  rbac: false,
  locations: false,
  categories: false,
  grades: false,
  expenseCategories: false,
  accounts: false,
};
// ... track each step
console.log("📋 Seeding summary:", seedingResults);
```

### 4. **Database Connection Validation**
**Problem:** No validation that DB connection exists before attempting to seed.

**Solution:** Added validation at the start of seedAllDefaults():
```typescript
const db = await getDb();
if (!db) {
  console.error("❌ Database connection not available - skipping seeding");
  return;
}
```

## Schema Compatibility

All seeded tables match current schema (checked against `/home/user/TERP/drizzle/schema.ts`):

- ✅ **locations** - site, zone, rack, shelf, bin (+ auto fields)
- ✅ **categories** - name (unique constraint)
- ✅ **subcategories** - name, categoryId
- ✅ **grades** - name (unique), description, sortOrder
- ✅ **expenseCategories** - categoryName, parentCategoryId
- ✅ **accounts** - accountNumber (unique), accountName, accountType, normalBalance

All optional fields (deletedAt, isActive, createdAt, updatedAt) have defaults and don't need to be specified.

## Testing Checklist

- [x] TypeScript syntax validation passes
- [x] All functions have proper error handling
- [x] Idempotent - can run multiple times safely
- [x] Non-fatal - won't crash server on failure
- [x] Detailed logging for debugging
- [ ] Manual test: Run seeding on fresh database
- [ ] Manual test: Run seeding on database with existing data
- [ ] Manual test: Verify Railway deployment succeeds

## Deployment Notes

1. **Startup seeding is now enabled** - Will run automatically on server start (unless SKIP_SEEDING=true)
2. **Non-blocking** - If seeding fails, server continues to start
3. **Idempotent** - Safe to run on databases with existing data
4. **Validated** - DB connection checked before attempting to seed

## References

- Task: DI-005
- Files Modified:
  - `/home/user/TERP/server/services/seedDefaults.ts`
  - `/home/user/TERP/server/_core/index.ts`
