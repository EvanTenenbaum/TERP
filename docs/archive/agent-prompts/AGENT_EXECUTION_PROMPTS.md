# Agent Execution Prompts - Next Roadmap Phase

**Date:** November 14, 2025  
**Roadmap Version:** V3.2  
**Total QA Tasks:** 27 (5 P0, 7 P1, 10 P2, 5 P3)  
**Recommended Execution Order:** P0 → P1 → P2 → P3

---

## 🎯 Quick Start - Copy & Paste These Prompts

### For ANY AI Agent (Claude, ChatGPT, Cursor, etc.)

Simply copy one of the prompts below and paste it into your AI agent. The agent will:

1. Clone the TERP repository
2. Read the roadmap and task details
3. Execute the task following the protocol
4. Submit a PR for your review

---

## 🔴 P0 - CRITICAL PRIORITY (Start Here)

### Prompt 1: Fix Systemic Data Access Issues (HIGHEST PRIORITY)

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-005 from the roadmap.

This is the HIGHEST PRIORITY task - it blocks all other work. The application shows "No data found" across all modules despite metrics showing data exists (e.g., 4,400 orders, $96M inventory).

Investigation required:
1. Check database connection and credentials
2. Verify authentication/authorization middleware
3. Check API endpoint responses
4. Verify user permissions and roles
5. Check database seeding/migration status

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md:
- Phase 1: Register session atomically
- Phase 2: Create branch and update roadmap
- Phase 3: Investigate and fix the issue
- Phase 4: Create completion report and submit PR

Estimated effort: 16-24 hours
Priority: P0 - CRITICAL
```

---

### Prompt 2: Fix Todo Lists Module 404

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-001 from the roadmap.

The Todo Lists module (/todo) returns a 404 error. Implement the module or properly route it.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 4-8 hours
Priority: P0 - CRITICAL
```

---

### Prompt 3: Fix Accounting Module 404

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-002 from the roadmap.

The Accounting module (/accounting) returns a 404 error. This is a core business function that must be available.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 8-16 hours
Priority: P0 - CRITICAL
```

---

### Prompt 4: Fix COGS Settings Module 404

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-003 from the roadmap.

The COGS Settings module (/cogs-settings) returns a 404 error. This is essential for cannabis business cost calculations.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 4-8 hours
Priority: P0 - CRITICAL
```

---

### Prompt 5: Fix Analytics Module 404

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-004 from the roadmap.

The Analytics module (/analytics) returns a 404 error. Analytics is a core feature for business intelligence.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 8-16 hours
Priority: P0 - CRITICAL
```

---

## 🔴 P1 - HIGH PRIORITY (After P0 Complete)

### Prompt 6: Fix Dashboard Navigation Buttons

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-006, QA-007, QA-008, and QA-009 from the roadmap.

Four dashboard buttons return 404 errors:
- Vendors button
- Purchase Orders button
- Returns button
- Locations button

Fix all four or remove/disable them if modules aren't implemented.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 8-16 hours total (2-4h each)
Priority: P1 - HIGH
```

---

### Prompt 7: Fix Export CSV Functionality

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-010 and QA-011 from the roadmap.

The Export CSV buttons in Inventory and Orders modules are unresponsive. Implement CSV export functionality for both modules.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 8-12 hours total (4-6h each)
Priority: P1 - HIGH
```

---

### Prompt 8: Fix Global Search

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-012 from the roadmap.

The global search bar accepts input but doesn't trigger search on Enter. Implement search functionality.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 8-12 hours
Priority: P1 - HIGH
```

---

## 🟡 P2 - MEDIUM PRIORITY (After P1 Complete)

### Prompt 9: Fix Workflow Queue Buttons

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-013 and QA-014 from the roadmap.

The Analytics and History buttons in Workflow Queue return 404 errors. Implement these features or remove the buttons.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 8-12 hours total
Priority: P2 - MEDIUM
```

---

### Prompt 10: Fix Matchmaking Buttons

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-015 and QA-016 from the roadmap.

The Add Need and Add Supply buttons in Matchmaking return 404 errors. Implement these features.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 8-12 hours total
Priority: P2 - MEDIUM
```

---

### Prompt 11: Fix Save Buttons

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-017, QA-018, and QA-019 from the roadmap.

Three save buttons are unresponsive:
- Clients: Save button in Customize Metrics
- Credit Settings: Save Changes button
- Credit Settings: Reset to Defaults button

Implement proper save functionality for all three.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 6-12 hours total
Priority: P2 - MEDIUM
```

---

### Prompt 12: Test and Fix Form Submissions

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-020, QA-021, and QA-022 from the roadmap.

Three forms need end-to-end testing and fixes:
- Calendar: Create Event form
- Pricing Rules: Create Rule form
- Pricing Profiles: Create Profile form

Test each form and fix any issues found.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 12-18 hours total
Priority: P2 - MEDIUM
```

---

## 🟢 P3 - LOW PRIORITY (After P2 Complete)

### Prompt 13: Mobile Responsiveness Testing

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-023 from the roadmap.

Conduct comprehensive mobile responsiveness testing across all modules. Identify and fix responsive design issues.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 16-24 hours
Priority: P3 - LOW
```

---

### Prompt 14: Settings Forms Testing

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-024 from the roadmap.

Test all form submissions in the Settings module:
- Create User
- Reset Password
- Assign Role
- Create Role

Fix any issues found.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 6-8 hours
Priority: P3 - LOW
```

---

### Prompt 15: User Profile Testing

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-025 from the roadmap.

Test user profile functionality including profile display, editing, password change, and avatar upload.

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 4-6 hours
Priority: P3 - LOW
```

---

### Prompt 16: Performance Testing

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-026 from the roadmap.

Conduct comprehensive performance testing:
- Measure page load times for all modules
- Measure API response times
- Identify performance bottlenecks
- Optimize slow queries/endpoints

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 16-24 hours
Priority: P3 - LOW
```

---

### Prompt 17: Security Audit

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-027 from the roadmap.

Conduct comprehensive security audit:
- Test authentication/authorization
- Test for SQL injection vulnerabilities
- Test for XSS vulnerabilities
- Test for CSRF vulnerabilities
- Verify secure credential storage

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.

Estimated effort: 16-24 hours
Priority: P3 - LOW
```

---

## 📊 Execution Strategy

### Recommended Approach

**Week 1: P0 Critical Bugs**

- Day 1-2: QA-005 (Systemic data access) - HIGHEST PRIORITY
- Day 3: QA-001, QA-003 (Todo, COGS modules)
- Day 4-5: QA-002, QA-004 (Accounting, Analytics modules)

**Week 2: P1 High Priority**

- Day 1-2: QA-006 through QA-009 (Dashboard buttons)
- Day 3: QA-010, QA-011 (Export CSV)
- Day 4-5: QA-012 (Global search)

**Week 3: P2 Medium Priority**

- Day 1: QA-013 through QA-016 (Workflow, Matchmaking)
- Day 2: QA-017 through QA-019 (Save buttons)
- Day 3-5: QA-020 through QA-022 (Form testing)

**Week 4: P3 Low Priority**

- Day 1-2: QA-023 (Mobile testing)
- Day 3: QA-024, QA-025 (Settings, Profile)
- Day 4-5: QA-026, QA-027 (Performance, Security)

---

## 🚀 Parallel Execution

You can run multiple agents in parallel on different tasks. The roadmap system prevents conflicts through atomic session registration.

**Safe Parallel Combinations:**

- QA-001 + QA-002 + QA-003 + QA-004 (Different modules)
- QA-006 + QA-007 + QA-008 + QA-009 (Different buttons)
- QA-010 + QA-011 (Different modules)
- QA-020 + QA-021 + QA-022 (Different forms)

**Do NOT run in parallel:**

- QA-005 (Systemic issue - may affect all other work)
- Tasks that modify the same files

---

## 💡 Tips for Success

1. **Start with QA-005** - It's the highest priority and blocks other work
2. **One task at a time** - Unless you're confident about parallel execution
3. **Follow the protocol** - The 4-phase workflow ensures quality
4. **Check for conflicts** - Session registration prevents race conditions
5. **Test thoroughly** - All changes should be tested before PR submission

---

## 📝 Example Usage

### For Manus:

```
Execute QA-005 from TERP roadmap
```

### For Claude.ai:

```
Clone https://github.com/EvanTenenbaum/TERP and execute task QA-005 following the protocol in .claude/AGENT_ONBOARDING.md
```

### For ChatGPT (with GitHub access):

```
Access the TERP repository at https://github.com/EvanTenenbaum/TERP, read the roadmap, and execute task QA-005 following the onboarding protocol
```

### For Cursor:

```
Open the TERP repository and execute task QA-005 from docs/roadmaps/MASTER_ROADMAP.md
```

---

## ✅ Success Criteria

Each task is complete when:

- ✅ Session registered atomically
- ✅ Feature branch created
- ✅ Code implemented and tested
- ✅ All validation scripts pass
- ✅ Completion report created
- ✅ PR submitted for review

---

**Document Created:** November 14, 2025  
**Ready for:** Immediate agent execution  
**Next Action:** Copy a prompt and start executing tasks!
