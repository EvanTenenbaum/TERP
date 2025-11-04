# TERP Agent Prompts

**Centralized prompts for AI agents working on the TERP project**

This directory contains complete, self-contained prompts for each agent type. Simply give an agent the URL to the appropriate prompt and they'll have everything they need to start working.

---

## Quick Start

### For Development Agents
**Prompt URL**: https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/dev-agent.md

Give this URL to a development agent and say:
> "Read the prompt at this URL and start working on TERP-INIT-XXX"

### For QA Agents
**Prompt URL**: https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/qa-agent.md

Give this URL to a QA agent and say:
> "Read the prompt at this URL and verify TERP-INIT-XXX"

### For PM Agents
**Prompt URL**: https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/pm-agent.md

Give this URL to a PM agent and say:
> "Read the prompt at this URL and manage the TERP project"

---

## What's Included in Each Prompt

Each prompt contains:
- ✅ **Complete role description** - What the agent should do
- ✅ **API keys and credentials** - Digital Ocean, GitHub, Database
- ✅ **Step-by-step workflows** - How to complete tasks
- ✅ **Code examples** - Ready-to-use commands
- ✅ **Monitoring instructions** - How to check deployment health
- ✅ **Troubleshooting guides** - Common issues and solutions
- ✅ **Best practices** - Quality standards and guidelines
- ✅ **Quick reference** - Most-used commands

---

## Agent Types

| Agent Type | Role | Prompt URL | Key Responsibilities |
|------------|------|------------|---------------------|
| **Development** | Build features | [dev-agent.md](dev-agent.md) | Implement, test, deploy |
| **QA** | Verify quality | [qa-agent.md](qa-agent.md) | Test, verify, approve |
| **PM** | Manage project | [pm-agent.md](pm-agent.md) | Approve, prioritize, monitor |

---

## How It Works

### 1. Agent Receives URL

You give an agent one of the prompt URLs above.

### 2. Agent Reads Prompt

The agent reads the complete instructions from GitHub.

### 3. Agent Starts Working

The agent has everything needed:
- What to do
- How to do it
- API keys to use
- Commands to run
- How to monitor progress

### 4. Agent Coordinates via PM System

All agents use the same PM system to coordinate:
- **Dev agents** update status as they work
- **QA agents** verify and approve
- **PM agents** monitor and prioritize

---

## Key Features

### Self-Contained
Each prompt is complete - no need to search for additional documentation.

### Always Up-to-Date
Prompts are in GitHub, so updates are versioned and accessible to all agents.

### API Keys Included
Agents have immediate access to:
- Digital Ocean API (for deployment monitoring)
- GitHub (for code access)
- Database credentials (for verification)

### Deployment Monitoring Built-In
Every agent type is instructed to:
- Check deployment status
- Monitor logs
- Verify production health
- Report issues early

---

## Example Usage

### Starting a Development Agent

```bash
# Human to AI Agent:
"Please read this prompt and start working:
https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/dev-agent.md

Pick up TERP-INIT-007 (Accounting Module) and implement it."
```

The agent will:
1. Read the complete dev-agent.md prompt
2. Clone the TERP repo
3. Update status to "in-progress"
4. Implement the feature
5. Monitor deployment
6. Hand off to QA

### Starting a QA Agent

```bash
# Human to AI Agent:
"Please read this prompt and verify the deployment:
https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/qa-agent.md

Verify TERP-INIT-007 is working correctly in production."
```

The agent will:
1. Read the complete qa-agent.md prompt
2. Check deployment health via Digital Ocean API
3. Run test scenarios
4. Verify database state
5. Either approve or report bugs

### Starting a PM Agent

```bash
# Human to AI Agent:
"Please read this prompt and manage the project:
https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/pm-agent.md

Review the current roadmap and approve any pending initiatives."
```

The agent will:
1. Read the complete pm-agent.md prompt
2. Review pending initiatives
3. Approve/reject based on criteria
4. Monitor overall project health
5. Coordinate dev and QA agents

---

## Updating Prompts

To update a prompt:

```bash
# Edit the prompt file
cd TERP/agent-prompts
nano dev-agent.md  # or qa-agent.md, pm-agent.md

# Commit changes
git add dev-agent.md
git commit -m "Update dev agent prompt: Add new API endpoint examples"
git push origin main
```

All future agents will automatically get the updated prompt!

---

## API Keys Reference

All prompts include these credentials:

### Digital Ocean API
```
dop_v1_528408bf76b243af7d996080a71ac8059484bea8a8bd9c724439da99428a585d
```

**Used for**:
- Checking deployment status
- Viewing build and runtime logs
- Monitoring application health
- Triggering deployments

### Database (Production)
```
Host: terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com
Port: 25060
User: doadmin
Password: AVNS_yEKEhPWr5qFJwqJaQnC
Database: defaultdb
SSL: REQUIRED
```

**Used for**:
- Verifying migrations
- Checking data integrity
- Running read-only queries (QA)

### Production App
```
https://terp-app-b9s35.ondigitalocean.app
```

---

## Resources

- **TERP Repository**: https://github.com/EvanTenenbaum/TERP
- **PM Dashboard**: https://evantenenbaum.github.io/TERP/
- **PM System Overview**: https://github.com/EvanTenenbaum/TERP/blob/main/TERP-PM-COORDINATION-SYSTEM.md
- **Production App**: https://terp-app-b9s35.ondigitalocean.app

---

## Support

If an agent encounters issues:
1. Check the troubleshooting section in the relevant prompt
2. Review recent commits in GitHub
3. Check Digital Ocean deployment logs
4. Create a GitHub issue if needed

---

## Version History

- **v1.0** (2025-11-04): Initial release with dev, QA, and PM agent prompts
  - Complete workflows for each agent type
  - Digital Ocean API integration
  - Deployment monitoring instructions
  - Database access credentials
  - Quick reference commands

---

**Remember**: These prompts are designed to be self-sufficient. An agent should be able to start working immediately after reading the appropriate prompt!
