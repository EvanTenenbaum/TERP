# TERP AI Slack Bot Setup

## 🤖 Natural Language Slack Bot with Full Context

This bot lets you chat naturally with an AI assistant that has **complete knowledge** of your TERP project, just like talking to Kiro.

---

## Features

✅ **Natural Language** - No commands, just chat  
✅ **Full Context** - All steering files, roadmap, sessions loaded automatically  
✅ **Mobile Friendly** - Perfect for phone use  
✅ **Real-time Updates** - Always has latest project state  
✅ **Conversational** - Ask questions, get guidance, make decisions

---

## What Gets Loaded Automatically

Every time you message the bot, it loads:

1. **All Steering Files**
   - `00-core-identity.md`
   - `01-development-standards.md`
   - `02-workflows.md`
   - `03-agent-coordination.md`
   - `04-infrastructure.md`
   - `99-pre-commit-checklist.md`
   - `terp-master-protocol.md`

2. **Current Roadmap**
   - Task statuses
   - Priorities
   - Progress

3. **Active Sessions**
   - What agents are working on
   - Current progress

4. **Initiatives**
   - Beta Readiness plan
   - Current phase

5. **Recent Activity**
   - Last 5 git commits
   - Recent changes

6. **Project Stats**
   - Progress percentage
   - Task breakdown

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @anthropic-ai/sdk
```

### 2. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Create account or sign in
3. Generate API key
4. Copy the key

### 3. Add to Environment Variables

Add to your `.env` file:

```bash
# Anthropic API (for AI Slack bot)
ANTHROPIC_API_KEY=sk-ant-...

# Slack credentials (you already have these)
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
```

### 4. Update Slack App Permissions

In your Slack app settings (https://api.slack.com/apps):

**OAuth & Permissions** → Add scopes:

- `chat:write`
- `app_mentions:read`
- `im:history`
- `im:read`
- `im:write`

**Event Subscriptions** → Subscribe to:

- `app_mention`
- `message.im`

### 5. Run the Bot

```bash
# Development
npm run slack-bot:ai

# Production (with PM2 or similar)
pm2 start "npm run slack-bot:ai" --name terp-ai-bot
```

---

## Usage Examples

### From Your Phone

**Open Slack → DM the bot:**

```
You: What's the current status?

Bot: TERP is at 45% completion. We have 21 tasks complete,
2 in progress, and 24 ready to start. Currently in Phase 1
of the Beta Readiness initiative - Foundation Audit.

High priority items ready:
• AUDIT-001: Feature Completeness Audit
• DATA-005: Implement Optimistic Locking
• REL-002: Automated Database Backups
```

```
You: Should I work on AUDIT-001 or DATA-005 first?

Bot: Start with AUDIT-001. Here's why:

1. It's Phase 1 of Beta Readiness (current phase)
2. It will give you visibility into what needs to be done
3. Other tasks depend on knowing feature completeness
4. Estimated 8 hours, manageable scope

DATA-005 is important but can wait until you have the
audit results. Want me to explain what AUDIT-001 involves?
```

```
You: Yes, explain AUDIT-001

Bot: AUDIT-001 is a Feature Completeness Audit. You'll:

1. Inventory all frontend pages and components
2. Inventory all backend routers and endpoints
3. Map feature dependencies
4. Assess completion % for each feature
5. Identify critical path features

Deliverables:
- Frontend features inventory
- Backend features inventory
- Feature dependency map
- Completion matrix
- Critical features list

The prompt is in docs/prompts/AUDIT-001-feature-completeness.md

Want me to walk you through the first step?
```

```
You: What did I work on yesterday?

Bot: Based on recent git activity:

- d6e4a45: Added auto-updating visual dashboard system
- 0e0d1cd: Enhanced Slack bot with mobile commands
- 95439f5: Removed public access bypasses (SEC-001)

You've been focused on infrastructure and security.
Great progress on the dashboard - it now updates
automatically on every push!
```

```
You: What should I do next?

Bot: Based on your Beta Readiness plan, next steps:

**This Week (Phase 1):**
1. Start AUDIT-001 (Feature Completeness)
2. Run in parallel: AUDIT-002, AUDIT-003, AUDIT-004
3. Create prioritized fix list

**Quick Win:**
Run the beta readiness setup script:
./scripts/beta-readiness-start.sh

This will verify your environment and set up audit
directories. Takes ~5 minutes.

Want me to explain the full 8-week plan?
```

---

## How It Works

### Context Loading

Every message triggers:

```typescript
1. Load all steering files (protocols, standards, workflows)
2. Load current roadmap (tasks, status, priorities)
3. Load active sessions (what's being worked on)
4. Load initiatives (Beta Readiness plan)
5. Get recent git commits (what changed recently)
6. Calculate project stats (progress, breakdown)
```

### AI Processing

```typescript
1. User message received
2. Full context loaded (~20KB of project knowledge)
3. Sent to Claude with system prompt
4. Claude responds with full project awareness
5. Response sent back to Slack
```

### Mobile Optimization

- Concise responses (mobile-friendly)
- Formatted for readability
- Quick load times
- Works in DMs or channels

---

## Advanced Usage

### In Channels

Mention the bot:

```
@terp-bot what's blocking us from beta launch?
```

### Quick Command

Use slash command:

```
/terp what tasks are ready?
```

### Continuous Conversation

The bot remembers context within a conversation:

```
You: What's AUDIT-001?
Bot: [explains AUDIT-001]

You: How long will it take?
Bot: [knows you're still talking about AUDIT-001]

You: Start it
Bot: [knows to start AUDIT-001]
```

---

## Cost Considerations

**Anthropic Claude Pricing:**

- ~$3 per 1M input tokens
- ~$15 per 1M output tokens

**Typical usage:**

- Each message: ~20K input tokens (context) + 500 output tokens
- Cost per message: ~$0.07
- 100 messages/day: ~$7/day

**Optimization:**

- Context is loaded fresh each time (ensures accuracy)
- Responses are concise (mobile-optimized)
- Can cache steering files to reduce costs

---

## Alternative: Use OpenAI Instead

If you prefer OpenAI, swap the API:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use GPT-4
const response = await openai.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ],
});
```

---

## Troubleshooting

### Bot not responding

1. Check bot is running: `pm2 status`
2. Check API key is set: `echo $ANTHROPIC_API_KEY`
3. Check Slack permissions
4. Check logs: `pm2 logs terp-ai-bot`

### Context not loading

1. Verify steering files exist: `ls .kiro/steering/`
2. Check roadmap exists: `ls docs/roadmaps/`
3. Check file permissions

### API errors

1. Verify API key is valid
2. Check API quota/limits
3. Check network connectivity

---

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start npm --name "terp-ai-bot" -- run slack-bot:ai

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Using Docker

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "slack-bot:ai"]
```

### Using DigitalOcean App Platform

Add to `.do/app.yaml`:

```yaml
workers:
  - name: slack-ai-bot
    source_dir: /
    run_command: npm run slack-bot:ai
    envs:
      - key: ANTHROPIC_API_KEY
        scope: RUN_TIME
        value: ${ANTHROPIC_API_KEY}
      - key: SLACK_BOT_TOKEN
        scope: RUN_TIME
        value: ${SLACK_BOT_TOKEN}
      - key: SLACK_APP_TOKEN
        scope: RUN_TIME
        value: ${SLACK_APP_TOKEN}
```

---

## Security Notes

- API keys stored in environment variables (never committed)
- Bot only responds to authorized Slack workspace
- Context loaded from local files (no external data)
- All communication over HTTPS

---

## Next Steps

1. **Install dependencies**: `npm install`
2. **Add API key** to `.env`
3. **Update Slack permissions**
4. **Run the bot**: `npm run slack-bot:ai`
5. **Test from phone**: DM the bot in Slack

---

**You'll now have a mobile AI assistant with complete project knowledge, just like talking to Kiro!** 🚀
