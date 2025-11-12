# Digital Ocean Setup for Claude Code

## Quick Start

**One command to verify everything:**
```bash
tsx scripts/validate-deployment-setup.ts
```

## First-Time Setup

**Only need to set DIGITALOCEAN_TOKEN once:**

```bash
# 1. Get token from: https://cloud.digitalocean.com/account/api/tokens
# 2. Add to your shell config:
echo 'export DIGITALOCEAN_TOKEN="dop_v1_YOUR_TOKEN"' >> ~/.bashrc
source ~/.bashrc
```

**That's it!** Everything else is automatic:
- ✅ App ID auto-discovered from `app.yaml`
- ✅ Cached in git config for speed
- ✅ Works forever across all sessions

## Files in This Directory

- **app.yaml** - Digital Ocean App Platform configuration
  - Defines build/run commands
  - Sets environment variables
  - Configures health checks
  - Enables Papertrail log forwarding

- **README.md** - Papertrail log forwarding setup
  - How to configure Papertrail
  - Viewing logs
  - Troubleshooting

- **SETUP.md** (this file) - Quick reference for Claude Code integration

## Full Documentation

See: [docs/CLAUDE_AUTO_DEPLOY.md](../docs/CLAUDE_AUTO_DEPLOY.md)

## Troubleshooting

**Token not set?**
```bash
tsx scripts/setup-do-token.ts
```

**Need to re-discover app?**
```bash
git config --local --unset digitalocean.appid
tsx scripts/do-auto-discover.ts
```

**Check everything is ready:**
```bash
tsx scripts/validate-deployment-setup.ts
```
