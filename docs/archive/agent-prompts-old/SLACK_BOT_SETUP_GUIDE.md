# Slack Bot Setup Guide - TERP Commander

## Overview

The TERP Commander bot uses **Socket Mode**, which means it connects to Slack via WebSocket instead of requiring a public HTTP endpoint. This simplifies deployment but requires specific Slack app configuration.

## Prerequisites

- Access to your Slack workspace (admin permissions recommended)
- Slack API account: https://api.slack.com

---

## Step-by-Step Setup

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Select **"From scratch"**
4. Enter app details:
   - **App Name:** `TERP Commander` (or your preferred name)
   - **Pick a workspace:** Select your workspace
5. Click **"Create App"**

---

### Step 2: Enable Socket Mode

**CRITICAL:** The bot requires Socket Mode to work.

1. In your app settings, go to **"Socket Mode"** (left sidebar)
2. Toggle **"Enable Socket Mode"** to **ON**
3. Click **"Generate Token"** under "App-Level Tokens"
4. Create a token with:
   - **Name:** `TERP Commander Socket Token`
   - **Scopes:** `connections:write` (required for Socket Mode)
5. **Copy the token** - This is your `SLACK_APP_TOKEN` (starts with `xapp-`)
   - ⚠️ **Save this immediately** - you won't see it again!

---

### Step 3: Configure Bot Token Scopes

The bot needs specific permissions to function:

1. Go to **"OAuth & Permissions"** (left sidebar)
2. Scroll to **"Bot Token Scopes"**
3. Add the following scopes:

#### Required Scopes:

- `app_mentions:read` - Read messages where bot is mentioned
- `chat:write` - Send messages to channels and DMs
- `channels:history` - Read messages in public channels
- `im:history` - Read direct messages
- `mpim:history` - Read group direct messages
- `users:read` - Read user profile information

#### Optional (but recommended):

- `channels:read` - List public channels
- `groups:read` - List private channels
- `im:read` - List direct message conversations

4. **Save Changes**

---

### Step 4: Install App to Workspace

1. Still in **"OAuth & Permissions"**, scroll to the top
2. Click **"Install to Workspace"**
3. Review the permissions requested
4. Click **"Allow"** to authorize
5. **Copy the Bot User OAuth Token** - This is your `SLACK_BOT_TOKEN` (starts with `xoxb-`)
   - ⚠️ **Save this immediately** - you'll need it for deployment!

---

### Step 5: Configure Event Subscriptions (Optional)

**Note:** For Socket Mode, event subscriptions are optional. The bot can listen to messages without them, but enabling them provides better reliability.

1. Go to **"Event Subscriptions"** (left sidebar)
2. Toggle **"Enable Events"** to **ON**
3. Under **"Subscribe to bot events"**, add:
   - `message.channels` - Messages in public channels
   - `message.im` - Direct messages
   - `message.mpim` - Group direct messages
   - `app_mention` - When bot is mentioned
4. **Save Changes**

**Note:** With Socket Mode, you don't need to provide a Request URL. Socket Mode handles the connection automatically.

---

### Step 6: Invite Bot to Channels

The bot needs to be invited to channels where you want it to respond:

1. In Slack, go to the channel where you want the bot
2. Type `/invite @TERP Commander` (or your bot's name)
3. The bot will join the channel

**Alternative:** The bot can also respond in DMs without being invited.

---

## Environment Variables

After setup, you'll have two tokens:

### 1. Bot User OAuth Token (`SLACK_BOT_TOKEN`)

- **Format:** `xoxb-...`
- **Where to find:** OAuth & Permissions → Bot User OAuth Token
- **Purpose:** Authenticates the bot to Slack API

### 2. App-Level Token (`SLACK_APP_TOKEN`)

- **Format:** `xapp-...`
- **Where to find:** Socket Mode → App-Level Tokens
- **Purpose:** Enables Socket Mode connection
- **Scope:** Must have `connections:write`

---

## Verification Checklist

Before deploying, verify:

- [ ] Socket Mode is enabled
- [ ] App-Level Token created with `connections:write` scope
- [ ] Bot Token Scopes include all required permissions
- [ ] App installed to workspace
- [ ] Bot User OAuth Token copied
- [ ] Bot invited to test channel (optional)

---

## Testing the Bot

### Local Testing (Before Deployment)

1. Set environment variables:

   ```bash
   export SLACK_BOT_TOKEN=xoxb-your-bot-token
   export SLACK_APP_TOKEN=xapp-your-app-token
   export GITHUB_TOKEN=your-github-token
   export GEMINI_API_KEY=your-gemini-key
   ```

2. Run the bot:

   ```bash
   npx tsx scripts/slack-bot.ts
   ```

3. Expected output:

   ```
   🔧 Verifying Git Remote...
   ✅ Git remote configured.
   ⚡️ TERP Commander is running in Socket Mode!
   🔑 Debug - Bot Token starts with: xoxb-
   🔑 Debug - App Token starts with: xapp-
   ```

4. Test in Slack:
   - Send a message containing "status" in a channel or DM
   - Bot should respond: "👀 I hear you! Checking status..."

### Production Testing

After deployment:

1. Check DigitalOcean logs for successful startup
2. Send test message in Slack
3. Verify bot responds correctly

---

## Troubleshooting

### Bot doesn't respond

**Check:**

1. Socket Mode is enabled in Slack app settings
2. App-Level Token has `connections:write` scope
3. Bot Token has `chat:write` scope
4. Bot is invited to the channel (for channel messages)
5. Check DigitalOcean logs for errors

### "Invalid token" error

**Check:**

1. Bot Token starts with `xoxb-`
2. App Token starts with `xapp-`
3. Tokens are copied correctly (no extra spaces)
4. App is installed to workspace

### Bot can't read messages

**Check:**

1. Bot Token has `channels:history` scope
2. Bot Token has `im:history` scope
3. Bot is invited to the channel
4. Event Subscriptions are enabled (optional but recommended)

### Socket Mode connection fails

**Check:**

1. App-Level Token exists and has `connections:write` scope
2. Socket Mode is enabled in app settings
3. No firewall blocking WebSocket connections
4. Check DigitalOcean logs for connection errors

---

## Security Best Practices

1. **Never commit tokens to git** - Use environment variables
2. **Rotate tokens regularly** - Regenerate if compromised
3. **Use least privilege** - Only grant necessary scopes
4. **Monitor bot activity** - Check Slack app analytics
5. **Secure token storage** - Use DigitalOcean secrets management

---

## Current Configuration

Based on the bot code, here's what's configured:

### Bot Capabilities:

- ✅ Listens to messages containing "status" → Runs `manager.ts status`
- ✅ Listens to messages containing "execute" or "fix" → Runs `manager.ts execute --recursive`
- ✅ Responds in channels and DMs
- ✅ Uses Socket Mode (no public endpoint needed)

### Required Tokens:

- `SLACK_BOT_TOKEN` - Bot User OAuth Token
- `SLACK_APP_TOKEN` - App-Level Token (Socket Mode)
- `GITHUB_TOKEN` - For git operations
- `GEMINI_API_KEY` - For AI agent execution

---

## Next Steps

1. Complete Slack app setup (Steps 1-6 above)
2. Copy tokens to DigitalOcean environment variables
3. Deploy the bot (already configured in `new_spec.yaml`)
4. Test bot functionality
5. Monitor logs for any issues

---

## References

- [Slack Socket Mode Documentation](https://api.slack.com/apis/connections/socket)
- [Slack Bolt Framework](https://slack.dev/bolt-js/concepts)
- [Slack App Management](https://api.slack.com/apps)
