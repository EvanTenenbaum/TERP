# Agent Deployment URLs

Quick deployment links for all 10 agents. Each link points to the agent's specific prompt file in GitHub.

## 🚀 Deploy All Agents

Copy and paste each URL into a new Manus session to deploy that agent:

### Agent 1: Critical 404 Fixes (P0)
**Tasks:** QA-001, QA-002, QA-003  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-01-CRITICAL-404S.md`

### Agent 2: Dashboard 404 Fixes (P1)
**Tasks:** QA-006, QA-007, QA-008  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-02-DASHBOARD-404S.md`

### Agent 3: Export Functionality (P1)
**Tasks:** QA-010, QA-011  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-03-EXPORT-FIXES.md`

### Agent 4: Settings & Forms (P1-P2)
**Tasks:** QA-017, QA-018, QA-019  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-04-SETTINGS-FORMS.md`

### Agent 5: Calendar & Events (P2)
**Tasks:** QA-020, QA-046  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-05-CALENDAR-EVENTS.md`

### Agent 6: Database & Performance (ST)
**Tasks:** ST-005, ST-015, ST-017  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-06-DB-PERFORMANCE.md`

### Agent 7: Testing Infrastructure (ST)
**Tasks:** ST-016, (ST-010 partial)  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-07-TESTING-INFRA.md`

### Agent 8: Monitoring & Observability (ST)
**Tasks:** ST-008, ST-009  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-08-MONITORING.md`

### Agent 9: Code Quality (RF)
**Tasks:** RF-003, RF-006  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-09-CODE-QUALITY.md`

### Agent 10: Performance Optimization (RF)
**Tasks:** RF-002, RF-004  
**URL:** `https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-10-PERFORMANCE.md`

---

## 📋 Deployment Instructions

### For Manus Interface:
1. Open 10 new Manus sessions (one for each agent)
2. In each session, paste: "Execute the prompt at [URL]"
3. Replace [URL] with the specific agent's URL above
4. Start all agents simultaneously

### For Command Line:
```bash
# Download and execute each agent prompt
for i in {01..10}; do
  curl -s "https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/docs/agent-prompts/AGENT-${i}-*.md" | manus execute
done
```

---

## 📊 Monitoring

Watch progress in real-time:
- **Active Sessions:** https://github.com/EvanTenenbaum/TERP/blob/main/docs/ACTIVE_SESSIONS.md
- **Roadmap:** https://github.com/EvanTenenbaum/TERP/blob/main/docs/roadmaps/MASTER_ROADMAP.md
- **Deployment Status:** https://cloud.digitalocean.com/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4

---

**Total Agents:** 10  
**Total Tasks:** 25  
**Estimated Completion:** 1-2 days (parallel)  
**Created:** 2025-11-14
