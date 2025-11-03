# START HERE: TERP Product Management System (v2)

**Welcome to the TERP Product Management System!** This is the single source of truth for all development work.

---

## CRITICAL: Understanding Sandbox Isolation & GitHub

⚠️ **You are working in an isolated sandbox.** Changes you make are NOT visible to other agents or in the GitHub repository until you push them.

**This means**:
- ❌ Creating files locally does NOT make them visible to others
- ❌ The PM Agent cannot see your work until you push to GitHub
- ❌ Other agents cannot see your work until you push to GitHub
- ✅ You MUST push to GitHub for your work to be part of the system

**The GitHub push step is MANDATORY, not optional.**

---

## The GitHub Workflow Pattern

Every agent that creates or modifies files MUST follow this pattern:

```bash
# START: Pull latest
cd /home/ubuntu/TERP
git pull origin main

# WORK: Do your work
cd /home/ubuntu/TERP/product-management
[... agent-specific work ...]

# VERIFY: Check your work
[... verification commands ...]

# END: Push to GitHub
cd /home/ubuntu/TERP
git add product-management/
git commit -m "Descriptive message"
git pull --rebase origin main
git push origin main

# CONFIRM: Verify push
git log --oneline -1
```

---

## System Overview

This system is designed for autonomous, multi-agent development.

### Key Components:

- **`initiatives/`**: Where all work is documented
- **`_system/scripts/`**: All automation scripts
- **`_system/chat-contexts/`**: Prompts for different agent types
- **`pm-evaluation/`**: Where PM analysis is stored
- **`docs/bible/`**: The TERP Development Protocols (The Bible)

### Agent Types:

1. **Initiative Creator Agent**: Transforms ideas into documented initiatives
2. **PM Agent**: Strategic oversight, roadmap optimization, coordination
3. **Implementation Agent**: Autonomous implementation of initiatives

---

## Getting Started

### 1. Read The Bible

**ALWAYS read the development protocols first:**

```bash
cat /home/ubuntu/TERP/docs/bible/DEVELOPMENT_PROTOCOLS.md
```

### 2. Understand Current State

```bash
cd /home/ubuntu/TERP/product-management

# Scan codebase
python3 _system/scripts/system-context.py scan

# Read summary
cat _system/context/system-summary.md

# View roadmap
python3 _system/scripts/status-tracker.py dashboard
```

### 3. Choose Your Agent Prompt

- **To create a new initiative**: Use `INITIATIVE_CREATOR_AGENT_PROMPT_V4.md`
- **To act as PM**: Use `PM_AGENT_PROMPT_V4.md`
- **To implement a feature**: Use `IMPLEMENTATION_AGENT_PROMPT_V4.md`

All prompts are in `_system/chat-contexts/`

---

## Core Scripts

- **`initiative-manager.py`**: Create new initiatives
- **`status-tracker.py`**: Update status, view dashboard
- **`pm-evaluator.py`**: Evaluate initiatives, get next task
- **`system-context.py`**: Scan codebase for context
- **`file-locker.py`**: Lock files to prevent conflicts
- **`qa-checklist.py`**: Run QA checks

---

## Troubleshooting

### "Command not found" or "No such file"

```bash
# Check where you are
pwd

# Should be: /home/ubuntu/TERP/product-management
# If not:
cd /home/ubuntu/TERP/product-management
```

### "Initiative not found"

```bash
# Pull latest from GitHub
cd /home/ubuntu/TERP
git pull origin main

# Check registry
cat product-management/initiatives/registry.json
```

### Git Push Fails

```bash
# Pull with rebase
git pull --rebase origin main

# Resolve conflicts if needed
# Then push again
git push origin main
```

---

## Deprecated Systems

❌ The old FEAT/IDEA/BUG system is **DEPRECATED**.
❌ `id-manager.py` is **DEPRECATED**.

✅ **ALWAYS** use the INIT-based system.
✅ **ALWAYS** use `initiative-manager.py`.

---

**This document is your entry point. Read it before starting any work!**
