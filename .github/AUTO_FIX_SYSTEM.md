# 🤖 Autonomous PR Auto-Fix System

This document describes the autonomous monitoring and auto-fix system for TERP pull requests.

## Overview

The auto-fix system automatically monitors all PRs and fixes common issues without manual intervention:

✅ **Merge conflicts** - Intelligently resolves conflicts with main
✅ **Code formatting** - Auto-formats code to match project standards
✅ **Linting issues** - Fixes auto-fixable linting problems
✅ **Prohibited patterns** - Detects (and warns about) TODO, FIXME, console.log, etc.
✅ **Type checking** - Runs TypeScript checks
✅ **Status reporting** - Posts detailed status comments on PRs

## How It Works

### Automatic Triggers

The system activates automatically when:
1. A PR is opened
2. New commits are pushed to a PR branch
3. A PR is reopened

### Manual Trigger

You can also manually trigger the workflow:
```bash
gh workflow run pr-auto-fix.yml -f pr_number=<PR_NUMBER>
```

## Auto-Resolution Strategies

### 1. Merge Conflict Resolution (`scripts/auto-resolve-conflicts.sh`)

The script uses intelligent strategies to resolve conflicts:

#### Documentation Files (.md)
- **AGENT_ONBOARDING.md**: Uses pre-merged version that combines both changes
- **QA/Template files**: If both versions are complete, uses our version (newer)
- **Nearly identical files**: If only timestamps/metadata differ, uses our version

#### Config Files (.husky/, scripts/)
- **Pre-commit hooks**: If our version is additive (contains all of theirs), uses ours
- **Scripts**: Prefers our version if it's a superset of theirs

#### GitHub Templates
- **Issue/PR templates**: If both are complete YAML templates, uses our version (newer)

### 2. Code Quality Auto-Fixes

- **Formatting**: Runs `pnpm run format` to auto-format code
- **Linting**: Runs `pnpm run lint:fix` to auto-fix linting issues
- **Type checking**: Validates but doesn't auto-fix (requires manual intervention)

### 3. Pattern Detection

Blocks PRs that contain prohibited patterns:
- `TODO:` or `FIXME:` comments
- `console.log()` statements
- `@ts-ignore` directives
- `placeholder`, `stub`, `coming soon`, `will go here` text

## Workflow Steps

1. **Checkout PR branch** - Gets latest code from PR
2. **Install dependencies** - Sets up Node.js and pnpm
3. **Check for conflicts** - Attempts merge with main
4. **Auto-resolve conflicts** - Runs intelligent resolution script
5. **Type check** - Validates TypeScript compilation
6. **Lint & format** - Auto-fixes code style issues
7. **Pattern detection** - Scans for prohibited patterns
8. **Commit fixes** - Creates commit with auto-fixes
9. **Push changes** - Pushes back to PR branch (with retry logic)
10. **Post status** - Comments on PR with results

## Monitoring the System

### PR Comments

The system posts (and updates) a comment on each PR with status:

```markdown
## 🤖 PR Auto-Fix Status

✅ **Auto-fixes applied and pushed**

### Checks:
✅ Merge conflicts auto-resolved
✅ Type check passed
✅ Linting passed
✅ No prohibited patterns

✅ **All automated checks passed!**
```

Or if issues remain:

```markdown
## 🤖 PR Auto-Fix Status

### Checks:
⬜ No merge conflicts
❌ Type check failed
⚠️ Linting issues found
❌ Prohibited patterns found

### ⚠️ Action Required:
- Fix TypeScript errors: Run `pnpm check` locally
- Remove prohibited patterns (TODO, FIXME, console.log, etc.)
```

### GitHub Actions Tab

View detailed logs:
1. Go to `Actions` tab in GitHub
2. Select `PR Auto-Fix & Monitor` workflow
3. Click on the run for your PR
4. Expand steps to see detailed logs

### Local Testing

Test the conflict resolution script locally:

```bash
# Start a merge/rebase to create conflicts
git fetch origin main
git rebase origin/main

# If conflicts occur, run the script
./scripts/auto-resolve-conflicts.sh

# Continue the rebase
git rebase --continue
```

## What Requires Manual Intervention

The system **cannot** auto-fix:

❌ **TypeScript errors** - Requires understanding of types and logic
❌ **Complex merge conflicts** - When files have been heavily modified in both branches
❌ **Failing tests** - Requires understanding test failures
❌ **Breaking changes** - Requires design decisions
❌ **Security issues** - Requires careful review

For these issues, the workflow will:
1. Post a comment explaining what needs fixing
2. Fail the check (red ✗ on PR)
3. Provide guidance on how to fix

## Configuration

### Workflow Settings

File: `.github/workflows/pr-auto-fix.yml`

Key settings:
- **Timeout**: 15 minutes (prevents hanging)
- **Retry logic**: 4 attempts with exponential backoff (2s, 4s, 8s, 16s)
- **Skip CI**: Auto-fix commits use `[skip ci]` to prevent loops

### Resolution Script Settings

File: `scripts/auto-resolve-conflicts.sh`

Customizable strategies:
- Document resolution patterns (lines 30-60)
- Config resolution patterns (lines 62-85)
- GitHub template resolution (lines 87-110)

## Adding New Auto-Fix Strategies

To add a new conflict resolution strategy:

1. Edit `scripts/auto-resolve-conflicts.sh`
2. Add a new function (e.g., `resolve_custom_conflict`)
3. Add logic to detect and resolve the conflict type
4. Call the function in the main resolution loop

Example:

```bash
# Function to resolve custom conflicts
resolve_custom_conflict() {
    local file=$1
    echo -e "${YELLOW}🔧 Resolving custom conflict: $file${NC}"

    # Your resolution logic here
    if [[ "$file" == "path/to/custom/file" ]]; then
        # Resolve the conflict
        git checkout --ours "$file"
        git add "$file"
        echo -e "${GREEN}✅ Resolved custom conflict${NC}"
        ((RESOLVED_COUNT++))
        return 0
    fi

    return 1
}

# Add to main loop
if resolve_doc_conflict "$file"; then
    continue
elif resolve_config_conflict "$file"; then
    continue
elif resolve_custom_conflict "$file"; then  # <-- Add here
    continue
elif resolve_github_template_conflict "$file"; then
    continue
fi
```

## Troubleshooting

### Auto-fixes aren't being pushed

**Check:**
1. PR branch has write permissions
2. GitHub Actions has `contents: write` permission
3. Branch isn't protected with stricter rules
4. Check workflow logs for push errors

**Fix:**
```bash
# Manually trigger with more verbose logging
gh workflow run pr-auto-fix.yml -f pr_number=<PR_NUMBER>
```

### Script keeps failing to resolve conflicts

**Check:**
1. Review conflict in the file manually
2. Check if it matches any auto-resolution patterns
3. Add new pattern if it's a common conflict type

**Fix:**
```bash
# Run script locally with detailed output
./scripts/auto-resolve-conflicts.sh

# Check which files couldn't be resolved
git status
```

### Workflow times out

**Check:**
1. Are dependencies installing correctly?
2. Is type checking hanging?
3. Are tests taking too long?

**Fix:**
```yaml
# Increase timeout in workflow file
jobs:
  auto-fix:
    timeout-minutes: 30  # Increase from 15
```

### Infinite loop of commits

**Prevention:**
- Auto-fix commits include `[skip ci]` tag
- This prevents the workflow from re-triggering on its own commits

**If it happens anyway:**
1. Check workflow file has `[skip ci]` in commit message
2. Temporarily disable workflow
3. Investigate what's triggering it

## Security Considerations

### Permissions

The workflow has minimal required permissions:
- `contents: write` - To push auto-fixes
- `pull-requests: write` - To comment on PRs
- `issues: write` - To update issue comments

### Merge Safety

The auto-resolution script:
- **Never** deletes code without confirmation
- **Prefers** additive changes (keeping both versions)
- **Documents** all resolutions in commit message
- **Fails safely** - If uncertain, requires manual resolution

### Secret Handling

- Uses `GITHUB_TOKEN` (auto-provided, scoped to repo)
- No custom secrets required
- No external API calls

## Future Enhancements

Potential improvements:
- [ ] Auto-run tests and report results
- [ ] Auto-fix simple TypeScript errors (add missing imports, etc.)
- [ ] Suggest fixes via inline PR comments
- [ ] Integration with code review tools
- [ ] Metrics dashboard (resolution success rate, etc.)
- [ ] Slack notifications for failed auto-fixes
- [ ] AI-powered conflict resolution for complex cases

## Related Documentation

- [AGENT_ONBOARDING.md](/.claude/AGENT_ONBOARDING.md) - Agent workflow guide
- [DEVELOPMENT_PROTOCOLS.md](/docs/DEVELOPMENT_PROTOCOLS.md) - Development standards
- [CLAUDE_WORKFLOW.md](/docs/CLAUDE_WORKFLOW.md) - Multi-agent workflow
- [QA_SYSTEM_README.md](/.claude/QA_SYSTEM_README.md) - QA enforcement system

## Support

If you encounter issues with the auto-fix system:
1. Check workflow logs in GitHub Actions tab
2. Review this documentation
3. Run scripts locally to debug
4. Open an issue with `[auto-fix]` tag

---

**Last Updated:** November 12, 2025
**Maintained By:** TERP Development Team
