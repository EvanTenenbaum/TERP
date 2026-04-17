# TERP Agent Prompts

**Self-contained AI agent prompts for the TERP autonomous development system**

Each prompt contains everything an AI agent needs to understand their role - credentials must be provided via environment variables.

---

## 🚨 MANDATORY: READ THE PM BUNDLE FIRST

> **BEFORE using any agent prompt in this directory:**
>
> 1. Read `docs/agent-context/START_HERE.md`
> 2. Confirm freshness in `docs/agent-context/manifest.json`
> 3. Use `docs/agent-context/state.json` and `docs/agent-context/work.json` for machine-readable PM truth
> 4. Then read `/CLAUDE.md` in the repository root for repo protocol details
>
> The repo-backed PM bundle under `docs/agent-context/` is the TERP startup contract and current-truth system. `CLAUDE.md` provides agent protocol and verification rules, but it does not replace the PM bundle.
>
> **If there are ANY conflicts between prompt files in this directory and the agent-context bundle, the agent-context bundle takes precedence for PM state and freshness.**

---

## 🚀 Quick Start

Simply give an AI agent one of these URLs:

### Implementation Agent (Development)

```
https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/dev-agent.md
```

**Example instruction:**

> "Read the prompt at https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/dev-agent.md and implement TERP-INIT-007"

### PM Agent (Project Management)

```
https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/pm-agent.md
```

**Example instruction:**

> "Read the prompt at https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/pm-agent.md and review the roadmap"

### Initiative Creator Agent

```
https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/initiative-creator.md
```

**Example instruction:**

> "Read the prompt at https://github.com/EvanTenenbaum/TERP/blob/main/agent-prompts/initiative-creator.md and create an initiative for [feature description]"

---

## ✨ What's Included

Each prompt contains:

- ✅ **Complete role description** - What to do and how to do it
- ✅ **Environment variable references** - How to access credentials securely
- ✅ **Step-by-step workflows** - From start to completion
- ✅ **Code examples** - Ready-to-use commands
- ✅ **Monitoring instructions** - How to check deployment health
- ✅ **Troubleshooting guides** - Common issues and solutions

---

## 🔑 Environment Variables Required

Credentials must be provided via environment variables. Set these in your `.env` file:

### Digital Ocean API

```bash
DO_API_TOKEN="your-digitalocean-api-token"
```

- **Used for**: Deployment monitoring, logs, health checks

### Production Database

```bash
DATABASE_HOST="your-db-host"
DATABASE_PORT="25060"
DATABASE_USER="your-db-user"
DATABASE_PASSWORD="your-db-password"
DATABASE_NAME="defaultdb"
```

### Google Gemini API (for Swarm Manager)

```bash
GOOGLE_GEMINI_API_KEY="your-gemini-api-key"
```

---

## 📚 Resources

- **Master Protocol**: `/CLAUDE.md` (READ FIRST!)
- **TERP Repository**: https://github.com/EvanTenenbaum/TERP
- **Environment Setup**: docs/ENVIRONMENT_VARIABLES.md
- **PM System Overview**: product-management/SYSTEM_DESIGN.md
- **Quick Start Guide**: product-management/START_HERE.md

---

## ⚠️ Security Notice

**NEVER hardcode credentials in agent prompts or code.**

All sensitive information must be stored in:

1. Environment variables (`.env` files - gitignored)
2. CI/CD secrets (for automated deployments)
3. Secure credential managers

See `docs/ENVIRONMENT_VARIABLES.md` for complete setup instructions.

---

**That's it!** Just give an agent the URL and ensure environment variables are configured. The agent will know how to access credentials securely.
