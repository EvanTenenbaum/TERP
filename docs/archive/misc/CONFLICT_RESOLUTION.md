# Conflict Resolution Guide
## Handling Merge Conflicts in Parallel Development

**Version:** 1.0
**Last Updated:** November 12, 2025
**Purpose:** Step-by-step procedures for resolving conflicts when multiple Claude sessions work in parallel

---

## 📋 Table of Contents

1. [Common Conflict Scenarios](#common-conflict-scenarios)
2. [Session File Conflicts (Should Never Happen)](#session-file-conflicts-should-never-happen)
3. [Code File Conflicts (Rare but Possible)](#code-file-conflicts-rare-but-possible)
4. [Roadmap Conflicts](#roadmap-conflicts)
5. [Automated Resolution](#automated-resolution)
6. [When to Ask User](#when-to-ask-user)

---

## Common Conflict Scenarios

### Scenario 1: Session File Conflict (Should Never Happen)

**Symptom:** Git reports conflict in `docs/sessions/active/Session-*.md`

**Why this should never happen:**
- Each session has its own file
- Different files = no conflicts
- If this happens, something went wrong

**Resolution:**
```bash
# This is a system error - should not occur
# If it does, check:
1. Are two sessions using the same Session ID? (ID collision)
2. Is someone manually editing session files? (user error)
3. Is the session ID generation broken? (bug)

# Fix: Keep both files, investigate why IDs collided
git checkout --ours docs/sessions/active/Session-[ID].md
git add docs/sessions/active/Session-[ID].md
git commit -m "fix: resolve session file conflict"
```

### Scenario 2: Code File Conflict (Expected in Same Module)

**Symptom:** Git reports conflict in `server/routers/ordersDb.ts` (or similar)

**Why this happens:**
- Session A modified `ordersDb.ts`
- Session B also modified `ordersDb.ts`
- Both try to merge to main

**Resolution:**

**Step 1: Analyze the conflict**
```bash
# Fetch latest from main
git fetch origin main

# Check what changed
git diff origin/main..HEAD -- server/routers/ordersDb.ts

# Check what the other session changed
git diff HEAD..origin/main -- server/routers/ordersDb.ts
```

**Step 2: Determine conflict type**

| Conflict Type | Resolution Strategy |
|---------------|---------------------|
| **Different functions** | Auto-merge (keep both) |
| **Same function, different logic** | Ask user which to keep |
| **Same function, same goal** | Merge manually |
| **Incompatible changes** | Ask user for direction |

**Step 3: Resolve automatically (if possible)**

```bash
# Pull with rebase
git pull --rebase origin main

# If rebase succeeds automatically:
git push origin [branch]

# If rebase has conflicts:
# (Go to Step 4)
```

**Step 4: Manual resolution**

```bash
# Open conflicted file
# Look for conflict markers:
<<<<<<< HEAD
Your changes
=======
Other session's changes
>>>>>>> origin/main

# Option A: Keep your changes
git checkout --ours server/routers/ordersDb.ts

# Option B: Keep other session's changes
git checkout --theirs server/routers/ordersDb.ts

# Option C: Merge both manually
# Edit file to combine both changes

# Mark as resolved
git add server/routers/ordersDb.ts

# Continue rebase
git rebase --continue

# Push
git push origin [branch]
```

### Scenario 3: Roadmap Update Conflict

**Symptom:** Git reports conflict in `docs/roadmaps/MASTER_ROADMAP.md`

**Why this happens:**
- Session A marked task A as complete
- Session B marked task B as complete
- Both modified different parts of same file

**Resolution:**

**This should auto-merge most of the time:**

```bash
git pull --rebase origin main
# If successful:
git push origin [branch]
```

**If manual resolution needed:**

```bash
# Open MASTER_ROADMAP.md
# Conflict markers will show:
<<<<<<< HEAD
- [x] Task A (Completed by Session A)
- [ ] Task B (Not started)
=======
- [ ] Task A (Not started)
- [x] Task B (Completed by Session B)
>>>>>>> origin/main

# Merge both changes:
- [x] Task A (Completed by Session A)
- [x] Task B (Completed by Session B)

# Mark as resolved
git add docs/roadmaps/MASTER_ROADMAP.md
git rebase --continue
git push origin [branch]
```

### Scenario 4: Multiple Conflicts

**Symptom:** Multiple files have conflicts

**Resolution:**

```bash
# See all conflicts
git status | grep "both modified"

# Resolve each file one by one
# Follow resolution strategy for each file type

# For session files: Keep yours (--ours)
# For code files: Merge carefully or ask user
# For roadmap: Merge both updates
# For docs: Merge both updates
```

---

## Session File Conflicts (Should Never Happen)

**With the new session file design, session file conflicts should NEVER occur.**

**Why:**
- Each session writes to its own file
- Example: `docs/sessions/active/Session-20251112-feature-a-ABC123.md`
- Different files = no conflicts
- Aggregate view generated from all files

**If it happens anyway:**

1. **Check Session IDs:**
   - Are two sessions using the same ID?
   - Possible ID collision (7 alphanumeric = 78B combinations, very rare)

2. **Check for manual editing:**
   - Did a human edit the file directly?
   - Did someone rename a file?

3. **Resolve:**
   ```bash
   # Keep your session file
   git checkout --ours docs/sessions/active/Session-[ID].md

   # OR keep other session's file
   git checkout --theirs docs/sessions/active/Session-[ID].md

   # OR keep both (rename one)
   cp docs/sessions/active/Session-[ID].md docs/sessions/active/Session-[ID]-2.md
   git add docs/sessions/active/
   ```

---

## Code File Conflicts (Rare but Possible)

### When It's Safe to Auto-Merge

**Criteria:**
- Changes are in different functions
- No shared dependencies
- Both changes are additive (no deletions)
- TypeScript compiles after merge
- Tests pass after merge

**Auto-merge procedure:**

```bash
#!/bin/bash
# Auto-merge if safe

# Attempt rebase
git pull --rebase origin main

# If successful:
if [ $? -eq 0 ]; then
    # Verify TypeScript
    pnpm check

    # Verify tests
    pnpm test --run

    # If all pass:
    git push origin [branch]
    echo "✅ Auto-merge successful"
else
    echo "⚠️  Manual merge required"
fi
```

### When to Ask User

**Ask user if:**
- Same function modified by both sessions
- Logic conflicts (incompatible changes)
- Deletions involved
- Core functionality affected
- Unsure which change is correct

**User prompt template:**

```
⚠️  MERGE CONFLICT DETECTED

File: server/routers/ordersDb.ts
Function: calculateMargin()

Session A changed:
  - Added feature X
  - Modified margin calculation for retail

Session B (other session) changed:
  - Added feature Y
  - Modified margin calculation for wholesale

These changes are incompatible. Which approach should I use?

Options:
1. Keep Session A changes (your work)
2. Keep Session B changes (other session)
3. Merge both (I'll combine them)
4. Show me both and let me decide
```

---

## Roadmap Conflicts

### Common Roadmap Conflict Patterns

**Pattern 1: Both marked different tasks complete**

```markdown
<<<<<<< HEAD
- [x] Task A (Completed: Session-ABC)
- [ ] Task B
=======
- [ ] Task A
- [x] Task B (Completed: Session-XYZ)
>>>>>>> origin/main
```

**Resolution:** Keep both:
```markdown
- [x] Task A (Completed: Session-ABC)
- [x] Task B (Completed: Session-XYZ)
```

**Pattern 2: Both started same task**

```markdown
<<<<<<< HEAD
- [~] Task A (Session-ABC: In progress)
=======
- [~] Task A (Session-XYZ: In progress)
>>>>>>> origin/main
```

**Resolution:** This is a coordination failure! Should not happen.

```markdown
# Keep first session, alert about duplicate work
- [~] Task A (Session-ABC: In progress)
# ⚠️  WARNING: Session-XYZ also started this task!
```

**Alert user:**
```
⚠️  DUPLICATE WORK DETECTED

Task: Task A
Session A: ABC123 (started first)
Session B: XYZ789 (started second)

Both sessions are working on the same task!

Recommendation:
1. Stop Session B work on Task A
2. Assign Session B to different task
3. Session A continues with Task A
```

---

## Automated Resolution

### Conflict Detection Script

**Run before merging:**

```bash
#!/bin/bash
# scripts/detect-conflicts.sh

BRANCH=$1

# Fetch latest
git fetch origin main

# Check for conflicts
git merge-tree $(git merge-base origin/main HEAD) origin/main HEAD > /tmp/merge-preview

if grep -q "<<<<<<< " /tmp/merge-preview; then
    echo "⚠️  Conflicts detected:"
    grep -B2 -A2 "<<<<<<< " /tmp/merge-preview
    exit 1
else
    echo "✅ No conflicts, safe to merge"
    exit 0
fi
```

### Auto-Resolution Matrix

| File Type | Conflict Type | Auto-Resolve? | Strategy |
|-----------|---------------|---------------|----------|
| Session files | Any | ❌ Never (shouldn't happen) | Alert user |
| Code files (different functions) | Addition | ✅ Yes | Keep both |
| Code files (same function) | Logic change | ❌ No | Ask user |
| Roadmap (different tasks) | Status update | ✅ Yes | Keep both |
| Roadmap (same task) | Status update | ❌ No | Alert user |
| Documentation | Content | ✅ Maybe | Try auto-merge |
| Tests | Any | ❌ No | Ask user |

---

## When to Ask User

### Decision Matrix

**ASK USER if:**

| Scenario | Why |
|----------|-----|
| Logic conflict in core function | User understands business logic best |
| Incompatible feature changes | User decides product direction |
| Duplicate work detected | User coordinates sessions |
| Database schema conflict | User decides data model |
| Test failures after merge | User reviews test expectations |
| Breaking changes | User approves breaking changes |

**DON'T ASK if:**

| Scenario | Why |
|----------|-----|
| Different functions added | Safe to keep both |
| Different docs updated | Safe to merge |
| Different tasks completed | Safe to merge |
| Formatting conflicts | Auto-format and merge |
| Comment conflicts | Merge both comments |

### User Question Template

```markdown
## 🤔 Need Your Decision

**Conflict:** [Brief description]
**File:** [file path]
**Location:** [function/section name]

**Context:**
[Explain what both sessions were trying to do]

**Option 1: Keep Session A (your work)**
[Explain what this does]
- Pros: ...
- Cons: ...

**Option 2: Keep Session B (other session)**
[Explain what this does]
- Pros: ...
- Cons: ...

**Option 3: Merge both**
[Explain how I would combine them]
- Pros: ...
- Cons: ...

**My recommendation:** Option [X] because [reason]

**What would you like me to do?**
```

---

## Prevention Best Practices

### Before Starting Work

**Claude should always check:**

```bash
# 1. What files will this task modify?
echo "This task will modify:"
echo "- server/routers/orders.ts"
echo "- server/ordersDb.ts"

# 2. Are other sessions touching these files?
./scripts/aggregate-sessions.sh
grep "orders" docs/ACTIVE_SESSIONS.md

# 3. If conflict likely:
# Alert user before starting
echo "⚠️  WARNING: Another session may be working on orders"
echo "Recommendation: Work on different module or wait"
```

### During Work

**Frequent pulls:**

```bash
# Pull every 30 minutes to catch conflicts early
git fetch origin main
git diff origin/main..HEAD

# If significant divergence:
echo "⚠️  Main branch has advanced significantly"
echo "Consider rebasing before continuing"
```

### Before Merging

**Pre-merge checks:**

```bash
# 1. Detect conflicts
./scripts/detect-conflicts.sh [branch]

# 2. If conflicts found:
#    Resolve before requesting merge approval

# 3. Verify after resolution:
pnpm check  # TypeScript
pnpm test --run  # Tests
pnpm build  # Build
```

---

## Examples

### Example 1: Clean Merge (No Conflicts)

```bash
$ git checkout main
$ git pull origin main
Already up to date.

$ git merge claude/feature-a-ABC123
Merge made by the 'recursive' strategy.
 server/ordersDb.ts | 45 +++++++++++++++++++++++++++++
 1 file changed, 45 insertions(+)

$ git push origin main
✅ Clean merge, no conflicts
```

### Example 2: Auto-Resolved Conflict

```bash
$ git merge claude/feature-b-XYZ789
Auto-merging docs/roadmaps/MASTER_ROADMAP.md
Merge made by the 'recursive' strategy.

$ pnpm check
✅ TypeScript check passed

$ pnpm test --run
✅ All tests passed

$ git push origin main
✅ Auto-resolved and verified
```

### Example 3: Manual Resolution Required

```bash
$ git merge claude/feature-c-DEF456
Auto-merging server/ordersDb.ts
CONFLICT (content): Merge conflict in server/ordersDb.ts
Automatic merge failed; fix conflicts and then commit the result.

$ git status
both modified:   server/ordersDb.ts

# Check the conflict
$ cat server/ordersDb.ts | grep -A5 "<<<<<<< HEAD"

<<<<<<< HEAD
// Session A: Added wholesale COGS calculation
export function calculateCOGS(order: Order) {
  return order.items.reduce((sum, item) => sum + item.costBasis, 0);
}
=======
// Session B: Added retail COGS calculation
export function calculateCOGS(order: Order) {
  return order.items.reduce((sum, item) => sum + item.purchasePrice, 0);
}
>>>>>>> claude/feature-c-DEF456

# Conflict: incompatible logic
# Need user decision

⚠️  MERGE CONFLICT DETECTED
Both sessions modified calculateCOGS() function with different logic.

Session A: Uses costBasis (wholesale)
Session B: Uses purchasePrice (retail)

Which approach is correct?
```

### Example 4: Duplicate Work Detected

```bash
# Session B starts work
$ ./scripts/aggregate-sessions.sh

⚠️  WARNING: Potential conflict detected

Task: "Add COGS improvements"
Session A: ABC123 (started 30 minutes ago, 50% complete)
Session B: XYZ789 (just started)

Recommendation: Session B should work on different task to avoid duplicate work.

Continue anyway? (y/N)
```

---

## Troubleshooting

### "I merged but now tests are failing"

**Cause:** Merge was clean but changes are incompatible at runtime

**Fix:**
```bash
# Revert merge
git revert HEAD

# Analyze both changes separately
git checkout claude/feature-a-ABC123
pnpm test --run  # Should pass

git checkout claude/feature-b-XYZ789
pnpm test --run  # Should pass

# Merge with integration test
git checkout main
git merge claude/feature-a-ABC123
pnpm test --run  # Passes

git merge claude/feature-b-XYZ789
pnpm test --run  # FAILS - now we know feature-b breaks with feature-a

# Ask user for guidance
```

### "Conflict resolution seems stuck"

**Cause:** Too many conflicts, hard to resolve

**Fix:**
```bash
# Option 1: Abort and merge sequentially
git merge --abort
git merge claude/feature-a-ABC123  # Merge first
git push origin main               # Deploy
git merge claude/feature-b-XYZ789  # Then merge second

# Option 2: Rebase one branch onto main
git checkout claude/feature-b-XYZ789
git rebase origin/main  # Brings in feature-a changes
# Resolve conflicts in small chunks
git push --force-with-lease origin claude/feature-b-XYZ789
```

### "Same Session ID used by two sessions"

**Cause:** Random collision (extremely rare: 1 in 78 billion)

**Fix:**
```bash
# Session B generates new ID
NEW_ID="Session-$(date +%Y%m%d)-feature-b-$(openssl rand -hex 3 | tr '[:lower:]' '[:upper:]' | head -c 7)"

# Rename all references
git branch -m claude/feature-b-[OLD_ID] claude/feature-b-$NEW_ID
mv docs/sessions/active/Session-[OLD_ID].md docs/sessions/active/$NEW_ID.md

# Update session file content
sed -i "s/Session-[OLD_ID]/$NEW_ID/g" docs/sessions/active/$NEW_ID.md

# Commit rename
git add .
git commit -m "fix: rename session due to ID collision"
git push origin claude/feature-b-$NEW_ID
```

---

## Summary

**Key Principles:**

1. **Session files should NEVER conflict** (each session has own file)
2. **Code conflicts are rare** (work on different modules)
3. **When conflicts occur, try auto-resolution first**
4. **Ask user for incompatible logic conflicts**
5. **Detect conflicts early** (before merge)
6. **Document all resolutions** (for audit trail)

**Conflict Resolution Workflow:**

```
Conflict Detected
       ↓
Is it auto-resolvable?
   ↓              ↓
  Yes            No
   ↓              ↓
Auto-merge   Ask User
   ↓              ↓
Verify         Manual Resolution
   ↓              ↓
Tests Pass?    Verify
   ↓              ↓
  Yes            Tests Pass?
   ↓              ↓
Push           Yes → Push
             No → Fix & Retry
```

---

**Maintained By:** Claude agents
**Review Frequency:** After any conflict incident
**Last Updated:** November 12, 2025
