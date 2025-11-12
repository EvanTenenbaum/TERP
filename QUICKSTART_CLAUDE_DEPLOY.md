# Claude Code Auto-Deploy - Quick Start

**Set up once (2 minutes), works forever.**

## Step 1: Get Digital Ocean Token

1. Go to: https://cloud.digitalocean.com/account/api/tokens
2. Generate New Token
3. Name: `Claude Code Monitor`
4. Scopes: **READ only**
5. Copy the token

## Step 2: Add to Shell Config

```bash
echo 'export DIGITALOCEAN_TOKEN="dop_v1_YOUR_TOKEN"' >> ~/.bashrc
source ~/.bashrc
```

(Use `~/.zshrc` if you use zsh)

## Step 3: Verify

```bash
tsx scripts/validate-deployment-setup.ts
```

Should show:
```
✅ DIGITALOCEAN_TOKEN is set
✅ Digital Ocean app auto-discovery works
✅ App ID cached
🎉 All systems ready!
```

## Step 4: Remove GitHub Branch Protection

Go to: https://github.com/EvanTenenbaum/TERP/settings/branches

Delete or edit the `main` branch protection rule to allow direct pushes.

## Done!

Now just tell Claude:
- "Add feature X and deploy it"
- "Fix bug Y and deploy to production"
- "Deploy the current changes"

Claude will:
- ✅ Implement (if needed)
- ✅ Commit
- ✅ Push to main
- ✅ Monitor deployment
- ✅ Auto-fix failures
- ✅ Redeploy until success

**No repeated setup. Works in all future sessions.**

## Full Documentation

See: [docs/CLAUDE_AUTO_DEPLOY.md](docs/CLAUDE_AUTO_DEPLOY.md)

## Troubleshooting

```bash
# Check if token is set
echo $DIGITALOCEAN_TOKEN

# Get setup instructions
tsx scripts/setup-do-token.ts

# Validate everything
tsx scripts/validate-deployment-setup.ts

# Test auto-discovery
tsx scripts/do-auto-discover.ts
```
