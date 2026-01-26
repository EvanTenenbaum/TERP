# Adding Secrets to GitHub Secrets Remotely

## Important: Secrets Are Permanent!

**Once you add secrets to GitHub Secrets, they're stored permanently!** You only need to add them **once**, and then they're available forever to all agents and workflows.

## Problem

You need to add secrets to GitHub Secrets, but:

- Your local machine may not be running
- You're working from a different machine
- You need agents to add secrets programmatically

## Solutions

### ✅ Option 1: GitHub Actions Workflow (Easiest - Browser Based)

**Works from:** Any browser, any device, anywhere

1. **Go to workflow:**

   ```
   https://github.com/EvanTenenbaum/TERP/actions/workflows/add-secrets.yml
   ```

2. **Click "Run workflow"**

3. **Fill in secrets:**
   - All inputs are masked (secure)
   - Fill in only the secrets you want to add
   - Leave others empty if not needed

4. **Run it!**

**Via GitHub CLI (from any machine):**

```bash
gh workflow run "Add Secrets to GitHub Secrets" \
  -f jwt_secret="Ul/Ynqm7joZMzI4pTm+giIjfu+TF6MUUUqL020FNq2M=" \
  -f clerk_secret_key="sk_test_hKkReKzBqyATAw1zFZCG1sfSqhIAkDU9ANZvfzsWgk" \
  -f database_url="mysql://..." \
  -f github_webhook_secret="002ec87aebd20ce58a5a42a26818d659d2fa721022ebee550728fc6d160cfe51"
```

### ✅ Option 2: Environment Variables Script (Remote Server)

**Works from:** Any machine with GitHub CLI and environment variables

```bash
# Set environment variables (can be done via remote SSH, CI/CD, etc.)
export JWT_SECRET="your-secret"
export CLERK_SECRET_KEY="your-key"
export DATABASE_URL="your-db-url"
export SLACK_BOT_TOKEN="your-slack-token"
export GEMINI_API_KEY="your-gemini-key"
# ... set all secrets as needed

# Run script (reads from environment)
./scripts/add-secrets-remote.sh
```

**Example - From remote server:**

```bash
ssh user@remote-server
cd /path/to/TERP
export JWT_SECRET="secret-value"
./scripts/add-secrets-remote.sh
```

**Example - From CI/CD:**

```yaml
- name: Add secrets to GitHub
  env:
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
    CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
  run: ./scripts/add-secrets-remote.sh
```

### ✅ Option 3: Direct GitHub CLI (Any Machine with gh)

**Works from:** Any machine with GitHub CLI authenticated

```bash
# Authenticate (if not already)
gh auth login

# Add secrets one by one
echo "secret-value" | gh secret set JWT_SECRET --body-file /dev/stdin --repo EvanTenenbaum/TERP
echo "another-secret" | gh secret set CLERK_SECRET_KEY --body-file /dev/stdin --repo EvanTenenbaum/TERP
# ... repeat for each secret
```

## All Secrets You May Need

### Service Secrets (5)

- `JWT_SECRET`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `GITHUB_WEBHOOK_SECRET`

### Monitoring Secrets (3)

- `SOLARWINDS_TOKEN`
- `SENTRY_DSN`
- `VITE_SENTRY_DSN`

### Worker Secrets (5)

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `GITHUB_TOKEN`
- `GEMINI_API_KEY`
- `DIGITALOCEAN_TOKEN` (and `DIGITALOCEAN_ACCESS_TOKEN`)

## For Agents

Agents can add secrets by:

1. **Using GitHub Actions** (easiest):

   ```bash
   gh workflow run "Add Secrets to GitHub Secrets" -f secret_name="value"
   ```

2. **Setting environment variables and running script**:

   ```bash
   export SECRET_NAME="value"
   ./scripts/add-secrets-remote.sh
   ```

3. **Direct GitHub CLI**:
   ```bash
   echo "secret" | gh secret set SECRET_NAME --body-file /dev/stdin --repo EvanTenenbaum/TERP
   ```

## Verification

After adding secrets, verify they're set:

```bash
gh secret list --repo EvanTenenbaum/TERP
```

Or check in GitHub:
https://github.com/EvanTenenbaum/TERP/settings/secrets/actions

## Next Steps

Once secrets are added, sync them to DigitalOcean:

```bash
gh workflow run "Set Secrets to DigitalOcean"
```
