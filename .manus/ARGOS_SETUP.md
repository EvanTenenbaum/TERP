## 🚨 MANDATORY: READ CLAUDE.md FIRST

> **BEFORE following this guide or doing ANY work:**
>
> **You MUST first read `/CLAUDE.md`** in the repository root.
>
> CLAUDE.md is the **single source of truth** for all TERP development protocols. This document provides Argos setup instructions but does NOT override CLAUDE.md.
>
> **If there are ANY conflicts between CLAUDE.md and this document, CLAUDE.md takes precedence.**

---

# Argos Visual Testing Setup

## What is Argos?

Argos is an automated visual testing tool that captures screenshots of your application during E2E tests and compares them against baseline images to detect visual regressions.

## Integration Status

✅ **Complete** - Argos is fully integrated with TERP's Playwright E2E tests.

## How It Works

1. **During E2E Tests**: When you run Playwright tests, Argos automatically captures screenshots using `argosScreenshot(page, 'screenshot-name')`.
2. **Upload to Argos**: On CI (GitHub Actions), screenshots are automatically uploaded to Argos.
3. **Visual Comparison**: Argos compares new screenshots against the baseline from your main branch.
4. **Review Changes**: You review visual changes in the Argos dashboard and approve or reject them.
5. **Automated with Manus**: Manus can query the Argos API to check build status and report results to you.

## Configuration

### Environment Variable

Add your Argos token to `.env`:

```bash
ARGOS_TOKEN=argos_34b2c3e186f4849c6c401d8964014a201a
```

**Important**: Never commit this token to Git. It's already added to `.gitignore`.

### Playwright Config

The Argos reporter is configured in `playwright.config.ts`:

```typescript
reporter: [
  process.env.CI ? ['dot'] : ['list'],
  ['html'],
  [
    '@argos-ci/playwright/reporter',
    {
      uploadToArgos: !!process.env.CI,
      token: process.env.ARGOS_TOKEN,
    },
  ],
],
```

**Key Points**:
- Screenshots are only uploaded when `process.env.CI` is true (on GitHub Actions).
- Locally, screenshots are saved but not uploaded.
- The token is read from the `ARGOS_TOKEN` environment variable.

### E2E Tests

Use `argosScreenshot()` instead of Playwright's native `page.screenshot()`:

```typescript
import { argosScreenshot } from '@argos-ci/playwright';

test('my test', async ({ page }) => {
  await page.goto('/my-page');
  await argosScreenshot(page, 'my-page-screenshot');
});
```

## Usage

### Local Development

```bash
# Run E2E tests locally (screenshots saved, not uploaded)
pnpm playwright test
```

### CI/CD (GitHub Actions)

When you push to GitHub, the E2E tests run automatically and screenshots are uploaded to Argos.

### Reviewing Changes

1. After a PR is created, Argos will post a comment with a link to the build.
2. Click the link to review visual changes in the Argos dashboard.
3. Approve or reject changes.
4. If approved, the changes become the new baseline.

## Manus Automation

Manus can interact with Argos via the API to:
- Check build status
- Retrieve visual diff results
- Auto-approve builds (if configured)
- Report results to you

This means you don't need to manually check Argos—Manus will notify you of any visual changes that need your attention.

## Pricing

- **Free Tier**: 5,000 screenshots/month (sufficient for TERP initially)
- **Pro Tier**: $100/month for 35,000 screenshots/month

You're currently on the Free tier. Manus will monitor usage and notify you if you're approaching the limit.

## Troubleshooting

### Screenshots not uploading

- Ensure `ARGOS_TOKEN` is set in your CI environment (GitHub Secrets).
- Ensure `process.env.CI` is true in your CI environment.

### Build is "orphan"

- You need a reference build from your main branch. Push to `main` to create the baseline.

### Argos check failing

- Review the Argos dashboard to see which screenshots have visual differences.
- Approve changes if they're intentional, or fix the UI if they're bugs.

## Resources

- [Argos Documentation](https://argos-ci.com/docs)
- [Argos Playwright SDK](https://argos-ci.com/docs/quickstart/playwright)
- [Argos Dashboard](https://app.argos-ci.com/)
