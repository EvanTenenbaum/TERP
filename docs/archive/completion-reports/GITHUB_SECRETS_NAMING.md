# GitHub Secrets Naming Restriction

## Important: Secret Names Cannot Start with "github"

GitHub has a restriction that **repository secrets cannot start with the prefix "github"**.

## Fix Applied

The webhook secret has been renamed:

### Old Name (Doesn't Work in GitHub Secrets)

- ❌ `GITHUB_WEBHOOK_SECRET`

### New Name (Works in GitHub Secrets)

- ✅ `WEBHOOK_SECRET`

## Code Update

The code has been updated to accept both names (for backwards compatibility):

```typescript
// server/webhooks/github.ts
const webhookSecret =
  process.env.WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
```

This means:

- ✅ Use `WEBHOOK_SECRET` in GitHub Secrets (new, works)
- ✅ Code still accepts old `GITHUB_WEBHOOK_SECRET` if set elsewhere

## What to Do

When adding secrets to GitHub Secrets:

1. **Add as:** `WEBHOOK_SECRET` (not `GITHUB_WEBHOOK_SECRET`)
2. **Value:** Same value as before
3. **Code:** Automatically handles both names

## Other Secrets

All other secrets are fine as-is:

- ✅ `JWT_SECRET` - OK
- ✅ `CLERK_SECRET_KEY` - OK
- ✅ `DATABASE_URL` - OK
- ✅ `SLACK_BOT_TOKEN` - OK
- ❌ `GITHUB_TOKEN` - This might also be restricted! Check if you get an error.

If `GITHUB_TOKEN` also fails, rename it to `GH_TOKEN` or `REPO_TOKEN`.
