---
inclusion: manual
---

# 🔄 External Agent Handoff Protocol

**Version**: 1.0  
**Last Updated**: 2025-12-02  
**Status**: MANDATORY for non-Kiro agents

This document is for AI agents working on TERP from **other platforms** (Claude, ChatGPT, etc.) that don't have automatic access to Kiro steering files.

---

## ⚠️ CRITICAL: You Are Not in Kiro IDE

You're working in a different environment (Claude, ChatGPT, Cursor, etc.). This means:

- ❌ You don't have Kiro's specialized tools (`readFile`, `strReplace`, `grepSearch`, `getDiagnostics`)
- ❌ Steering files are NOT automatically included in your context
- ✅ You MUST read all protocol files manually using `cat`
- ✅ You MUST use standard bash/git commands (see tool reference below)
- ✅ You MUST follow the same code standards as Kiro agents

---

## 📋 Mandatory Reading (In Order)

Before starting ANY work, read these files in order:

### 1. Core Identity
```bash
cat .kiro/steering/00-core-identity.md
```
**Purpose**: Understand who you are, what TERP is, universal rules

### 2. Development Standards
```bash
cat .kiro/steering/01-development-standards.md
```
**Purpose**: TypeScript, React, testing, database, accessibility standards

### 3. Workflows
```bash
cat .kiro/steering/02-workflows.md
```
**Purpose**: Git, deployment, testing, session management

### 4. Agent Coordination
```bash
cat .kiro/steering/03-agent-coordination.md
```
**Purpose**: Multi-agent synchronization, conflict prevention

### 5. Infrastructure
```bash
cat .kiro/steering/04-infrastructure.md
```
**Purpose**: DigitalOcean deployment, database, monitoring

### 6. Your Role-Specific Guide
```bash
# Choose based on your task:
cat agent-prompts/implementation-agent.md
cat agent-prompts/pm-agent.md
cat agent-prompts/qa-agent.md
```

---

## 🚨 Pre-Work Checklist

Before writing ANY code:

- [ ] Read all 5 steering files above
- [ ] Read your role-specific guide
- [ ] Pull latest: `git pull origin main`
- [ ] Check active sessions: `cat docs/ACTIVE_SESSIONS.md`
- [ ] Check roadmap: `cat docs/roadmaps/MASTER_ROADMAP.md`
- [ ] Register your session (see below)
- [ ] Verify no conflicts with other agents

**If you skip this, you WILL cause problems.**

---

## 📝 Session Registration (MANDATORY)

You MUST register your session before starting work:

```bash
# 1. Generate session ID
SESSION_ID="Session-$(date +%Y%m%d)-TASK-ID-$(openssl rand -hex 3)"

# 2. Create session file
cat > docs/sessions/active/$SESSION_ID.md << 'EOF'
# Session: TASK-ID - Task Title

**Status**: In Progress
**Started**: $(date)
**Agent Type**: External (Claude/ChatGPT/Other)
**Platform**: [Specify platform]
**Files**: [List files you'll edit]

## Progress
- [ ] Phase 1
- [ ] Phase 2

## Notes
Working from external platform - following handoff protocol
EOF

# 3. Register in active sessions
echo "- $SESSION_ID: TASK-ID - [Platform: External] [Files: file1.ts, file2.ts]" >> docs/ACTIVE_SESSIONS.md

# 4. Commit and push IMMEDIATELY
git add docs/sessions/active/$SESSION_ID.md docs/ACTIVE_SESSIONS.md
git commit -m "chore: register external agent session $SESSION_ID for TASK-ID"
git push origin main
```

**Why**: This prevents conflicts with Kiro agents and other external agents.

---

## 🔧 Standard Tools Reference

Since you're not in Kiro IDE, use these standard tools:

### File Operations

| Task | Command | Example |
|------|---------|---------|
| Read single file | `cat` | `cat server/routers/calendar.ts` |
| Read multiple files | `cat` | `cat file1.ts file2.ts` |
| Read with line numbers | `cat -n` | `cat -n server/db.ts` |
| Read specific lines | `sed -n` | `sed -n '10,20p' file.ts` |
| View file head | `head` | `head -50 file.ts` |
| View file tail | `tail` | `tail -50 file.ts` |

### Search Operations

| Task | Command | Example |
|------|---------|---------|
| Search in files | `grep -r` | `grep -r "pattern" src/` |
| Search with context | `grep -B2 -A2` | `grep -B2 -A2 "function" file.ts` |
| Search TypeScript files | `grep -r --include` | `grep -r --include="*.ts" "pattern" .` |
| Find files by name | `find` | `find . -name "*.ts" -path "*/routers/*"` |
| Find files by content | `grep -l` | `grep -rl "pattern" src/` |

### Code Quality Checks

| Task | Command | Notes |
|------|---------|-------|
| TypeScript errors | `pnpm typecheck` | Run after every change |
| Linting | `pnpm lint` | Run before commit |
| All tests | `pnpm test` | Run before commit |
| Specific test | `pnpm test calendar` | Test specific file |
| Format check | `pnpm format:check` | Check formatting |

### Git Operations

| Task | Command | Example |
|------|---------|---------|
| Pull latest | `git pull origin main` | Always do first |
| Check status | `git status` | See changed files |
| View diff | `git diff` | See changes |
| Commit | `git commit -m "msg"` | Use conventional commits |
| Push | `git push origin main` | After each phase |

### File Editing

For editing files, use your IDE's native editing capabilities or:

| Task | Command | Example |
|------|---------|---------|
| Simple replace | `sed -i` | `sed -i 's/old/new/g' file.ts` |
| Create file | `cat >` | `cat > newfile.ts << 'EOF'` |
| Append to file | `echo >>` | `echo "text" >> file.ts` |

**Note**: For complex edits, use your IDE's editor rather than sed.

---

## ✅ Development Standards (Summary)

### TypeScript
- ❌ **NO `any` types** - Use proper types
- ✅ Explicit return types on all functions
- ✅ Handle null/undefined explicitly
- ✅ Use type guards, not assertions

### React
- ✅ Use `React.memo` for reusable components
- ✅ Use `useCallback` for event handlers
- ✅ Use `useMemo` for expensive computations
- ✅ Props interfaces named `ComponentNameProps`

### Testing
- ✅ Write tests BEFORE implementation (TDD)
- ✅ 80%+ coverage for business logic
- ✅ Integration tests over unit tests
- ✅ Test behavior, not implementation

### Database
- ✅ snake_case for tables/columns
- ✅ Index ALL foreign keys
- ✅ Use soft deletes (`is_deleted`)
- ✅ Migrations for all schema changes

### Accessibility
- ✅ Keyboard navigation for all interactive elements
- ✅ Labels for all form inputs
- ✅ `aria-label` for icon buttons
- ✅ 4.5:1 color contrast minimum

---

## 🔄 Git Workflow

```bash
# 1. Always pull first
git pull origin main

# 2. Create feature branch (for large changes)
git checkout -b feature/TASK-ID-description

# 3. Make changes, commit frequently
git add .
git commit -m "feat(scope): description"

# 4. Push after each phase
git push origin feature/TASK-ID-description

# 5. Update session file with progress
# Edit docs/sessions/active/$SESSION_ID.md
git add docs/sessions/active/$SESSION_ID.md
git commit -m "chore: update session progress"
git push origin main
```

**Commit Message Format**:
```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, chore
```

---

## 🚀 Deployment Workflow

**CRITICAL**: Deployment is automatic on push to `main`.

```bash
# 1. Push triggers deployment
git push origin main

# 2. Monitor deployment
bash scripts/watch-deploy.sh

# 3. Check status
bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)

# 4. Verify health
curl https://terp-app-b9s35.ondigitalocean.app/health

# 5. Check for errors
./scripts/terp-logs.sh run 100 | grep -i "error"
```

**Never mark a task complete without verifying deployment succeeded.**

---

## 🧪 Testing Workflow

```bash
# 1. Write test first (TDD)
# Create test file

# 2. Run test (watch it fail)
pnpm test

# 3. Implement feature

# 4. Run test (watch it pass)
pnpm test

# 5. Run all checks before committing
pnpm typecheck  # No TypeScript errors
pnpm lint       # No linting errors
pnpm test       # All tests pass
```

---

## 🤝 Coordination with Other Agents

### Before Starting Work

```bash
# Check who else is working
cat docs/ACTIVE_SESSIONS.md

# If another agent is editing files you need:
# - Wait for them to finish
# - Work on different task
# - Ask user to coordinate
```

### During Work

```bash
# Pull frequently (before each phase)
git pull --rebase origin main

# Push frequently (after each phase)
git push origin main

# Update session file regularly
# Edit docs/sessions/active/$SESSION_ID.md
```

### After Completing Work

```bash
# 1. Archive session
mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/

# 2. Remove from active sessions
# Edit docs/ACTIVE_SESSIONS.md and remove your line

# 3. Update roadmap
# Edit docs/roadmaps/MASTER_ROADMAP.md
# Change status to "complete"

# 4. Validate roadmap
pnpm roadmap:validate

# 5. Commit everything
git add docs/sessions/completed/$SESSION_ID.md \
        docs/ACTIVE_SESSIONS.md \
        docs/roadmaps/MASTER_ROADMAP.md
git commit -m "chore: complete TASK-ID and archive session"
git push origin main
```

---

## 🛑 Critical Rules (NEVER BREAK)

1. ❌ **Don't skip reading steering files** - You'll break things
2. ❌ **Don't skip session registration** - You'll conflict with others
3. ❌ **Don't use `any` types** - Use proper TypeScript
4. ❌ **Don't skip tests** - All code must have tests
5. ❌ **Don't skip deployment verification** - Confirm builds succeed
6. ❌ **Don't edit files another agent is working on** - Check sessions first
7. ❌ **Don't commit without validation** - Run `pnpm roadmap:validate`
8. ❌ **Don't leave sessions unarchived** - Clean up when done
9. ❌ **Don't make breaking changes without approval** - Ask first
10. ❌ **Don't commit secrets** - Use environment variables

---

## 📊 Pre-Commit Checklist

Before EVERY commit:

- [ ] All tests pass: `pnpm test`
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No linting errors: `pnpm lint`
- [ ] Session file updated
- [ ] Roadmap updated (if applicable)
- [ ] Roadmap validates: `pnpm roadmap:validate`
- [ ] Pulled latest: `git pull origin main`
- [ ] No conflicts with active sessions

**If ANY item fails, DO NOT commit. Fix it first.**

---

## 🆘 When You're Stuck

1. **Re-read steering files** - The answer is probably there
2. **Check existing code** - Look for similar patterns
3. **Search codebase**: `grep -r "pattern" src/`
4. **Check documentation**: `docs/protocols/`
5. **Ask user** - When truly uncertain

---

## 📦 Handoff Back to Kiro

When you're done, leave clear notes for Kiro agents:

```bash
# In your session file (docs/sessions/completed/$SESSION_ID.md)
## Handoff Notes for Kiro Agents

**What was completed:**
- Feature X implemented
- Tests added with 85% coverage
- Deployment verified successful

**What's pending:**
- None

**Known issues:**
- None

**Files modified:**
- server/routers/calendar.ts
- client/src/pages/CalendarPage.tsx
- tests/calendar.test.ts

**Commits:**
- abc123: feat(calendar): add recurring events
- def456: test(calendar): add recurrence tests
```

---

## 🎯 Success Criteria

You've succeeded when:

- ✅ All steering files read and understood
- ✅ Session registered and tracked
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Deployment succeeds
- ✅ Roadmap updated
- ✅ Session archived
- ✅ No conflicts with other agents
- ✅ Code follows all protocols

---

## 📞 Emergency Contact

If you encounter issues:

1. **Stop work immediately**
2. **Document the issue** in your session file
3. **Push what you have** (even if incomplete)
4. **Alert the user** with details
5. **Don't leave the codebase broken**

---

## 🔍 Quick Reference

### Essential Commands
```bash
# Read steering files
cat .kiro/steering/*.md

# Check sessions
cat docs/ACTIVE_SESSIONS.md

# Check roadmap
cat docs/roadmaps/MASTER_ROADMAP.md

# Run all checks
pnpm typecheck && pnpm lint && pnpm test

# Validate roadmap
pnpm roadmap:validate

# Monitor deployment
bash scripts/watch-deploy.sh
```

### Essential Files
- **Steering**: `.kiro/steering/*.md`
- **Roadmap**: `docs/roadmaps/MASTER_ROADMAP.md`
- **Sessions**: `docs/ACTIVE_SESSIONS.md`
- **Protocols**: `docs/protocols/`

---

**Remember**: You're working in a coordinated multi-agent system. Your work affects Kiro agents and production. Follow protocols precisely, communicate clearly, and leave the codebase better than you found it.

**Good luck! 🚀**
