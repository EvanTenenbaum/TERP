# 🎯 External Agent Cheat Sheet

Quick reference for working with external agents (Claude, ChatGPT, etc.)

---

## 📝 Initial Prompt (Copy-Paste This)

```
I'm working on TERP. Read these protocol files from the codebase:

1. .kiro/steering/05-external-agent-handoff.md (READ FIRST)
2. .kiro/steering/00-core-identity.md
3. .kiro/steering/01-development-standards.md
4. .kiro/steering/02-workflows.md
5. .kiro/steering/03-agent-coordination.md
6. .kiro/steering/04-infrastructure.md

Then check:
- docs/ACTIVE_SESSIONS.md
- docs/roadmaps/MASTER_ROADMAP.md

Confirm you understand: NO 'any' types, TDD required, session registration mandatory, deployment verification required.

My task: [YOUR TASK]
```

---

## ✅ Things to Verify During Work

Ask the agent periodically:

**"Have you:"**
- Registered your session?
- Checked for file conflicts with other agents?
- Written tests first (TDD)?
- Avoided using 'any' types?

---

## 🔍 Before They Say "Done"

Ask them to confirm:

```
Run these checks and show me the results:
1. pnpm typecheck
2. pnpm lint  
3. pnpm test
4. pnpm roadmap:validate (if roadmap changed)

Then show me:
- Your session file (docs/sessions/completed/Session-*.md)
- Your commit messages
- Deployment status
```

---

## 🚨 Red Flags (Stop Them If You See)

- ❌ "I'll use `any` for now" → NO, use proper types
- ❌ "I'll add tests later" → NO, TDD required
- ❌ "I'll skip the session file" → NO, mandatory
- ❌ "The deployment will probably work" → NO, verify it
- ❌ Editing files in ACTIVE_SESSIONS.md → NO, conflict!

---

## ✨ After They're Done

**Validate their work:**
```bash
bash scripts/validate-external-agent-work.sh
```

**Check their session:**
```bash
cat docs/sessions/completed/Session-$(date +%Y%m%d)-*.md
```

**Verify deployment:**
```bash
curl https://terp-app-b9s35.ondigitalocean.app/health
```

---

## 📁 Files to Check

| File | What to Check |
|------|---------------|
| `docs/ACTIVE_SESSIONS.md` | Their session removed? |
| `docs/sessions/completed/` | Session archived with notes? |
| `docs/roadmaps/MASTER_ROADMAP.md` | Task marked complete? |
| Recent commits | Follow conventional format? |
| Changed `.ts` files | No `any` types? |

---

## 💡 Pro Tips

1. **Start small** - Give them one small task first to verify they follow protocols
2. **Check frequently** - Don't let them work for hours without checking in
3. **Validate immediately** - Run validation script as soon as they say done
4. **Review commits** - Check their commit messages and code quality
5. **Test deployment** - Always verify the feature works in production

---

## 🆘 If They Break Something

1. Check what they changed: `git log --oneline -5`
2. Check deployment status: `bash scripts/check-deployment-status.sh [commit]`
3. If broken, revert: `git revert [bad-commit]`
4. Learn what protocol they missed
5. Emphasize that protocol next time

---

## 📚 Related Files

- **Initial Prompt**: `EXTERNAL_AGENT_MINIMAL_PROMPT.txt` (copy-paste to start)
- **Full Guide**: `EXTERNAL_AGENT_PROMPT.md` (detailed instructions)
- **Completion Checklist**: `EXTERNAL_AGENT_COMPLETION_CHECKLIST.txt` (copy-paste when done)
- **Full Protocol**: `.kiro/steering/05-external-agent-handoff.md` (complete reference)

---

**Keep this file handy when working with external agents!**
