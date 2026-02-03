# UNIVERSAL_AGENT_RULES

> **Single stable entrypoint for all agents.** This file points to canonical sources and summarizes the minimum protocol required to work in TERP safely.

---

## Canonical Entry Point

**Start with `CLAUDE.md`** in the repository root. It contains the complete agent protocol.

---

## Canonical Steering Files (Read in Order)

The `.kiro/steering/` directory contains detailed protocols. Read these in order:

| # | File | Purpose |
|---|------|---------|
| 00 | `00-core-identity.md` | Who you are, prime directive |
| 01 | `01-development-standards.md` | Code standards, TypeScript rules |
| 02 | `02-workflows.md` | Development workflows |
| 03 | `03-agent-coordination.md` | Multi-agent coordination |
| 04 | `04-infrastructure.md` | Deployment, infrastructure |
| 05 | `05-external-agent-handoff.md` | External agent protocols |
| 06 | `06-architecture-guide.md` | System architecture |
| 07 | `07-deprecated-systems.md` | What NOT to use |
| 08 | `08-adaptive-qa-protocol.md` | QA and verification modes |
| 10 | `10-mvp-initiative.md` | Current MVP scope |
| 11 | `11-mvp-iteration-protocol.md` | Iteration workflow |
| 99 | `99-pre-commit-checklist.md` | Pre-commit requirements |

Also see: `terp-master-protocol.md` for consolidated protocol reference.

---

## Non-Negotiables (Summary)

- **Verification over persuasion**: Follow SAFE/STRICT/RED requirements
- **No `any` types**: Explicit TypeScript return types required
- **TDD**: Write tests before implementation when modifying code
- **No parallel edits**: Don't edit files another agent is working on
- **Session registration**: Required before starting work
- **Deployment verification**: Required before marking complete

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

## Document Hierarchy

```
CLAUDE.md                          ← Primary Protocol (START HERE)
├── UNIVERSAL_AGENT_RULES.md       ← This file (quick reference)
├── .kiro/steering/                ← Detailed protocols
├── AGENTS.md                      ← Technical stack info
└── docs/TERP_AGENT_INSTRUCTIONS.md ← Extended instructions
```

---
*Last updated: 2026-02-03*
