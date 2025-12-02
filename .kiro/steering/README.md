# TERP Kiro Steering Files

**Version**: 2.0  
**Last Updated**: 2025-12-02  
**Status**: Active

These files are **automatically included** in every Kiro AI agent session. They provide universal context and protocols for all agents working on TERP.

---

## File Structure

| File | Purpose | Inclusion |
|------|---------|-----------|
| `00-core-identity.md` | Core identity, Kiro best practices, universal rules | Always |
| `01-development-standards.md` | TypeScript, React, testing, database, accessibility standards | Always |
| `02-workflows.md` | Git, deployment, testing, session management workflows | Always |
| `03-agent-coordination.md` | Multi-agent synchronization and conflict prevention | Always |
| `04-infrastructure.md` | DigitalOcean deployment, database, monitoring | Always |
| `terp-master-protocol.md` | Roadmap Manager specific protocols | Always |

---

## How Steering Files Work

### Automatic Inclusion

All files with `inclusion: always` in frontmatter are automatically loaded into agent context:

```yaml
---
inclusion: always
---
```

### Reading Order

Agents should understand protocols in this order:
1. **00-core-identity.md** - Who you are, what Kiro is
2. **01-development-standards.md** - How to write code
3. **02-workflows.md** - How to work (git, deploy, test)
4. **03-agent-coordination.md** - How to coordinate with other agents
5. **04-infrastructure.md** - How to deploy and monitor
6. **terp-master-protocol.md** - Role-specific (Roadmap Manager)

### Role-Specific Protocols

After reading steering files, agents should read their role-specific guide:
- **Roadmap Manager**: `terp-master-protocol.md` (in steering)
- **Implementation Agent**: `agent-prompts/implementation-agent.md`
- **PM Agent**: `agent-prompts/pm-agent.md`
- **QA Agent**: `agent-prompts/qa-agent.md`
- **Initiative Creator**: `agent-prompts/initiative-creator.md`

---

## Updating Steering Files

### When to Update

Update steering files when:
- Protocols change
- New best practices emerge
- Tools or infrastructure change
- Kiro capabilities change
- Common issues need addressing

### How to Update

```bash
# 1. Edit the relevant file
# Use Kiro's strReplace or text editor

# 2. Test with an agent
# Verify the updated protocol works

# 3. Commit with clear message
git add .kiro/steering/
git commit -m "docs: update [file] to clarify [topic]"
git push origin main

# 4. Changes take effect immediately
# (steering files are always included)
```

### Version Control

- Use git history for versions (no version numbers in filenames)
- Document significant changes in commit messages
- Keep files focused and concise

---

## Consolidation History

### Version 2.0 (2025-12-02)

**Consolidated from**:
- `AGENT_ONBOARDING.md` → workflows and infrastructure
- `docs/NEW_AGENT_PROMPT.md` → workflows
- `docs/AGENT_MONITORING_GUIDE.md` → coordination
- `docs/protocols/` → development standards
- `docs/testing/TERP_AI_AGENT_INTEGRATION_GUIDE.md` → standards
- `.github/CONTRIBUTING.md` → standards and workflows

**Archived**:
- `AGENT_EXECUTION_PROMPTS.md` → `docs/archive/agent-prompts/`
- `AGENT_EXECUTION_PROMPTS_V2.md` → `docs/archive/agent-prompts/`
- `docs/AGENT_COPY_PASTE_PROMPTS.md` → `docs/archive/agent-prompts/`
- `docs/AGENT_PROMPTS_PARALLEL_BATCH*.md` → `docs/archive/agent-prompts/`

**Benefits**:
- Single source of truth for protocols
- No duplication or version confusion
- Automatic inclusion in all agent sessions
- Clear hierarchy and organization
- Kiro-specific best practices included

---

## Quick Reference

### For New Agents

Read in order:
1. `00-core-identity.md` - Start here
2. `01-development-standards.md` - Code quality
3. `02-workflows.md` - How to work
4. `03-agent-coordination.md` - Multi-agent work
5. `04-infrastructure.md` - Deployment
6. Your role-specific guide in `agent-prompts/`

### For Experienced Agents

Quick refreshers:
- **Git workflow**: `02-workflows.md` → Git Workflow
- **Testing**: `01-development-standards.md` → Testing Standards
- **Deployment**: `04-infrastructure.md` → DigitalOcean Deployment
- **Coordination**: `03-agent-coordination.md` → Session Management

### For Roadmap Manager

Primary files:
- `terp-master-protocol.md` - Your specific protocols
- `03-agent-coordination.md` - Coordinating other agents
- `02-workflows.md` → Roadmap Management Workflow

---

## Troubleshooting

### "I don't see the steering files in my context"

They're automatically included - you don't need to read them manually. Just follow the protocols.

### "Protocols conflict with each other"

Hierarchy:
1. Role-specific protocols (e.g., `terp-master-protocol.md`)
2. Steering files (`.kiro/steering/`)
3. Documentation (` docs/`)

If conflict exists, higher in hierarchy wins.

### "Protocol is unclear"

1. Check related steering files for context
2. Look at existing code for patterns
3. Check `docs/protocols/` for detailed guides
4. Ask user for clarification

### "Need to add new protocol"

1. Determine which file it belongs in
2. Add to appropriate section
3. Test with agent
4. Commit and push

---

## Maintenance

### Monthly Review

- [ ] Review all steering files for accuracy
- [ ] Update outdated information
- [ ] Add new best practices discovered
- [ ] Remove obsolete protocols
- [ ] Test with fresh agent session

### After Major Changes

- [ ] Update steering files to reflect changes
- [ ] Test with multiple agent types
- [ ] Document breaking changes
- [ ] Notify team of updates

---

## Contact

Questions about steering files? Check:
- This README
- Individual file documentation
- `docs/protocols/` for detailed guides
- Git history for change context

---

**These steering files are the foundation of TERP's AI-native development workflow. Keep them accurate, concise, and up-to-date.**
