# 🤖 Nightly QA Bot - IMPLEMENTED

> **Status: ✅ IMPLEMENTED** - December 17, 2025

## Overview

An automated system that:

1. **Every night at 2 AM UTC** - Runs full Mega QA (E2E + property tests + contracts)
2. **Produces report** - Detailed analysis of all failures
3. **Delivers to Slack** - Via the AI bot with interactive buttons
4. **Bug staging** - Bugs are staged for your approval (not auto-added to roadmap)
5. **Morning summary at 8 AM UTC** - Daily priorities + yesterday's work + in-progress items

---

## Quick Reference

### Slack Commands

| Say This              | What Happens                        |
| --------------------- | ----------------------------------- |
| `pending`             | Show pending bugs awaiting approval |
| `approve all`         | Add all pending bugs to roadmap     |
| `approve PENDING-xxx` | Approve specific bug                |
| `dismiss PENDING-xxx` | Dismiss a bug                       |
| `priorities`          | Show today's HIGH priority tasks    |
| `summary`             | Get daily project summary           |

### Interactive Buttons

When you receive the nightly QA report, you'll see buttons:

- **✅ Approve All** - Adds all bugs to roadmap, commits, pushes to GitHub
- **👀 Review Details** - Shows more info about each bug
- **❌ Dismiss All** - Marks all bugs as dismissed (won't be added)

---

## Schedule

| Time (UTC)   | Event                                         |
| ------------ | --------------------------------------------- |
| **2:00 AM**  | Nightly Mega QA runs                          |
| **~2:30 AM** | QA Report sent to Slack with approval buttons |
| **8:00 AM**  | Morning summary sent                          |

---

## What Gets Tested (Mega QA)

| Suite          | Tests | Purpose                      |
| -------------- | ----- | ---------------------------- |
| Must-Hit       | 18    | Deterministic critical paths |
| Journeys       | 100   | Randomized user scenarios    |
| Accessibility  | 12    | WCAG compliance              |
| Performance    | 9     | Page load budgets            |
| Resilience     | 6     | Network error handling       |
| Security       | 10    | Auth, RBAC, XSS              |
| Concurrency    | 6     | Race conditions              |
| Visual         | 14    | Regression snapshots         |
| Property-Based | 231   | Business logic invariants    |
| Contract       | 5     | API schema validation        |

---

## Files Created/Modified

| File                                    | Purpose                                  |
| --------------------------------------- | ---------------------------------------- |
| `.github/workflows/daily-qa.yml`        | Nightly Mega QA workflow (2 AM UTC)      |
| `.github/workflows/morning-summary.yml` | Morning briefing (8 AM UTC)              |
| `scripts/qa/stage-pending-bugs.ts`      | Stages bugs for approval                 |
| `scripts/qa/send-interactive-report.ts` | Sends rich Slack message with buttons    |
| `scripts/qa/send-morning-summary.ts`    | Generates morning briefing               |
| `scripts/slack-bot-ai.ts`               | Enhanced with action handlers & commands |
| `qa-results/pending-bugs.json`          | Staged bugs (auto-generated)             |

---

## Required Secrets (Already Configured)

| Secret              | Purpose                          |
| ------------------- | -------------------------------- |
| `SLACK_WEBHOOK_URL` | Fallback for notifications       |
| `SLACK_BOT_TOKEN`   | Bot API for interactive messages |
| `SLACK_APP_TOKEN`   | Socket mode for real-time events |
| `SLACK_CHANNEL_ID`  | Where to send reports            |
| `GEMINI_API_KEY`    | AI-powered responses             |

---

## Manual Triggers

You can trigger either workflow manually from GitHub Actions:

```bash
# Trigger nightly QA manually
gh workflow run "Nightly Mega QA Pipeline"

# Trigger morning summary manually
gh workflow run "Morning Summary"
```

Or in Slack:

```
@terp run mega qa
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (2 AM UTC)                     │
│  ┌────────────┐    ┌─────────────┐    ┌──────────────────────┐  │
│  │ Mega QA    │ →  │ Stage Bugs  │ →  │ pending-bugs.json    │  │
│  │ E2E+Prop+  │    │ For Review  │    │ (not roadmap yet)    │  │
│  │ Contracts  │    │             │    │                      │  │
│  └────────────┘    └─────────────┘    └──────────────────────┘  │
│                                                   │              │
│                                                   ▼              │
│                                       ┌──────────────────────┐  │
│                                       │ Send Interactive     │  │
│                                       │ Slack Report         │  │
│                                       └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        YOU (via Slack)                           │
│                                                                  │
│  📱 Receive notification on your phone                          │
│                                                                  │
│  [✅ Approve All] → Bot adds bugs to roadmap, commits, pushes   │
│  [👀 Review]      → Bot shows detailed bug list                 │
│  [❌ Dismiss All] → Bot marks bugs as dismissed                 │
│                                                                  │
│  Or type: "approve PENDING-001" to approve individually         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions (8 AM UTC)                     │
│                                                                  │
│  Morning Summary sent with:                                      │
│  • 🎯 Today's priorities (HIGH ready tasks)                     │
│  • 🔄 Work in progress                                          │
│  • 🔥 Recent commits                                            │
│  • ⚠️ Pending bugs reminder                                     │
│  • 📊 Overall project stats                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Buttons don't work

- Ensure `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` are set
- Webhook-only mode doesn't support interactive buttons

### Bot doesn't respond

- Check if the Slack bot is running: `doctl apps logs [APP_ID]`
- Verify socket mode is enabled in Slack App settings

### No morning summary

- Check the `morning-summary.yml` workflow runs in GitHub Actions
- Verify timezone - times are in UTC

---

_Last Updated: December 17, 2025_
