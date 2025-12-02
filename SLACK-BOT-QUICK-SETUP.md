# Slack AI Bot - Quick Setup

## ✅ Step 1: Gemini API Key (DONE!)
Your Gemini API key is already configured.

## 🔧 Step 2: Slack App Setup

### Create Slack App (5 minutes)

1. **Go to Slack API**: https://api.slack.com/apps
2. **Create New App** → "From scratch"
3. **Name**: "TERP AI Assistant"
4. **Workspace**: Select your workspace

### Configure Bot Token

1. **OAuth & Permissions** (left sidebar)
2. **Scopes** → Add these Bot Token Scopes:
   - `app_mentions:read`
   - `chat:write`
   - `im:history`
   - `im:read`
   - `im:write`
   - `channels:history` (optional, for channel messages)
   
3. **Install to Workspace** (top of page)
4. **Copy Bot User OAuth Token** (starts with `xoxb-`)

### Enable Socket Mode

1. **Socket Mode** (left sidebar)
2. **Enable Socket Mode** → Toggle ON
3. **Generate App-Level Token**:
   - Name: "TERP Socket Token"
   - Scope: `connections:write`
4. **Copy App-Level Token** (starts with `xapp-`)

### Subscribe to Events

1. **Event Subscriptions** (left sidebar)
2. **Enable Events** → Toggle ON
3. **Subscribe to bot events**:
   - `app_mention`
   - `message.im`

### Save Tokens

Add to your `.env` file:

```bash
# Slack Bot Tokens
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here

# Gemini API (already added)
GEMINI_API_KEY=AIzaSyBWV3IX6_7bCHi-e2crJIRSPC1zC_QtD7c
```

## 🚀 Step 3: Run the Bot

```bash
npm run slack-bot:ai
```

You should see:
```
⚡️ TERP AI Assistant is running!
🤖 Natural language interface enabled
📚 All steering files loaded as context
💬 Users can chat naturally via DM or @mention
```

## 📱 Step 4: Test from Phone

1. Open Slack app on your phone
2. Find "TERP AI Assistant" in Apps
3. Send a DM: "What's the current status?"
4. Get a response with full project context!

## 💬 Example Conversations

```
You: status
Bot: TERP is at 45% completion. 21 tasks complete, 
2 in progress, 24 ready. Currently in Phase 1 of 
Beta Readiness - Foundation Audit.
```

```
You: what should i work on next?
Bot: Start with AUDIT-001 (Feature Completeness Audit). 
It's Phase 1 of your Beta Readiness plan...
```

```
You: explain the beta readiness plan
Bot: [Full explanation with all 6 phases]
```

## 🎯 What the Bot Knows

Every message automatically loads:
- ✅ All steering files (protocols, standards, workflows)
- ✅ Current roadmap (all tasks and statuses)
- ✅ Active sessions (what's being worked on)
- ✅ Beta readiness initiative
- ✅ Recent git commits
- ✅ Project statistics

## 💰 Cost

**Gemini 2.0 Flash:**
- FREE tier: 1,500 requests/day
- After free tier: ~$0.01 per message
- Much cheaper than Claude!

## 🐛 Troubleshooting

### Bot not responding
```bash
# Check if running
ps aux | grep slack-bot-ai

# Check logs
npm run slack-bot:ai
# Look for errors
```

### "GEMINI_API_KEY not found"
```bash
# Verify in .env
grep GEMINI_API_KEY .env
```

### "SLACK_BOT_TOKEN not found"
```bash
# Add to .env
echo "SLACK_BOT_TOKEN=xoxb-your-token" >> .env
echo "SLACK_APP_TOKEN=xapp-your-token" >> .env
```

## 🚀 Production Deployment

### Option 1: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start npm --name "terp-ai" -- run slack-bot:ai
pm2 save
pm2 startup
```

### Option 2: DigitalOcean
Add to `.do/app.yaml`:
```yaml
workers:
  - name: slack-ai-bot
    run_command: npm run slack-bot:ai
    envs:
      - key: GEMINI_API_KEY
      - key: SLACK_BOT_TOKEN
      - key: SLACK_APP_TOKEN
```

## ✅ Next Steps

1. **Get Slack tokens** (5 minutes)
2. **Add to .env**
3. **Run bot**: `npm run slack-bot:ai`
4. **Test from phone**
5. **Deploy to production** (optional)

---

**You'll have a mobile AI assistant with complete project knowledge in 10 minutes!** 🎉
