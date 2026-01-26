# TERP Commander Slack Bot - QA & Testing Guide

This guide explains how to verify the Slack bot works correctly without manual testing.

## Quick Start

### 1. Run Health Check

Before deployment, run the health check script:

```bash
pnpm slack-bot:health
```

This will verify:

- ✅ Environment variables are set correctly
- ✅ Required dependencies are installed
- ✅ Required files exist
- ✅ Git is configured properly
- ✅ Tests can run

### 2. Run Test Suite

Run the automated test suite:

```bash
pnpm test:slack-bot
```

Or run all tests:

```bash
pnpm test
```

## Health Check Details

The health check script (`scripts/slack-bot-health-check.ts`) validates:

### Environment Variables

- `SLACK_BOT_TOKEN` (required) - Must start with `xoxb-`
- `SLACK_APP_TOKEN` (optional) - Must start with `xapp-`
- `GITHUB_TOKEN` (optional) - Must start with `ghp_`
- `GEMINI_API_KEY` (optional) - Must start with `AIza`
- `DIGITALOCEAN_ACCESS_TOKEN` (optional) - Must start with `dop_v1_`

### Dependencies

- Node.js >= 20
- pnpm installed
- Required npm packages: `@slack/bolt`, `simple-git`, `dotenv`

### File Structure

- `scripts/slack-bot.ts` exists
- `scripts/manager.ts` exists
- `package.json` exists
- `pnpm-lock.yaml` exists

### Git Configuration

- Git is installed
- Repository is initialized
- Remote is configured (warning if not)

## Test Suite

The test suite (`scripts/slack-bot.test.ts`) includes:

### 1. Environment Variable Validation

- Tests that required variables are present
- Validates token formats
- Tests optional variables

### 2. Slack App Configuration

- Verifies App initialization with correct settings
- Tests socket mode is enabled
- Validates log level configuration

### 3. Command Handlers

- Tests status command pattern matching
- Tests execute/fix command pattern matching
- Verifies error handling in command execution

### 4. Git Configuration

- Tests git user email configuration
- Tests git user name configuration
- Tests remote URL with token

### 5. Manager Script Integration

- Tests status command execution
- Tests execute command with --recursive flag

### 6. Error Handling

- Tests missing environment variable handling
- Tests git configuration error handling

### 7. Startup Sequence

- Tests app startup
- Tests debug logging

## CI/CD Integration

### Pre-Deployment Check

Add to your CI/CD pipeline:

```yaml
- name: Health Check
  run: pnpm slack-bot:health

- name: Run Tests
  run: pnpm test:slack-bot
```

### Dockerfile Integration

You can add the health check to your Dockerfile:

```dockerfile
# After installing dependencies
RUN pnpm slack-bot:health || echo "Health check failed but continuing..."
```

## Manual Verification (If Needed)

If automated tests pass but you want to verify manually:

1. **Start the bot locally:**

   ```bash
   npx tsx scripts/slack-bot.ts
   ```

2. **Test in Slack:**
   - Send `status` message - should respond with roadmap status
   - Send `execute` message - should start agent execution
   - Send `fix` message - should start agent execution

3. **Check logs:**
   - Bot should log: "⚡️ TERP Commander is running in Socket Mode!"
   - Should show token previews (first 5 chars)
   - Should show git configuration success

## Troubleshooting

### Health Check Fails

1. **Missing Environment Variables:**
   - Check `.env` file or environment
   - Verify token formats match expected patterns

2. **Missing Dependencies:**

   ```bash
   pnpm install
   ```

3. **Git Not Configured:**
   ```bash
   git config user.email "bot@terp.ai"
   git config user.name "TERP Commander"
   ```

### Tests Fail

1. **Check test output:**

   ```bash
   pnpm test:slack-bot --reporter=verbose
   ```

2. **Run specific test:**

   ```bash
   pnpm test:slack-bot -t "Environment Variable Validation"
   ```

3. **Check mocks:**
   - Ensure `@slack/bolt` is properly mocked
   - Verify `simple-git` mock is working

## Best Practices

1. **Always run health check before deployment**
2. **Run tests in CI/CD pipeline**
3. **Keep test coverage high (>80%)**
4. **Update tests when adding new features**
5. **Document any manual testing steps**

## Related Files

- `scripts/slack-bot.ts` - Main bot implementation
- `scripts/slack-bot.test.ts` - Test suite
- `scripts/slack-bot-health-check.ts` - Health check script
- `scripts/manager.ts` - Swarm manager (used by bot)
