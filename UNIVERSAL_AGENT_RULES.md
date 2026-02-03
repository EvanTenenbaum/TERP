# UNIVERSAL_AGENT_RULES

> **Single stable entrypoint for all agents.** This file points to canonical sources and summarizes the minimum protocol required to work in TERP safely.

---

## Document Hierarchy

```
CLAUDE.md                          ← PRIMARY ENTRY POINT (start here)
├── UNIVERSAL_AGENT_RULES.md       ← This file (quick reference)
├── .kiro/steering/                ← Detailed protocols (below)
├── AGENTS.md                      ← Technical stack reference
└── docs/TERP_AGENT_INSTRUCTIONS.md
```

---

## Canonical Protocols (Recommended Reading Order)

### Priority Reading (Core Understanding)
1. `.kiro/steering/00-core-identity.md` - Who you are, prime directive
2. `.kiro/steering/06-architecture-guide.md` - System architecture
3. `.kiro/steering/07-deprecated-systems.md` - What NOT to use
4. `.kiro/steering/08-adaptive-qa-protocol.md` - SAFE/STRICT/RED verification

### Standard Protocols
5. `.kiro/steering/01-development-standards.md` - Code standards
6. `.kiro/steering/02-workflows.md` - Development workflows
7. `.kiro/steering/03-agent-coordination.md` - Multi-agent coordination
8. `.kiro/steering/04-infrastructure.md` - Deployment, infrastructure
9. `.kiro/steering/99-pre-commit-checklist.md` - Pre-commit requirements

### External Agents
If you are an external agent, also read:
- `.kiro/steering/05-external-agent-handoff.md`

### MVP-Specific (Current Initiative)
- `.kiro/steering/10-mvp-initiative.md` - Current MVP scope
- `.kiro/steering/11-mvp-iteration-protocol.md` - Iteration workflow

### Reference
- `.kiro/steering/terp-master-protocol.md` - Consolidated protocol reference
- `.kiro/steering/README.md` - Steering directory overview

---

## Non-Negotiables (Summary)

- **Verification over persuasion**: Follow SAFE/STRICT/RED requirements
- **No `any` types**: Explicit TypeScript return types required
- **TDD**: Write tests before implementation when modifying code
- **No parallel edits**: Don't edit files another agent is working on
- **Session registration required**: Before starting work
- **Deployment verification required**: Before marking complete

---

## Quick Commands

```bash
pnpm check      # Type checking
pnpm lint       # Linting
pnpm test       # Unit tests
pnpm build      # Production build
pnpm test:e2e   # E2E tests (when UI/business flows change)
```

If a required command cannot be run, mark verification as **UNSURE** and provide a local/CI plan.

---

## Historical Reference

A comprehensive version of agent rules (from 2025-12-17) is preserved at:
`docs/archive/agent-prompts/UNIVERSAL_AGENT_RULES.md`

This archived version contains expanded explanations that may be useful for deep reference.

---
*Last updated: 2026-02-03*
