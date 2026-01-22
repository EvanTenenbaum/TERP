---
inclusion: always
---

# 🔄 TERP Workflows

**Version**: 2.0  
**Last Updated**: 2025-12-02  
**Status**: MANDATORY

This document defines all operational workflows for TERP development.

---

## Git Workflow

### Branch Strategy

**Main branch**: `main` (production)  
**Feature branches**: created via `pnpm start-task`  
**Hotfix branches**: `hotfix/description` (emergency only)

### Standard Development Flow

```bash
# 1. Pull latest
git pull origin main

# 2. Start a task (creates branch + session + roadmap entry for ad-hoc)
pnpm start-task "BUG-123"
# or
pnpm start-task --adhoc "Fix login timeout" --category bug

# 3. Make changes, commit frequently
git add .
git commit -m "fix(auth): resolve login timeout issue"

# 4. Push to remote (feature branch)
git push

# 5. Open a PR to main and let CI/deploy run
```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```bash
git commit -m "feat(calendar): add recurring event support"
git commit -m "fix(auth): resolve session timeout issue"
git commit -m "docs: update API documentation"
```

### Conflict Resolution

When you encounter merge conflicts:

```bash
# Pull with rebase
git pull --rebase origin main

# If conflicts occur:
# 1. Check which files have conflicts
git status

# 2. Open conflicting files and resolve
# Look for <<<<<<< HEAD markers

# 3. For roadmap/session files, prefer additive merges
# (keep both changes when possible)

# 4. After resolving, mark as resolved
git add <resolved-files>

# 5. Continue rebase
git rebase --continue

# 6. Push
git push
```

**Auto-resolution script** (for common conflicts):

```bash
bash scripts/auto-resolve-conflicts.sh
```

### When to Push Directly to Main

**Default**: Use PRs for all changes.  
**Exception**: Emergency hotfixes with explicit approval and documented rollback plan.

---

## Deployment Workflow

### Automatic Deployment

TERP uses DigitalOcean App Platform with automatic deployment.

**Trigger**: Push to `main` branch
**Process**: Automatic via `.husky/post-push` hook
**Monitoring**: Background process tracks deployment

### Deployment Process

```bash
# 1. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 2. Push to main
git push origin main

# 3. Post-push hook automatically starts monitoring
# (runs in background via nohup)

# 4. Check deployment status
bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)

# 5. View deployment logs (if needed)
cat .deployment-status-*.log

# 6. Monitor active deployments
bash scripts/manage-deployment-monitors.sh status
```

### Deployment Verification

**CRITICAL**: Never mark a task complete without verifying deployment.

```bash
# 1. Wait for deployment to complete
bash scripts/watch-deploy.sh

# 2. Check application health
curl https://terp-app-b9s35.ondigitalocean.app/health

# 3. Test the deployed feature
# (manual testing in production)

# 4. Check for runtime errors
./scripts/terp-logs.sh run 100 | grep -i "error"

# 5. Only then mark task complete
```

### Rollback Procedure

If deployment fails or introduces bugs:

```bash
# 1. Identify last good commit
git log --oneline -10

# 2. Revert to last good state
git revert <bad-commit-hash>

# 3. Push immediately
git push origin main

# 4. Monitor rollback deployment
bash scripts/watch-deploy.sh

# 5. Document incident
# Create post-mortem in docs/incidents/
```

---

## Testing Workflow

### Test-Driven Development (TDD)

**Always write tests before implementation.**

```bash
# 1. Write failing test
# Create test file: src/utils/discount.test.ts

# 2. Run tests (watch them fail)
pnpm test discount

# 3. Implement feature
# Create implementation: src/utils/discount.ts

# 4. Run tests (watch them pass)
pnpm test discount

# 5. Refactor if needed
# 6. Commit
git commit -m "feat: add discount calculation"
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test calendar

# Run tests in watch mode (during development)
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run unit tests
pnpm test:unit

# Run E2E tests
pnpm test:e2e
```

### QA Checkpoints

After every implementation phase:

```bash
# 1. Run all tests
pnpm test

# 2. Check TypeScript errors
pnpm check

# 3. Run linter
pnpm lint

# 4. Format (if needed)
pnpm format

# 5. Build (if code ships)
pnpm build
```

**Fix all issues before proceeding to next phase.**

---

## Session Management Workflow

### Starting a Task

```bash
# 1. Pull latest
git pull origin main

# 2. Check active sessions
cat docs/ACTIVE_SESSIONS.md

# 3. Generate session ID
SESSION_ID="Session-$(date +%Y%m%d)-TASK-ID-$(openssl rand -hex 3)"

# 4. Create session file
cat > docs/sessions/active/$SESSION_ID.md << EOF
# Session: TASK-ID - Task Title

**Status**: In Progress
**Started**: $(date)
**Agent**: [Your Agent Type]

## Checklist
- [ ] Task 1
- [ ] Task 2

## Notes
[Your notes here]
EOF

# 5. Register in ACTIVE_SESSIONS.md
echo "- $SESSION_ID: TASK-ID - Task Title" >> docs/ACTIVE_SESSIONS.md

# 6. Commit and push registration
git add docs/sessions/active/$SESSION_ID.md docs/ACTIVE_SESSIONS.md
git commit -m "chore: register session $SESSION_ID"
git push origin main
```

### During Task Execution

Update session file regularly:

```bash
# Update progress
# Edit docs/sessions/active/$SESSION_ID.md
# Mark completed items with [x]

# Commit progress
git add docs/sessions/active/$SESSION_ID.md
git commit -m "chore: update session progress"
git push origin main
```

### Completing a Task

```bash
# 1. Mark task complete in roadmap
# Edit docs/roadmaps/MASTER_ROADMAP.md
# Change status to "complete"

# 2. Archive session
mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/

# 3. Remove from ACTIVE_SESSIONS.md
# Edit docs/ACTIVE_SESSIONS.md and remove the line

# 4. Commit completion
git add docs/roadmaps/MASTER_ROADMAP.md \
        docs/sessions/completed/$SESSION_ID.md \
        docs/ACTIVE_SESSIONS.md
git commit -m "chore: complete TASK-ID and archive session"
git push origin main

# 5. Verify deployment succeeded
bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)
```

---

## Roadmap Management Workflow

### Validating Roadmap Changes

**MANDATORY**: Run validation before every roadmap commit.

```bash
# Validate roadmap
pnpm roadmap:validate

# If validation fails, fix issues and re-run
# Only commit when validation passes
```

### Adding a New Task

```bash
# 1. Read roadmap to find next ID
cat docs/roadmaps/MASTER_ROADMAP.md

# 2. Add task using correct format
# Status: ready | in-progress | complete | blocked
# Priority: HIGH | MEDIUM | LOW
# Estimate: 4h | 8h | 16h | 1d | 2d | 1w

# 3. Validate
pnpm roadmap:validate

# 4. Commit
git add docs/roadmaps/MASTER_ROADMAP.md
git commit -m "roadmap: add TASK-ID - Task Title"
git push origin main
```

### Updating Task Status

```bash
# 1. Edit roadmap file
# Change **Status:** field to new status

# 2. Add completion details (if completing)
# **Key Commits:** [commit hashes]
# **Actual Time:** [time spent]

# 3. Validate
pnpm roadmap:validate

# 4. Commit
git commit -m "roadmap: update TASK-ID status to complete"
git push origin main
```

### Checking Capacity

Before assigning new work:

```bash
# Check current capacity
pnpm roadmap:capacity

# Get next recommended tasks
pnpm roadmap:next-batch
```

---

## Multi-Agent Coordination Workflow

### Before Starting Work

```bash
# 1. Pull latest
git pull origin main

# 2. Check active sessions
cat docs/ACTIVE_SESSIONS.md

# 3. Verify no conflicts
# Ensure no other agent is working on same files

# 4. Register your session
# (see Session Management Workflow above)
```

### During Work

```bash
# Push frequently (after each phase)
git push origin main

# Pull before each new phase
git pull --rebase origin main

# Update session file with progress
# Commit and push updates
```

### Handling Conflicts

If another agent is working on same files:

```bash
# 1. Check who has the files
cat docs/ACTIVE_SESSIONS.md

# 2. Options:
#    a) Wait for them to finish
#    b) Work on different task
#    c) Coordinate with user

# 3. DO NOT edit files another agent is working on
```

---

## Emergency Procedures

### Production Issue

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-issue

# 2. Fix the issue
# Make minimal changes

# 3. Test thoroughly
pnpm test

# 4. Push directly to main
git checkout main
git merge hotfix/critical-issue
git push origin main

# 5. Monitor deployment
bash scripts/watch-deploy.sh

# 6. Verify fix in production
# Test the fix manually

# 7. Document incident
# Create docs/incidents/YYYY-MM-DD-description.md
```

### Deployment Failure

```bash
# 1. Check deployment logs
cat .deployment-status-*.log

# 2. Identify the issue
# Look for error messages

# 3. Fix and redeploy
# Make fix, commit, push

# 4. If unfixable, rollback
git revert HEAD
git push origin main

# 5. Investigate root cause
# Document in incident report
```

### Database Issue

```bash
# 1. DO NOT make manual database changes
# 2. Create migration script
# 3. Test migration locally
# 4. Deploy via normal process
# 5. Monitor carefully
```

---

## Daily Workflow Checklist

### Start of Day

- [ ] Pull latest: `git pull origin main`
- [ ] Check active sessions: `cat docs/ACTIVE_SESSIONS.md`
- [ ] Review roadmap: `cat docs/roadmaps/MASTER_ROADMAP.md`
- [ ] Check for production issues
- [ ] Plan your work

### During Development

- [ ] Write tests first (TDD)
- [ ] Commit frequently
- [ ] Push after each phase
- [ ] Update session file
- [ ] Run QA checkpoints

### End of Day

- [ ] Push all work: `git push origin main`
- [ ] Update session file with progress
- [ ] Archive completed sessions
- [ ] Update roadmap
- [ ] Verify deployments succeeded

---

## Workflow Tools

### Essential Scripts

```bash
# Roadmap management
pnpm roadmap:validate
pnpm roadmap:capacity
pnpm roadmap:next-batch

# Testing
pnpm test
pnpm test:coverage
pnpm check

# Deployment
bash scripts/watch-deploy.sh
bash scripts/check-deployment-status.sh <commit>
bash scripts/manage-deployment-monitors.sh status

# Conflict resolution
bash scripts/auto-resolve-conflicts.sh
bash scripts/handle-push-conflict.sh
```

### Kiro-Specific Workflow

When working in Kiro IDE:

```bash
# In Kiro IDE:
# - Use Kiro tools: readFile, readMultipleFiles, strReplace
# - Use getDiagnostics after editing
# - Use grepSearch for finding code
# - Use fileSearch for locating files

# External Agents (Claude, ChatGPT, Cursor, etc.):
# - Use cat to read files
# - Use pnpm check after editing
# - Use rg for finding code
# - Use find for locating files
```

---

## Workflow Best Practices

### DO ✅

- Pull before starting work
- Commit frequently with clear messages
- Push after every phase
- Run tests before committing
- Validate roadmap before committing
- Update session files regularly
- Verify deployments succeed
- Document complex changes
- Coordinate with other agents

### DON'T ❌

- Skip tests
- Commit broken code
- Push without pulling first
- Work on files another agent is editing
- Skip deployment verification
- Leave sessions unarchived
- Make breaking changes without approval
- Commit sensitive data
- Skip validation checks

---

**These workflows ensure coordinated, high-quality development. Follow them consistently.**
