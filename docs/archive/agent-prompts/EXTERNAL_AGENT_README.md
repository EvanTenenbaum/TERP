# 🤖 Working with External AI Agents

This directory contains everything you need to safely work with AI agents from other platforms (Claude, ChatGPT, etc.) on the TERP codebase.

---

## 🎯 Quick Start (Natural Language)

### Step 1: Copy Initial Prompt
Open `EXTERNAL_AGENT_MINIMAL_PROMPT.txt` and copy-paste it into Claude/ChatGPT.

### Step 2: Give Them Your Task
After they confirm they've read all protocols, describe your specific task.

### Step 3: Monitor Their Work
Use `EXTERNAL_AGENT_CHEAT_SHEET.md` to know what to check during work.

### Step 4: Validate Completion
Copy-paste `EXTERNAL_AGENT_COMPLETION_CHECKLIST.txt` when they say they're done.

### Step 5: Verify Their Work
```bash
bash scripts/validate-external-agent-work.sh
```

---

## 📁 File Guide

| File | Purpose | When to Use |
|------|---------|-------------|
| `EXTERNAL_AGENT_MINIMAL_PROMPT.txt` | Quick copy-paste prompt | Starting any task |
| `EXTERNAL_AGENT_PROMPT.md` | Detailed prompt with instructions | Complex tasks |
| `EXTERNAL_AGENT_CHEAT_SHEET.md` | Quick reference for you | Keep open while they work |
| `EXTERNAL_AGENT_COMPLETION_CHECKLIST.txt` | Validation checklist | When they say "done" |
| `EXTERNAL_AGENT_QUICK_START.md` | Overview and options | First time setup |
| `.kiro/steering/05-external-agent-handoff.md` | Complete protocol | Reference for agents |
| `scripts/external-agent-onboard.sh` | Generate context bundle | Terminal users |
| `scripts/validate-external-agent-work.sh` | Automated validation | After completion |

---

## 🔄 Typical Workflow

```
1. You: Copy-paste EXTERNAL_AGENT_MINIMAL_PROMPT.txt
   ↓
2. Agent: Reads all protocol files, confirms understanding
   ↓
3. You: Describe specific task
   ↓
4. Agent: Registers session, starts work
   ↓
5. You: Check in periodically (use cheat sheet)
   ↓
6. Agent: Says "done"
   ↓
7. You: Copy-paste EXTERNAL_AGENT_COMPLETION_CHECKLIST.txt
   ↓
8. Agent: Confirms all checks
   ↓
9. You: Run bash scripts/validate-external-agent-work.sh
   ↓
10. ✅ Complete!
```

---

## ⚠️ Critical Rules They Must Follow

External agents MUST:
- ✅ Read all 6 steering files before starting (using `cat` commands)
- ✅ Use standard tools (`grep`, `find`, `cat`) - NOT Kiro tools
- ✅ Register session in `docs/sessions/active/`
- ✅ Check `docs/ACTIVE_SESSIONS.md` for conflicts
- ✅ Use NO `any` types in TypeScript
- ✅ Write tests BEFORE implementation (TDD)
- ✅ Run `pnpm typecheck && pnpm lint && pnpm test` before committing
- ✅ Verify deployment succeeds
- ✅ Archive session when complete

**Tool Note**: External agents don't have access to Kiro-specific tools like `readFile`, `strReplace`, `grepSearch`, or `getDiagnostics`. They should use:
- `cat` instead of `readFile`
- `grep -r` instead of `grepSearch`
- `find` instead of `fileSearch`
- `pnpm typecheck` instead of `getDiagnostics`

If they skip ANY of these, they'll break things or conflict with other agents.

---

## 🚨 Red Flags (Stop Them Immediately)

| Red Flag | What to Say |
|----------|-------------|
| "I'll use `any` for now" | "No, use proper TypeScript types. See 01-development-standards.md" |
| "I'll add tests later" | "No, TDD is required. Write tests first." |
| "I'll skip the session file" | "No, session registration is mandatory to prevent conflicts." |
| "The deployment will probably work" | "No, verify it with the health check endpoint." |
| Editing files in ACTIVE_SESSIONS.md | "Stop! Another agent is working on those files." |

---

## ✅ How to Verify Their Work

### Automated Check
```bash
bash scripts/validate-external-agent-work.sh
```

### Manual Checks
```bash
# Check session archived
ls docs/sessions/completed/Session-$(date +%Y%m%d)-*.md

# Check roadmap updated
git diff HEAD~1 docs/roadmaps/MASTER_ROADMAP.md

# Check no 'any' types
git diff HEAD~1 | grep -i "any"

# Check deployment
curl https://terp-app-b9s35.ondigitalocean.app/health

# Check for errors
./scripts/terp-logs.sh run 100 | grep -i "error"
```

---

## 💡 Pro Tips

### Start Small
Give them a small task first (< 2 hours) to verify they follow protocols correctly.

### Check Frequently
Don't let them work for hours without checking in. Ask to see:
- Their session file
- Their test files
- Their commit messages

### Use the Cheat Sheet
Keep `EXTERNAL_AGENT_CHEAT_SHEET.md` open while they work. It has all the red flags and checkpoints.

### Validate Immediately
As soon as they say "done", run the validation script. Don't wait.

### Review Code Quality
Even if validation passes, review their code for:
- Proper TypeScript types
- Good test coverage
- Clean, readable code
- Proper error handling

---

## 🆘 If Something Goes Wrong

### They Broke the Build
```bash
# Check what broke
pnpm typecheck
pnpm lint
pnpm test

# Revert if needed
git revert [bad-commit]
git push origin main
```

### They Conflicted with Another Agent
```bash
# Check active sessions
cat docs/ACTIVE_SESSIONS.md

# Resolve conflicts
git pull --rebase origin main
# Fix conflicts manually
git rebase --continue
```

### Deployment Failed
```bash
# Check deployment logs
cat .deployment-status-*.log

# Check runtime logs
./scripts/terp-logs.sh run 100

# Rollback if needed
git revert [bad-commit]
git push origin main
```

---

## 📚 Additional Resources

- **Full Protocol**: `.kiro/steering/05-external-agent-handoff.md`
- **Development Standards**: `.kiro/steering/01-development-standards.md`
- **Workflows**: `.kiro/steering/02-workflows.md`
- **Agent Coordination**: `.kiro/steering/03-agent-coordination.md`
- **Infrastructure**: `.kiro/steering/04-infrastructure.md`

---

## 🎓 Learning from Issues

After each external agent session, note:
- What protocols they followed well
- What protocols they missed
- What caused confusion
- How to improve the handoff

Update the handoff protocol if you find common issues.

---

**With these tools, external agents can work safely on TERP without breaking things or conflicting with Kiro agents. Just follow the workflow and use the checklists!** 🚀
