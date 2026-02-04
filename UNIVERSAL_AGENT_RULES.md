# UNIVERSAL_AGENT_RULES

> **Quick reference pointing to canonical sources.** This file does NOT replace the protocols—it summarizes where to find them and the critical rules to follow.

---

## 🚨 START HERE

**Read `CLAUDE.md` first.** It is the single source of truth for all agent protocols.

```bash
cat CLAUDE.md
```

If there are conflicts between CLAUDE.md and steering files, **CLAUDE.md takes precedence**.

---

## Document Hierarchy

```
CLAUDE.md                          ← PRIMARY (read first, single source of truth)
├── .kiro/steering/                ← Detailed protocols (below)
├── AGENTS.md                      ← Technical stack reference
├── docs/TERP_AGENT_INSTRUCTIONS.md ← Extended instructions
└── UNIVERSAL_AGENT_RULES.md       ← This file (quick reference)
```

---

## Canonical Steering Files (Read in This Order)

Per `.kiro/steering/README.md`, read these after CLAUDE.md:

| #  | File | Purpose | Priority |
|----|------|---------|----------|
| 1  | `00-core-identity.md` | Who you are, prime directive | Always |
| 2  | `06-architecture-guide.md` | System structure | **CRITICAL** |
| 3  | `07-deprecated-systems.md` | What NOT to use | **CRITICAL** |
| 4  | `08-adaptive-qa-protocol.md` | Verification modes (SAFE/STRICT/RED) | **CRITICAL** |
| 5  | `01-development-standards.md` | TypeScript, code standards | Always |
| 6  | `02-workflows.md` | Git, deployment, testing | Always |
| 7  | `03-agent-coordination.md` | Multi-agent sync | Always |
| 8  | `04-infrastructure.md` | DigitalOcean, monitoring | Always |
| 9  | `11-mvp-iteration-protocol.md` | Fast iteration workflow | POST-MVP |
| 10 | `99-pre-commit-checklist.md` | Final pre-commit checks | Always |
| 11 | `terp-master-protocol.md` | Roadmap Manager role | Role-specific |

### Additional Files
- `05-external-agent-handoff.md` — Read if you're from Claude, ChatGPT, Cursor, etc.
- `10-mvp-initiative.md` — Current MVP scope and priorities

---

## Non-Negotiables (From Actual Protocols)

### Prime Directive
> **Verification over persuasion.** No change is correct unless verified through deterministic checks. Never claim success without evidence.

### Autonomy Modes (From 08-adaptive-qa-protocol.md)

| Mode | When | Requirements |
|------|------|--------------|
| 🟢 **SAFE** | Isolated, no sensitive data, reversible | Small commits, targeted tests |
| 🟡 **STRICT** | Shared components, business logic, DB | Full verification loop |
| 🔴 **RED** | Auth, payments, accounting, migrations | Regression + adversarial tests, rollback plan |

**When in doubt, escalate to stricter mode.**

### TypeScript Rules (From 01-development-standards.md)
- **No `any` types** — Period. Document exceptions.
- **Explicit return types** — All functions must declare return types.
- **No type assertions without justification** — Use type guards instead.

### Coordination Rules (From 03-agent-coordination.md)
- **Session registration is mandatory** — Register in `docs/sessions/active/`
- **No parallel edits** — Do not edit files another agent is working on
- **Status must be visible** — Via sessions + roadmap

### Definition of Done (From 08-adaptive-qa-protocol.md)
A change is DONE only if:
1. Tests added/updated (or justification why not)
2. Lint passes
3. Typecheck passes
4. Unit/integration tests pass
5. Build passes
6. E2E passes (when UI/business workflow changed)
7. No TODOs, stubs, or placeholders
8. Commit/PR message includes what changed + what was verified

---

## Quick Commands

```bash
# Core verification (before EVERY commit)
pnpm check          # TypeScript
pnpm lint           # ESLint
pnpm test           # Unit tests
pnpm build          # Build verification

# Roadmap
pnpm roadmap:validate
pnpm validate:sessions

# Deployment verification
./scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)
curl https://terp-app-b9s35.ondigitalocean.app/api/health
```

If a required command cannot be run, mark verification as **UNSURE** and provide a local/CI plan.

---

## Historical Reference

A comprehensive expanded version (from 2025-12-17) is preserved at:
`docs/archive/agent-prompts/UNIVERSAL_AGENT_RULES.md` (22KB)

---

*Last updated: 2026-02-03*
*Source of truth: CLAUDE.md + .kiro/steering/*
