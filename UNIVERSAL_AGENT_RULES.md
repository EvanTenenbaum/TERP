# UNIVERSAL_AGENT_RULES (Current)

This file exists to provide a single, stable entrypoint for all agents. It **does not replace**
the steering files. Instead, it **points to the canonical sources** and summarizes the minimum
protocol required to work in TERP safely.

---

## Canonical Protocols (Read in Order)

1. `.kiro/steering/00-core-identity.md`
2. `.kiro/steering/06-architecture-guide.md`
3. `.kiro/steering/07-deprecated-systems.md`
4. `.kiro/steering/08-adaptive-qa-protocol.md`
5. `.kiro/steering/01-development-standards.md`
6. `.kiro/steering/02-workflows.md`
7. `.kiro/steering/03-agent-coordination.md`
8. `.kiro/steering/04-infrastructure.md`
9. `.kiro/steering/99-pre-commit-checklist.md`

If you are an external agent, also read:
`.kiro/steering/05-external-agent-handoff.md`

---

## Non-Negotiables (Summary)

- **Verification over persuasion**: follow SAFE/STRICT/RED requirements.
- **No `any` types** and explicit TypeScript return types.
- **TDD**: write tests before implementation when modifying code.
- **No parallel edits** to files another agent is working on.
- **Session registration required** before starting work.
- **Deployment verification required** before marking complete.

---

## Quick Commands (TERP)

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm test:e2e   # when UI/business flows change
```

If a required command cannot be run, mark verification as **UNSURE** and provide a local/CI plan.
