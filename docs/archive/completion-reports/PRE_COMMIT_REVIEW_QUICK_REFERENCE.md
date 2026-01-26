# Pre-Commit AI Review - Quick Reference

## For Agents

### Automatic Review

The AI review runs automatically on every `git commit`. No action needed.

### Before Committing

```bash
# Optional: Run review manually first
pnpm pre-commit:review
```

### After Review

**If auto-fixed:**

```bash
# Check what was auto-fixed
git diff --cached

# Commit as normal
git commit -m "feat: your message"
```

**If critical issues found:**

- Review blocks commit
- Fix the issues
- Commit again

**If non-critical issues found:**

- Review doesn't block commit
- Consider addressing issues
- Commit continues

## Three Review Types

1. **Senior Engineer** - Code quality, bugs, edge cases
2. **Security/Red Team** - Vulnerabilities, race conditions
3. **Edge Case** - Boundary conditions, failure scenarios

## Configuration

Requires `GEMINI_API_KEY` environment variable. If missing, review is skipped (graceful degradation).

## Full Documentation

See `docs/PRE_COMMIT_AI_REVIEW_SYSTEM.md` for complete details.
