# Live QA Agent Prompt - Integration Guide

## Overview

This directory contains the official **Live QA Agent Prompt Template** for the TERP project. When a user says **"live qa"**, agents should use this template to perform comprehensive quality assurance testing on the live production site.

---

## File Structure

```
docs/agent_prompts/live_qa/
├── README.md                  # This file - integration guide
├── live_qa_prompt.md          # The official QA agent prompt (v2.0)
└── [future: example reports]  # Sample QA reports for reference
```

---

## How It Works

### User Command
```
User: "live qa"
```

### Agent Response
The agent should:

1. **Recognize the command** as a request to perform live production QA
2. **Load the template** from `docs/agent_prompts/live_qa/live_qa_prompt.md`
3. **Follow the 4-phase process** defined in the template:
   - Phase 1: Pre-Flight Check (8 mandatory steps)
   - Phase 2: Session Startup & Automation
   - Phase 3: Systematic Testing & Issue Logging
   - Phase 4: Reporting & Completion
4. **Deliver a comprehensive QA report** with all findings

---

## Template Location

**Primary File:**
```
/home/ubuntu/TERP/docs/agent_prompts/live_qa/live_qa_prompt.md
```

**GitHub URL:**
```
https://github.com/EvanTenenbaum/TERP/blob/main/docs/agent_prompts/live_qa/live_qa_prompt.md
```

---

## Integration Points

The Live QA process integrates with the following TERP workflow components:

| Component | Integration Point | Purpose |
|-----------|------------------|---------|
| **MASTER_ROADMAP.md** | Phase 1, Step 3 | QA agent identifies assigned modules from roadmap |
| **ACTIVE_SESSIONS.md** | Phase 1, Step 4 | Prevents conflicts with other active sessions |
| **QA_TASKS_BACKLOG.md** | Phase 4, Step 2 | All issues are logged as tasks in backlog |
| **Session Files** | Phase 2 & 4 | QA session tracked in `docs/sessions/active/` then archived |
| **Production Site** | Phase 1, Step 5 | Testing performed on live URL |
| **TERP_DESIGN_SYSTEM.md** | Phase 3, Step 3 | UI/UX verification against design system |

---

## Documentation Updates

The following documentation has been updated to reference the "live qa" command:

### 1. QUICK_REFERENCE.md
**Section Added:** "🔬 Live QA"
**Location:** After "📊 Check Status" section
**Content:** Brief explanation of the "live qa" command and what it does

### 2. CLAUDE_WORKFLOW.md
**Section to Add:** "🔬 Live QA & The Testing Suite" (recommended before Troubleshooting)
**Content:** Detailed explanation of the QA process and how it fits into the Testing Suite

### 3. DEVELOPMENT_PROTOCOLS.md (The Bible)
**Section to Add:** Under "Testing Suite" or "Quality Assurance Protocols"
**Content:** Reference to the Live QA prompt and when to use it

---

## When to Use "Live QA"

### Recommended Scenarios

**Before Major Releases:**
- Before deploying to production
- After completing a sprint
- Before client demos

**After Significant Changes:**
- After merging multiple features
- After database migrations
- After design system updates

**Periodic Health Checks:**
- Weekly QA sessions
- Monthly comprehensive reviews
- Post-deployment verification

**When Issues Are Suspected:**
- User reports bugs
- Monitoring alerts triggered
- After emergency fixes

---

## QA Report Output

When the QA agent completes testing, the following artifacts are created:

### 1. QA Report
**File:** `docs/sessions/completed/QA_REPORT_[Session-ID].md`
**Contains:**
- Summary of issues found
- Priority distribution (P0/P1/P2/P3)
- Detailed issue descriptions
- Screenshots and reproduction steps

### 2. Updated Backlog
**File:** `docs/roadmaps/QA_TASKS_BACKLOG.md`
**Contains:**
- New tasks for each issue found
- Unique QA-XXX IDs
- Priority and module assignments

### 3. Screenshots
**Directory:** `qa_screenshots/[Session-ID]/`
**Contains:**
- Visual evidence for each issue
- Organized by module and issue number

---

## Testing Coverage

The Live QA template ensures comprehensive testing across **7 critical layers**:

1. **Smoke Testing** - Does it load? Any obvious issues?
2. **Functional Testing** - Do all features work as expected?
3. **UI/UX Verification** - Does it match the design system? Is it intuitive?
4. **Data Integrity** - Is data displayed correctly?
5. **Performance Testing** - Are page loads fast? Any slow API calls?
6. **Error Handling & Security** - Are errors handled gracefully? Is auth working?
7. **Regression Testing** - Are previously fixed bugs still fixed?

This ensures that the QA process is as rigorous as the TERP Standard QA Protocols require.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **v2.0** | 2025-11-19 | Enhanced with 10 critical improvements (test data verification, performance testing, security testing, etc.) |
| **v1.0** | 2025-11-19 | Initial release with 4-phase structure |

---

## Future Enhancements

Planned improvements for future versions:

- **v2.1:** Add example QA reports for reference
- **v2.1:** Add time estimates for each phase
- **v2.1:** Add "Common Issues Checklist"
- **v3.0:** Integrate with automated testing tools (Argos, etc.)
- **v3.0:** Add visual regression testing protocols

---

## Support & Questions

For questions about the Live QA process:
1. Check this README first
2. Review the template at `live_qa_prompt.md`
3. Consult the TERP Bible (`DEVELOPMENT_PROTOCOLS.md`)
4. Ask the user for clarification

---

## Quick Start for Agents

When you see **"live qa"**, do this:

```bash
# 1. Navigate to TERP repo
cd /home/ubuntu/TERP

# 2. Read the QA prompt template
cat docs/agent_prompts/live_qa/live_qa_prompt.md

# 3. Follow the 4-phase process exactly as written

# 4. Deliver comprehensive QA report to user
```

That's it! The template contains all the instructions you need.
