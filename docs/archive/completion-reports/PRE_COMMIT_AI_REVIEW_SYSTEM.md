# TERP Pre-Commit AI Review System

**Version:** 1.0  
**Last Updated:** 2025-01-27  
**Purpose:** Automated code quality, security, and edge case review before commits

---

## 🎯 Overview

The TERP Pre-Commit AI Review System automatically reviews all staged code before commits using three specialized AI reviewers:

1. **Senior Engineer Review** - Code quality, potential bugs, edge cases
2. **Security/Red Team Review** - Security vulnerabilities, race conditions, attack vectors
3. **Edge Case Stress Test** - Edge cases, boundary conditions, failure scenarios

The system **self-heals** by automatically applying fixes when possible, and provides detailed feedback on issues that require manual attention.

---

## 🚀 How It Works

### Automatic Execution

The review runs automatically on every `git commit` via the `.husky/pre-commit` hook:

```
git commit
  ↓
Pre-commit hook triggers
  ↓
AI Review System runs
  ↓
1. Senior Engineer Review
2. Security Review
3. Edge Case Review
  ↓
Self-healing: Auto-apply fixes
  ↓
Report results
  ↓
Block commit if critical issues found
```

### Manual Execution

You can also run the review manually:

```bash
pnpm pre-commit:review
```

---

## 📋 Review Types

### 1. Senior Engineer Review

**Role:** Senior Staff Engineer known for being extremely nitpicky

**Checks:**

- Code quality and maintainability
- Potential bugs and logic errors
- Performance issues
- Best practice violations
- Edge cases in normal operation
- Code smells

**Example Issues:**

- Missing null/undefined checks
- Inefficient algorithms
- Poor error handling
- Code duplication
- Type safety issues

### 2. Security/Red Team Review

**Role:** Security researcher trying to break the code

**Checks:**

- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication/authorization flaws
- Race conditions
- Memory leaks
- Input validation issues
- High load failures
- Malicious input handling

**Example Issues:**

- Unvalidated user input
- Missing CSRF protection
- Insecure direct object references
- Timing attacks
- Denial of service vulnerabilities

### 3. Edge Case Stress Test

**Role:** Focus on edge cases and boundary conditions

**Checks:**

- Null/undefined handling
- Empty arrays/strings
- Boundary conditions
- Type mismatches
- Async timing issues
- Resource exhaustion
- Unexpected user inputs

**Example Issues:**

- Division by zero
- Array out of bounds
- Missing error handling for edge cases
- Race conditions in async code
- Integer overflow

---

## 🔧 Self-Healing Mechanism

The system automatically applies fixes when possible:

### How It Works

1. **AI Identifies Issues** - Each reviewer flags specific problems
2. **AI Provides Fixes** - Suggested fixes in code blocks
3. **Auto-Apply Logic:**
   - AI applies fixes to the file
   - Validates TypeScript syntax
   - Stages the fixed file
   - Verifies which issues were resolved
4. **Report Results** - Shows what was auto-fixed vs. manual fixes needed

### Safety Features

- **Syntax Validation** - Only applies fixes that compile correctly
- **Verification** - Confirms fixes actually address the issues
- **Graceful Degradation** - Falls back if fixes can't be applied
- **Non-Destructive** - Original code preserved in git history

### What Gets Auto-Fixed

- Missing null checks
- Type safety improvements
- Simple validation additions
- Error handling improvements
- Security fixes (when safe)

### What Requires Manual Fix

- Architectural changes
- Complex logic refactoring
- Breaking changes
- Multi-file dependencies
- Performance optimizations requiring context

---

## ⚙️ Configuration

### Environment Variables

```bash
# Required for AI review (optional - gracefully degrades if missing)
GOOGLE_GEMINI_API_KEY=your_api_key_here
# OR
GEMINI_API_KEY=your_api_key_here
```

### Script Options

Edit `scripts/pre-commit-review.ts` to customize:

```typescript
const AI_TIMEOUT_MS = 30000; // Timeout per review (30 seconds)
const MAX_REVIEW_FILES = 5; // Maximum files to review per commit
const SKIP_AI_IF_NO_KEY = true; // Don't block if API key missing
```

### Model Selection

Uses `gemini-2.0-flash-exp` by default. Change in script:

```typescript
const GEMINI_MODEL = "gemini-2.0-flash-exp";
```

---

## 📊 Review Results

### Success Output

```
🔍 Reviewing 3 file(s)...
✅ server/api/users.ts: Passed
✅ client/components/Login.tsx: Passed
✅ shared/utils/validation.ts: Auto-fixed

📊 Review Summary:
==================================================
✅ Auto-fixed 2 issue(s)

✅ All reviews passed!
```

### Issues Found (Non-Critical)

```
🔍 Reviewing 2 file(s)...
⚠️  server/api/orders.ts: Issues found
✅ client/components/Dashboard.tsx: Passed

📊 Review Summary:
==================================================

⚠️  Issues Found (2):
📁 server/api/orders.ts [SENIOR]
  ⚠️  Missing null check for user.id
  ⚠️  Potential memory leak in event listener
  ⚠️  ... and 1 more

💡 Consider addressing these issues, but not blocking commit.
```

### Critical Issues (Blocks Commit)

```
🔍 Reviewing 1 file(s)...
❌ server/api/payments.ts: Critical issues found

📊 Review Summary:
==================================================

🚨 CRITICAL ISSUES FOUND (1):
📁 server/api/payments.ts [SECURITY]
  ❌ SQL injection vulnerability in user input
  ❌ Missing authentication check
  ❌ Sensitive data exposure in error messages

⚠️  Please fix critical issues before committing.
```

---

## 🛡️ Integration with Existing Workflow

The AI review integrates seamlessly with existing pre-commit checks:

```
Pre-Commit Hook Execution Order:
1. ✅ QA Standards Check (.husky/pre-commit-qa-check.sh)
2. 🤖 AI-Powered Code Review (NEW)
3. 🔍 Linting & Formatting (lint-staged)
4. 📋 Roadmap Validation (if roadmap changed)
5. 🗂️  Session Cleanup Validation
```

### Graceful Degradation

- If `GEMINI_API_KEY` is missing: Review is skipped, other checks continue
- If AI review fails: Warning shown, other checks continue
- Only **critical security issues** block commits
- Non-critical issues are reported but don't block

---

## 📝 Agent Protocol Integration

### For Agents

Agents must be aware of the AI review system:

1. **Before Committing:**

   ```bash
   # Review runs automatically, but you can check first:
   pnpm pre-commit:review
   ```

2. **If Review Finds Issues:**
   - **Auto-fixed issues:** Already staged, just commit
   - **Manual fixes needed:** Address the issues, then commit
   - **Critical issues:** Must fix before commit will succeed

3. **After Auto-Fix:**

   ```bash
   # Check what was auto-fixed:
   git diff --cached

   # Review the changes before committing:
   git commit -m "feat: implement feature X (auto-fixed by AI review)"
   ```

### For Manual Commits

Humans follow the same process - the review runs automatically and provides feedback.

---

## 🔍 Troubleshooting

### Review Not Running

**Issue:** Pre-commit hook not executing

**Fix:**

```bash
# Reinstall husky hooks
pnpm prepare
```

### API Key Missing

**Issue:** `⚠️  No GEMINI_API_KEY found. Skipping AI review.`

**Fix:**

```bash
# Set environment variable
export GEMINI_API_KEY=your_key_here

# Or add to .env file:
echo "GEMINI_API_KEY=your_key_here" >> .env
```

### Review Takes Too Long

**Issue:** Review timing out or taking too long

**Fix:**

- Reduce `MAX_REVIEW_FILES` in script
- Increase `AI_TIMEOUT_MS` if needed
- Review runs in parallel - should be fast for <5 files

### False Positives

**Issue:** AI flags issues that aren't real problems

**Fix:**

- AI review is advisory for non-critical issues
- Critical issues should be manually verified
- If needed, adjust prompts in script

### Auto-Fix Applied Incorrectly

**Issue:** Auto-fix breaks code

**Fix:**

- Check git diff before committing
- Review validates TypeScript syntax before applying
- Always review auto-fixes manually
- Git history preserves original code

---

## 📚 Related Documentation

- `docs/ROADMAP_AGENT_GUIDE.md` - Agent workflow
- `.husky/pre-commit-qa-check.sh` - QA standards
- `docs/testing/TERP_PRE_COMMIT_CHECKLIST.md` - Pre-commit checklist
- `scripts/pre-commit-review.ts` - Review implementation

---

## 🎓 Best Practices

1. **Review Auto-Fixes** - Always check what the AI changed
2. **Address Critical Issues** - Never ignore security warnings
3. **Use Manual Review** - Run `pnpm pre-commit:review` before large commits
4. **Iterate on Fixes** - If auto-fix doesn't work, manually address the issue
5. **Learn from Patterns** - Review results help identify common issues

---

## 🔄 Continuous Improvement

The review system learns and improves:

- **Review Results** - Patterns in flagged issues inform improvements
- **Fix Success Rate** - Tracks which auto-fixes work well
- **Prompt Refinement** - Prompts can be improved based on results
- **Model Updates** - Can switch to newer AI models as available

---

**Questions or Issues?**  
Check the script at `scripts/pre-commit-review.ts` or open an issue.
