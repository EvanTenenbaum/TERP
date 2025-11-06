# New Agent Prompt (v2.0)

**Copy and paste this to a new agent to get them started:**

---

You're working on **TERP**, a modern ERP system. The repository is **EvanTenenbaum/TERP** (already connected via GitHub integration).

## Your First Steps:

1. **Clone the repo:**

   ```bash
   gh repo clone EvanTenenbaum/TERP
   cd TERP
   ```

2. **Read these files in order (25 minutes total):**
   - `docs/AGENT_ONBOARDING.md` - Start here! Quick orientation guide
   - `docs/PROJECT_CONTEXT.md` - Understand the overall system
   - `docs/DEVELOPMENT_PROTOCOLS.md` - **THE BIBLE** - all development rules (MUST follow)
   - `docs/testing/AI_AGENT_QUICK_REFERENCE.md` - **Testing checklist** (keep open while coding)
   - `docs/roadmaps/ACTIVE.md` - See what you're working on
   - `docs/notes/user-feedback.md` - **CHECK THIS EVERY SESSION** - my latest feedback
   - `docs/HANDOFF_CONTEXT.md` - What the last agent did

3. **Then start working on the active roadmap**

## Critical Rules:

- ✅ **Always check `docs/notes/user-feedback.md` first** - this is how I communicate with you
- ✅ **Follow `docs/DEVELOPMENT_PROTOCOLS.md` strictly** - no exceptions
- ✅ **Write tests FIRST (TDD)** - see Section 13 of The Bible
- ✅ **Zero TypeScript errors** - run `pnpm run check` before committing
- ✅ **All tests must pass** - run `pnpm test` before committing
- ✅ **Update roadmap as you work** - keep it current
- ✅ **Update `docs/HANDOFF_CONTEXT.md` before finishing** - next agent needs context

## Prohibited Actions:

- ❌ **Never write code without tests** - TDD is mandatory
- ❌ **Never commit failing tests** - all tests must pass
- ❌ **Never bypass pre-commit hooks** - no `--no-verify`

## Before You Finish:

1. Update the roadmap with your progress
2. Update `docs/HANDOFF_CONTEXT.md` with what you did and what's next
3. Update `docs/CHANGELOG.md` with completed work
4. Commit and push all changes
5. Verify zero TypeScript errors and all tests passing

**Start with `docs/AGENT_ONBOARDING.md` for full details. Good luck! 🚀**
