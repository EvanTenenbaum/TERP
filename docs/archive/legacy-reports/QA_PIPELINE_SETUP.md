# 🤖 TERP Automated QA Pipeline - Setup Complete

## What Was Built

### 1. Daily QA Workflow (`.github/workflows/daily-qa.yml`)
- **Runs:** Every day at 6:00 AM UTC
- **Does:** Runs all E2E tests, finds new failures, creates bugs, sends Slack report
- **Features:** MySQL service, automatic bug deduplication, GitHub issue creation

### 2. Initial Audit Workflow (`.github/workflows/qa-initial-audit.yml`)
- **Runs:** Manual trigger only
- **Does:** Comprehensive one-time audit with full test data
- **Features:** Full database seeding, detailed audit report, Slack notification

### 3. QA Pipeline Script (`scripts/qa-pipeline.ts`)
- Parses Playwright JSON results
- Deduplicates failures (tracks known vs new via hash)
- Generates unique BUG-XXX entries (no duplicates even in same run)
- Updates MASTER_ROADMAP.md with new QA section
- Creates prompt files for each bug
- Sends Slack notifications with rich formatting

### 4. Supporting Files
- `qa-results/` - Stores history and reports
- `docs/testing/AUTOMATED_QA_PIPELINE.md` - Full documentation
- Updated `playwright.config.ts` - JSON reporter + CI-aware webServer config
- Updated `package.json` - New npm scripts

---

## 🚀 How to Activate

### Step 1: Add Slack Webhook Secret

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `SLACK_WEBHOOK_URL`
4. Value: Your Slack incoming webhook URL

**To get a Slack webhook:**
1. Go to https://api.slack.com/apps
2. Create app → From scratch
3. Enable "Incoming Webhooks"
4. Add webhook to your channel
5. Copy the webhook URL

### Step 2: Run Initial Audit (One-Time)

1. Go to GitHub → Actions → "Initial QA Deep Dive Audit"
2. Click "Run workflow"
3. Leave defaults and click "Run workflow"
4. Wait ~30-60 minutes for full audit
5. Check Slack for results

### Step 3: Daily Reports Start Automatically

After setup, you'll receive daily Slack reports at 6:00 AM UTC with:
- Test pass/fail counts
- NEW bugs found (with BUG-XXX IDs)
- Links to full reports

---

## 📊 Sample Daily Report

```
🔍 TERP Daily QA Report - Dec 15, 2025

📊 Test Results:
• Passed: 47/50 (94%)
• Failed: 3
• Skipped: 0
• Duration: 4m

🆕 NEW BUGS FOUND (2):
• `BUG-025`: Orders page crashes on empty cart...
  └─ `tests-e2e/orders-crud.spec.ts`
• `BUG-026`: Client search returns 404...
  └─ `tests-e2e/clients-crud.spec.ts`

📋 Added to roadmap: `MASTER_ROADMAP.md`

🔗 View Full Report
```

---

## 🔧 Manual Commands

```bash
# Run QA pipeline locally (for testing)
pnpm qa:pipeline:local

# Process existing results file
pnpm qa:pipeline test-results.json

# Trigger daily QA manually
gh workflow run daily-qa.yml

# Trigger initial audit
gh workflow run qa-initial-audit.yml
```

---

## 📁 Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `scripts/qa-pipeline.ts` | Created | Main pipeline logic |
| `.github/workflows/daily-qa.yml` | Created | Daily automation |
| `.github/workflows/qa-initial-audit.yml` | Created | One-time audit |
| `qa-results/.gitkeep` | Created | Results directory |
| `docs/testing/AUTOMATED_QA_PIPELINE.md` | Created | Documentation |
| `playwright.config.ts` | Modified | Added JSON reporter |
| `package.json` | Modified | Added npm scripts |
| `.gitignore` | Modified | QA results patterns |

---

## ✅ Next Steps

1. **Add `SLACK_WEBHOOK_URL` secret to GitHub**
2. **Run the Initial Audit workflow**
3. **Review the bugs added to MASTER_ROADMAP.md**
4. **Daily reports will start automatically**

---

**Questions?** See `docs/testing/AUTOMATED_QA_PIPELINE.md` for full documentation.
