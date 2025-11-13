# ST-014: Efficient Test Migration Plan

## Problem Analysis

**Current Situation:**
- 17 test files need migration
- 189 failing tests
- Manual migration would take 6-10 hours
- Each file has similar patterns but different complexity

## Efficient Approach: Hybrid Automation + Smart Prioritization

### Strategy 1: Automated Pattern Replacement (80% of work)

Most test files follow predictable patterns that can be automatically fixed:

**Pattern 1: Simple Mock Setup**
```typescript
// OLD
vi.mock("../db", () => ({
  db: { select: vi.fn() },
}));

// NEW
import { setupDbMock } from '../test-utils/testDb';
vi.mock("../db", () => setupDbMock());
```

**Pattern 2: Mock Return Values**
```typescript
// OLD
(db.select as any).mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([data]),
  }),
});

// NEW
import { mockSelectQuery } from '../test-utils/testDb';
mockSelectQuery(db as any, [data]);
```

### Strategy 2: Smart Prioritization (20% of work)

**Tier 1: Simple Files (Quick Wins)**
- Files with basic SELECT queries only
- Minimal mocking complexity
- Estimated: 5-10 minutes each
- Examples: `analytics.test.ts`, `calendar.test.ts`

**Tier 2: Medium Files**
- Mix of SELECT, INSERT, UPDATE queries
- Moderate complexity
- Estimated: 15-20 minutes each
- Examples: `accounting.test.ts`, `orders.test.ts`

**Tier 3: Complex Files**
- `permissionService.test.ts` (189 tests, complex logic)
- Multiple query types with conditional mocking
- Estimated: 1-2 hours
- Strategy: Fix last, use learnings from simpler files

### Strategy 3: Automated Migration Script

Create a smart migration script that:

1. **Analyzes each test file** to categorize complexity
2. **Applies automated fixes** for common patterns
3. **Generates a diff** for manual review
4. **Runs tests** after each file to verify
5. **Rolls back** if tests fail
6. **Reports progress** in real-time

### Implementation Plan

#### Phase 1: Create Smart Migration Tool (30 min)
```bash
scripts/migrate-test-file.sh <test-file>
```

Features:
- Automatic import injection
- Pattern replacement with regex
- Backup creation
- Test execution
- Rollback on failure

#### Phase 2: Batch Migration (2-3 hours)
1. Run tool on Tier 1 files (10 files × 10 min = 100 min)
2. Run tool on Tier 2 files (6 files × 20 min = 120 min)
3. Total: ~3.5 hours vs 6-8 hours manual

#### Phase 3: Complex File Manual Fix (1-2 hours)
- `permissionService.test.ts` - Manual migration with careful review

#### Phase 4: Verification (30 min)
- Run full test suite
- Verify 0 failures
- Update documentation

### Total Time Estimate

- **Automated approach:** 4-6 hours (vs 6-10 hours manual)
- **Time saved:** 2-4 hours (33-40% reduction)

## Risk Mitigation

1. **Backup before each migration** - Can rollback if needed
2. **Test after each file** - Catch issues immediately
3. **Incremental commits** - Can bisect if problems arise
4. **Manual review of diffs** - Ensure correctness

## Success Criteria

- ✅ All 17 test files migrated
- ✅ 0 failing tests (189 → 0)
- ✅ All tests use new `testDb` utility
- ✅ Pre-commit hooks no longer need `--no-verify`
- ✅ Documentation updated

## Tool Design

### migrate-test-file.sh

```bash
#!/bin/bash
# Smart test file migration tool

FILE=$1

# 1. Analyze complexity
complexity=$(analyze_complexity "$FILE")

# 2. Create backup
cp "$FILE" "$FILE.backup"

# 3. Apply automated fixes
apply_import_fix "$FILE"
apply_mock_setup_fix "$FILE"
apply_query_mock_fixes "$FILE"

# 4. Run tests
if pnpm test "$FILE"; then
  echo "✅ Migration successful: $FILE"
  rm "$FILE.backup"
else
  echo "❌ Migration failed: $FILE"
  mv "$FILE.backup" "$FILE"
  exit 1
fi
```

### Key Functions

1. **analyze_complexity()** - Count mocking patterns to estimate difficulty
2. **apply_import_fix()** - Add testDb imports
3. **apply_mock_setup_fix()** - Replace old mock pattern
4. **apply_query_mock_fixes()** - Replace query mocking patterns

## QA Checklist

Before executing:
- [ ] Review script logic for correctness
- [ ] Test script on 1 simple file first
- [ ] Verify rollback works
- [ ] Check that automated patterns match actual code
- [ ] Ensure no edge cases missed

## Expected Outcome

- **Time:** 4-6 hours (vs 6-10 manual)
- **Quality:** Same or better (automated = consistent)
- **Risk:** Low (backups + incremental testing)
- **Maintainability:** High (reusable tool for future migrations)
