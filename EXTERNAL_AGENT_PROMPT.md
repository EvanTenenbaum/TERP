# 🤖 Copy-Paste Prompt for External Agents

**Instructions**: Copy everything below the line and paste it into Claude, ChatGPT, or any other AI agent.

---

## PASTE THIS INTO EXTERNAL AGENT ↓

I'm working on the TERP project (cannabis ERP system). I need to follow strict protocols to avoid breaking things or conflicting with other agents.

**IMPORTANT**: You are NOT in Kiro IDE. This means:
- You don't have Kiro-specific tools (readFile, strReplace, grepSearch, getDiagnostics)
- Use standard bash commands: `cat`, `grep`, `find`, `pnpm typecheck`, etc.
- You must read protocol files manually

**CRITICAL**: Before doing ANYTHING, you must read these protocol files from the codebase:

### Step 1: Read External Agent Handoff (MANDATORY - READ FIRST)
```bash
cat .kiro/steering/05-external-agent-handoff.md
```

This tells you:
- How to work outside of Kiro IDE
- Session registration (mandatory)
- Standard tools reference (grep, find, cat, etc.)
- All critical rules

### Step 2: Read Core Protocols (ALL MANDATORY)
```bash
# Read these files IN ORDER:
cat .kiro/steering/00-core-identity.md
cat .kiro/steering/01-development-standards.md
cat .kiro/steering/02-workflows.md
cat .kiro/steering/03-agent-coordination.md
cat .kiro/steering/04-infrastructure.md
```

**Note**: Skip the "Kiro IDE" sections - use the "External Agent" sections instead.

### Step 3: Check Current State
```bash
# Check who else is working
cat docs/ACTIVE_SESSIONS.md

# Check current tasks
cat docs/roadmaps/MASTER_ROADMAP.md
```

### Step 4: Confirm Understanding

After reading all files above, confirm you understand these critical rules:

- ❌ **NO `any` types** in TypeScript (use proper types)
- ✅ **TDD required** (write tests BEFORE implementation)
- ✅ **Session registration mandatory** (prevents conflicts)
- ✅ **Deployment verification required** (don't mark complete until verified)
- ✅ **Roadmap validation required** (run `pnpm roadmap:validate` before commit)
- ✅ **Check active sessions** (don't edit files another agent is working on)

### Step 5: My Task

My specific task is:

**[REPLACE THIS WITH YOUR TASK DESCRIPTION]**

Task ID: [e.g., BUG-123, FEATURE-456]
Files I'll be editing: [list files]

---

## After Agent Reads Everything

Once the agent confirms they've read all protocols, you can start giving them specific instructions for the task.

## Validation After They're Done

When they say they're finished, ask them:

```
Before we finalize:

1. Did you run these checks?
   - pnpm typecheck (no errors?)
   - pnpm lint (no errors?)
   - pnpm test (all passing?)
   - pnpm roadmap:validate (if roadmap changed)

2. Did you:
   - Register your session in docs/sessions/active/?
   - Archive it to docs/sessions/completed/?
   - Update docs/roadmaps/MASTER_ROADMAP.md?
   - Remove yourself from docs/ACTIVE_SESSIONS.md?

3. Did deployment succeed?
   - Check: bash scripts/check-deployment-status.sh [commit-hash]
   - Or: curl https://terp-app-b9s35.ondigitalocean.app/health

4. Show me your session file so I can verify handoff notes are complete.
```

## Common Issues to Watch For

If the agent:
- Uses `any` types → Stop them, make them use proper types
- Skips tests → Stop them, require TDD
- Doesn't register session → Stop them, require registration
- Edits files another agent is working on → Stop them, check ACTIVE_SESSIONS.md
- Doesn't verify deployment → Stop them, require verification

## Quick Reference for You

**Check their work:**
```bash
bash scripts/validate-external-agent-work.sh
```

**View their session:**
```bash
ls docs/sessions/completed/Session-*
cat docs/sessions/completed/[their-session-file]
```

**Check deployment:**
```bash
bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)
```
