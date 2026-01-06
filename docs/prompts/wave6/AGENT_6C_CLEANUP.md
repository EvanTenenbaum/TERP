# Agent 6C: Code Cleanup & Quality

**Estimated Time**: 12-16 hours  
**Priority**: MEDIUM - Technical debt reduction  
**Dependencies**: None (can start immediately)

---

## Mission

Remove deprecated code, fix TypeScript issues, and reduce technical debt.

---

## Context

The codebase has accumulated:
- 37 TODO/FIXME comments (verified count)
- 1 file with @ts-nocheck: server/db/seed/productionSeed.ts
- No AI/LLM code found (search returned empty - skip this task)
- Possibly deprecated features

---

## Prompt

```
You are working on the TERP cannabis ERP project.

## Setup
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install

## Your Mission: Code Cleanup & Quality

### Task 1: Verify No AI/LLM Code Exists (CLEANUP-001) - 30 min

#### 1.1 Confirm no AI-related code
grep -rn "openai\|anthropic\|gpt-\|claude\|llm\|langchain" --include="*.ts" --include="*.tsx" client/ server/

**Expected result**: Empty (no matches found in prior audit)

If any matches are found:
- Document what you find
- Determine if actively used
- Remove only if clearly unused

IMPORTANT: Be conservative. If unsure, leave the code and document it.

### Task 2: TODO/FIXME Audit (QUAL-007) - 4-6h

#### 2.1 Find all TODOs
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" client/ server/ > /tmp/todos.txt
wc -l /tmp/todos.txt

**Expected count**: ~37 TODOs (verified in prior audit)

#### 2.2 Categorize each TODO:

**Remove if:**
- Task is already completed
- Comment is stale (references old code/features)
- Comment is vague with no actionable item

**Keep if:**
- Valid technical debt that should be tracked
- Security-related concern
- Performance optimization needed

**Convert to GitHub Issue if:**
- Significant work item (>2 hours)
- Needs discussion or design decision

#### 2.3 For TODOs you keep, improve them:
Bad: // TODO: fix this
Good: // TODO(TERP-123): Refactor to use batch API for better performance

#### 2.4 Target: Reduce TODO count by 50%

### Task 3: Fix @ts-nocheck Files - 2-4h

#### 3.1 Known file with @ts-nocheck
**Only one file has @ts-nocheck**: server/db/seed/productionSeed.ts

Verify with:
grep -rln "@ts-nocheck" --include="*.ts" --include="*.tsx" client/ server/

#### 3.2 For each file:
1. Remove the @ts-nocheck directive
2. Run: pnpm check 2>&1 | grep <filename>
3. Fix the TypeScript errors properly
4. If error is complex and would take >1h to fix:
   - Add specific @ts-ignore with explanation
   - Create GitHub issue for follow-up

#### 3.3 Common fixes:
- Missing type annotations → Add proper types
- Implicit any → Define interface or use unknown
- Null checks → Add optional chaining or null checks
- Missing imports → Add the import

### Task 4: Remove Deprecated Features (if found) - 2-4h

Check for and remove if unused:
- Comments feature (if ST-024 indicates removal)
- Any feature flagged as deprecated in code comments
- Dead code paths (functions never called)

Use this to find unused exports:
npx ts-prune | head -50

### Task 5: Verify Changes

1. pnpm check (MUST pass with 0 errors)
2. pnpm test (should not break existing tests)
3. pnpm build (must complete)

### Task 6: Create PR

git checkout -b chore/code-cleanup
git add -A
git commit -m "chore(cleanup): remove deprecated code and fix TypeScript issues

CLEANUP-001: AI/LLM code audit
- [List what was removed or kept]

QUAL-007: TODO audit
- Reduced TODO count from X to Y
- Created GitHub issues for significant items
- Removed stale/completed TODOs

TypeScript fixes:
- Removed @ts-nocheck from X files
- Fixed type errors in [list files]"

git push origin chore/code-cleanup
gh pr create --title "chore(cleanup): remove deprecated code and fix TypeScript" --body "..."
```

---

## Success Criteria

- [ ] AI/LLM code audited and documented
- [ ] TODO count reduced by 50%+
- [ ] @ts-nocheck count reduced (ideally to 0)
- [ ] No new TypeScript errors introduced
- [ ] pnpm check passes
- [ ] pnpm test passes (or same failures as before)
- [ ] pnpm build passes

---

## Files Modified

Varies based on findings. Document all changes in PR description.

---

## Merge Priority

**Merge THIRD** - After documentation updates, before new features. May affect other PRs if removing shared code.
