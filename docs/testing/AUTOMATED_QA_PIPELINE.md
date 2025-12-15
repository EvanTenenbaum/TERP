# TERP Automated QA Pipeline

**Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Active

## Overview

The TERP Automated QA Pipeline runs E2E tests daily, identifies new failures, automatically creates bug entries in the roadmap, and sends daily reports to Slack.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUTOMATED QA PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ GitHub Action   │───▶│ scripts/         │───▶│ MASTER_ROADMAP   │   │
│  │ (daily 6am UTC) │    │ qa-pipeline.ts   │    │ (adds BUG-XXX)   │   │
│  └─────────────────┘    └──────────────────┘    └──────────────────┘   │
│           │                      │                       │              │
│           ▼                      ▼                       ▼              │
│  ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ Playwright      │    │ qa-results/      │    │ Slack            │   │
│  │ E2E Tests       │    │ (history.json)   │    │ (daily report)   │   │
│  └─────────────────┘    └──────────────────┘    └──────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Daily QA Workflow (`.github/workflows/daily-qa.yml`)

Runs automatically every day at 6:00 AM UTC.

**What it does:**
1. Spins up a MySQL test database
2. Seeds the database with test data
3. Builds and starts the application
4. Runs all E2E tests with Playwright
5. Calls `qa-pipeline.ts` to process results
6. Commits any new bug entries to the roadmap
7. Sends a Slack notification

**Manual trigger:**
```bash
# Via GitHub UI: Actions → Daily QA Pipeline → Run workflow
# Or via GitHub CLI:
gh workflow run daily-qa.yml
```

### 2. QA Pipeline Script (`scripts/qa-pipeline.ts`)

Processes Playwright test results and manages bug tracking.

**Features:**
- Parses Playwright JSON output
- Compares failures to known issues (deduplication)
- Generates BUG-XXX entries for new failures
- Creates prompt files for each bug
- Appends bugs to MASTER_ROADMAP.md
- Sends Slack notifications

**Local usage (for testing):**
```bash
# Run tests and process results
pnpm qa:pipeline:local

# Process existing results file
pnpm qa:pipeline test-results.json
```

### 3. Initial Audit Workflow (`.github/workflows/qa-initial-audit.yml`)

One-time comprehensive audit of the entire application.

**What it does:**
1. Seeds database with FULL test data
2. Runs ALL E2E tests
3. Generates comprehensive audit report
4. Creates bug entries for all failures
5. Creates GitHub issue with summary
6. Sends Slack notification

**How to run:**
```bash
# Via GitHub UI: Actions → Initial QA Deep Dive Audit → Run workflow
# Or via GitHub CLI:
gh workflow run qa-initial-audit.yml
```

### 4. QA Results Storage (`qa-results/`)

Stores historical data for deduplication.

**Files:**
- `history.json` - Known failures and bug mappings
- `latest-report.json` - Most recent run results
- `audit/` - Initial audit reports

## Bug Entry Format

When a new failure is detected, the pipeline creates:

### 1. Roadmap Entry

Added to `docs/roadmaps/MASTER_ROADMAP.md`:

```markdown
### BUG-025: E2E Test Failure - Orders page crashes on empty cart

**Status:** ready
**Priority:** MEDIUM
**Estimate:** 4h
**Module:** `orders-crud.spec.ts`
**Dependencies:** None
**Prompt:** `docs/prompts/BUG-025.md`
**Discovered:** 2025-12-15 (Automated QA Pipeline)

**Problem:** E2E test "should display empty cart message" is failing.

**Error:** `Expected element to be visible but it was not found`

**Objectives:**
- Investigate the root cause of the test failure
- Fix the underlying bug in the application code
- Verify the test passes after the fix

**Deliverables:**
- [ ] Root cause identified and documented
- [ ] Bug fix implemented
- [ ] Test passes consistently (run 3x)
- [ ] No new TypeScript errors
- [ ] Related tests still pass
- [ ] Code reviewed and merged
```

### 2. Prompt File

Created at `docs/prompts/BUG-025.md` with:
- Full error details
- Stack trace
- Investigation steps
- Acceptance criteria

## Slack Notifications

Daily reports are sent to Slack with:

```
🔍 TERP Daily QA Report - Dec 15, 2025

📊 Test Results:
• Passed: 47/50 (94%)
• Failed: 3
• Skipped: 0
• Flaky: 0
• Duration: 4m

🆕 NEW BUGS FOUND (2):
• `BUG-025`: Orders page crashes on empty cart...
  └─ `tests-e2e/orders-crud.spec.ts`
• `BUG-026`: Client search returns 404...
  └─ `tests-e2e/clients-crud.spec.ts`

📋 Added to roadmap: `MASTER_ROADMAP.md`

🔗 View Full Report
```

## Configuration

### Required Secrets

Add these to your GitHub repository secrets:

| Secret | Description |
|--------|-------------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL for notifications |

### Setting up Slack Webhook

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app or use existing
3. Enable "Incoming Webhooks"
4. Create a webhook for your channel
5. Copy the webhook URL
6. Add to GitHub Secrets as `SLACK_WEBHOOK_URL`

## Deduplication Logic

The pipeline tracks known failures to avoid creating duplicate bugs:

1. Each failure is hashed based on: `specFile + suiteName + testName`
2. Hash is stored in `qa-results/history.json`
3. On each run, new failures are compared to known hashes
4. Only truly NEW failures create bug entries
5. Known failures are reported but not re-added

## Workflow Schedule

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| Daily QA | 6:00 AM UTC daily | Ongoing regression detection |
| Initial Audit | Manual trigger | One-time comprehensive audit |

## Troubleshooting

### Tests not running

Check:
- MySQL service is healthy
- Dependencies installed correctly
- Application builds successfully

### Slack notifications not sending

Check:
- `SLACK_WEBHOOK_URL` secret is set
- Webhook URL is valid
- Slack app has correct permissions

### Duplicate bugs being created

Check:
- `qa-results/history.json` exists and is committed
- Hash function is consistent
- Test names haven't changed

### Pipeline fails but tests passed

Check:
- `test-results.json` was generated
- JSON format is valid
- Pipeline script has no TypeScript errors

## Maintenance

### Clearing Known Failures

To reset the known failures list (e.g., after major refactor):

```bash
# Edit qa-results/history.json
{
  "lastRun": "",
  "knownFailures": [],
  "bugMappings": {}
}
```

### Updating Bug Priority

By default, all auto-generated bugs are `MEDIUM` priority. To change:

1. Edit `scripts/qa-pipeline.ts`
2. Modify the `generateBugEntry()` function
3. Commit and push

## Related Documentation

- [Playwright AI Agents Guide](./ai-agents-guide.md)
- [TERP Testing Best Practices](./TERP_TESTING_BEST_PRACTICES.md)
- [E2E Test Structure](../../tests-e2e/README.md)

---

**The QA Pipeline runs automatically. Just push code and let it find bugs for you!**
