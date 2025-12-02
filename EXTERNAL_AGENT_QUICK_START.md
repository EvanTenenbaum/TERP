# 🚀 External Agent Quick Start

**For**: Claude, ChatGPT, or other AI agents working on TERP from outside Kiro

---

## ⚡️ For Natural Language (Claude/ChatGPT)

**Option 1 - Minimal Prompt** (for quick tasks):
```
Copy and paste: EXTERNAL_AGENT_MINIMAL_PROMPT.txt
```

**Option 2 - Full Prompt** (for complex tasks):
```
Copy and paste: EXTERNAL_AGENT_PROMPT.md
```

Both prompts tell the agent to read all protocol files from your codebase.

---

## ⚡️ For Terminal/Script Users

```bash
# 1. Run onboarding script
bash scripts/external-agent-onboard.sh

# 2. Read the generated context
cat EXTERNAL_AGENT_CONTEXT.md

# 3. Register your session (follow prompts from script)
```

---

## 🛑 Critical Checklist (Before ANY Work)

- [ ] Read all 6 steering files above
- [ ] Run: `git pull origin main`
- [ ] Check: `cat docs/ACTIVE_SESSIONS.md`
- [ ] Register session (see handoff protocol)
- [ ] Verify no file conflicts with other agents

---

## ✅ Pre-Commit Checklist (Before EVERY Commit)

```bash
# Run all checks
pnpm typecheck  # Must pass
pnpm lint       # Must pass
pnpm test       # Must pass

# If roadmap changed
pnpm roadmap:validate  # Must pass

# Always
git pull origin main  # Must be up to date
```

---

## 🚨 Common Mistakes to Avoid

1. ❌ Skipping steering files → You'll break protocols
2. ❌ Not registering session → Conflicts with other agents
3. ❌ Using `any` types → Violates TypeScript standards
4. ❌ Skipping tests → Violates TDD requirement
5. ❌ Not verifying deployment → Task not actually complete
6. ❌ Editing files another agent is working on → Merge conflicts

---

## 📞 Emergency: "I Broke Something"

```bash
# 1. Stop immediately
# 2. Document in session file what happened
# 3. Push what you have (even if broken)
git add .
git commit -m "WIP: encountered issue - see session notes"
git push origin main

# 4. Update session file with details
# 5. Alert user
```

---

## 🎯 Success = All These Pass

```bash
✅ pnpm typecheck
✅ pnpm lint
✅ pnpm test
✅ pnpm roadmap:validate
✅ Deployment succeeded
✅ Session archived
✅ Roadmap updated
```

---

## 📚 Full Documentation

For complete details, run:
```bash
bash scripts/external-agent-onboard.sh
```

This generates `EXTERNAL_AGENT_CONTEXT.md` with all protocols.

---

**Remember**: You're working in a coordinated multi-agent system. Follow protocols precisely. 🤖
