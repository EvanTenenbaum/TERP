# Slack Setup Summary - Quick Reference

## What Needs to Be Done in Slack

### ✅ Already Configured (Based on Your Tokens)
- Bot User OAuth Token: `xoxb-...` (set in environment variables)
- App-Level Token: `xapp-...` (set in environment variables)

### 🔧 Required Slack App Configuration

#### 1. Socket Mode (CRITICAL)
- **Status:** ✅ Likely already enabled (you have app token)
- **Action:** Verify in https://api.slack.com/apps → Your App → Socket Mode
- **Requirement:** Must be ON
- **Token:** App-Level Token with `connections:write` scope

#### 2. Bot Token Scopes (Required Permissions)
Go to: **OAuth & Permissions** → **Bot Token Scopes**

**Required:**
- ✅ `chat:write` - Send messages (bot responds to commands)
- ✅ `channels:history` - Read channel messages (bot listens in channels)
- ✅ `im:history` - Read DMs (bot responds in DMs)
- ✅ `app_mentions:read` - Read mentions (if you want @mentions)

**Recommended:**
- `users:read` - Read user info
- `channels:read` - List channels
- `im:read` - List DM conversations

#### 3. Event Subscriptions (Optional but Recommended)
Go to: **Event Subscriptions**

**If enabled:**
- Subscribe to: `message.channels`, `message.im`, `app_mention`
- **Note:** With Socket Mode, no Request URL needed

#### 4. Install App to Workspace
- **Status:** ✅ Likely already done (you have bot token)
- **Action:** Verify app is installed in your workspace
- **Location:** OAuth & Permissions → "Install to Workspace"

#### 5. Invite Bot to Channels
- **Action:** In Slack, type `/invite @TERP Commander` in channels where you want the bot
- **Note:** Bot can respond in DMs without invitation

---

## Bot Commands

The bot responds to messages containing:

1. **"status"** → Runs `manager.ts status`
   - Example: "check status" or "what's the status?"

2. **"execute"** or **"fix"** → Runs `manager.ts execute --recursive`
   - Example: "execute tasks" or "fix bugs"

---

## Verification Steps

### 1. Check Socket Mode
```
✅ Go to: https://api.slack.com/apps → Your App → Socket Mode
✅ Verify: "Enable Socket Mode" is ON
✅ Verify: App-Level Token exists with connections:write scope
```

### 2. Check Bot Scopes
```
✅ Go to: OAuth & Permissions → Bot Token Scopes
✅ Verify: chat:write is present
✅ Verify: channels:history is present
✅ Verify: im:history is present
```

### 3. Test Bot Connection
```
✅ After deployment, check DigitalOcean logs
✅ Look for: "⚡️ TERP Commander is running in Socket Mode!"
✅ Send test message in Slack: "status"
✅ Bot should respond
```

---

## Common Issues

### Bot doesn't respond
- ❌ Socket Mode not enabled → Enable it
- ❌ Missing `chat:write` scope → Add it
- ❌ Bot not invited to channel → Invite it
- ❌ Check DigitalOcean logs for errors

### "Invalid token" error
- ❌ Wrong token format → Verify tokens start with xoxb- and xapp-
- ❌ Token copied incorrectly → Re-copy from Slack
- ❌ App not installed → Reinstall to workspace

### Bot can't read messages
- ❌ Missing `channels:history` scope → Add it
- ❌ Missing `im:history` scope → Add it
- ❌ Bot not in channel → Invite it

---

## Quick Checklist

Before testing:
- [ ] Socket Mode enabled
- [ ] App-Level Token created (xapp-...)
- [ ] Bot Token Scopes configured
- [ ] App installed to workspace
- [ ] Bot invited to test channel (optional)
- [ ] Environment variables set in DigitalOcean
- [ ] Bot deployed and running

---

## Next Steps

1. **Verify Slack App Configuration** (5 minutes)
   - Check Socket Mode is ON
   - Verify Bot Token Scopes
   - Confirm app is installed

2. **Test Bot Locally** (optional, 2 minutes)
   ```bash
   export SLACK_BOT_TOKEN=xoxb-...
   export SLACK_APP_TOKEN=xapp-...
   npx tsx scripts/slack-bot.ts
   ```

3. **Deploy and Test** (already in progress)
   - Bot is deploying to DigitalOcean
   - Once active, test with "status" command

4. **Monitor Logs**
   - Check DigitalOcean logs for startup
   - Verify bot connects to Slack
   - Test commands in Slack

---

## Full Documentation

See `docs/SLACK_BOT_SETUP_GUIDE.md` for complete setup instructions.

