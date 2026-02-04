# TERP Documentation Map

> **Complete map of documentation locations and their purposes.**

---

## Root-Level Documentation

| File | Purpose | Status |
|------|---------|--------|
| `README.md` | Project overview and quick start | ✅ Active |
| `CLAUDE.md` | **Primary AI agent protocol** | ✅ Active |
| `AGENTS.md` | Technical stack reference for agents | ✅ Active |
| `UNIVERSAL_AGENT_RULES.md` | Quick reference to steering files | ✅ Active |
| `DEPLOY.md` | Deployment quick reference | ✅ Active |
| `CHANGELOG.md` | Version history | ✅ Active |

---

## Agent Documentation Hierarchy

```
CLAUDE.md                              ← PRIMARY ENTRY POINT
│
├── UNIVERSAL_AGENT_RULES.md           ← Quick reference
│
├── .kiro/steering/                    ← Canonical detailed protocols
│   ├── 00-core-identity.md
│   ├── 01-development-standards.md
│   ├── 02-workflows.md
│   ├── 03-agent-coordination.md
│   ├── 04-infrastructure.md
│   ├── 05-external-agent-handoff.md
│   ├── 06-architecture-guide.md
│   ├── 07-deprecated-systems.md
│   ├── 08-adaptive-qa-protocol.md
│   ├── 10-mvp-initiative.md
│   ├── 11-mvp-iteration-protocol.md
│   └── 99-pre-commit-checklist.md
│
├── .claude/                           ← Claude Code specific
│   ├── agents/                        ← Role definitions
│   ├── commands/                      ← Audit commands
│   └── AGENT_ONBOARDING.md           ← Redirect to CLAUDE.md
│
├── .manus/                            ← Manus AI specific
│   ├── PROMPTS/                       ← Phase prompts
│   └── qa-system/                     ← QA agent system
│
└── .cursor/                           ← Cursor AI specific
    └── rules/
```

---

## docs/ Directory Structure

### Active Documentation
| Directory | Files | Purpose |
|-----------|-------|---------|
| `api/` | 14 | API endpoint documentation |
| `architecture/` | 2 | System architecture |
| `deployment/` | 35 | Deployment procedures |
| `guides/` | 8 | How-to guides |
| `protocols/` | 10 | Development standards |
| `roadmaps/` | 98 | Project roadmaps |
| `specs/` | 131 | Feature specifications |
| `templates/` | 6 | Document templates |
| `testing/` | 56 | Test documentation |
| `user-guide/` | 8 | End-user docs |

### Reference/Reports
| Directory | Files | Purpose |
|-----------|-------|---------|
| `qa/` | 72 | QA reports |
| `sessions/` | 187 | Work session logs |
| `audits/` | 21 | Audit reports |

### Historical
| Directory | Files | Purpose |
|-----------|-------|---------|
| `archive/` | 554 | Archived/deprecated docs |
| `prompts/` | 381 | Historical prompt versions |

---

## Tool-Specific Locations

| Tool | Config Location | Docs Location |
|------|-----------------|---------------|
| Claude Code | `.claude/` | `.claude/agents/` |
| Cursor | `.cursor/` | `.cursor/rules/` |
| Manus | `.manus/` | `.manus/qa-system/` |
| Kiro | `.kiro/` | `.kiro/steering/` |
| GitHub Actions | `.github/` | `.github/agents/` |

---

## Migration Notes

### Consolidated from Multiple Locations
The following locations previously contained agent instructions and have been consolidated:

| Old Location | Status | Migrated To |
|--------------|--------|-------------|
| `agent-prompts/` | Active (role-specific) | Keep for now |
| `docs/agent-prompts/` | Consider archiving | `.kiro/steering/` |
| `docs/agent_prompts/` | Versioned prompts | Archive older versions |
| `product-management/_system/chat-contexts/` | PM-specific | Keep for PM system |

### Root Files to Consider Relocating
These files at repository root could be moved to `docs/`:
- `API_Documentation.md` → `docs/api/`
- `Testing_Guide.md` → `docs/testing/`
- `PROJECT_CONTEXT.md` → `docs/`
- Various QA reports → `docs/qa/` or `docs/archive/`

---

*Last updated: 2026-02-03*
*This map should be updated when documentation structure changes.*
