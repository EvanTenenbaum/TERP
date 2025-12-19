# Parallel Execution Groups - Optimal Agent Assignment

**Analysis Date:** November 14, 2025  
**Total Tasks:** 27  
**Recommended Parallel Agents:** 5-6  
**Estimated Total Time:** 3-4 weeks → **1-2 weeks with parallelization**

---

## 🎯 Grouping Strategy

Tasks are grouped by:

1. **Module isolation** - No file conflicts
2. **Logical flow** - Related features together
3. **Balanced workload** - Similar effort per group
4. **Dependencies** - QA-005 must complete first

---

## 🚨 CRITICAL: Run First (Sequential)

### **Agent 0: Data Access Investigation (BLOCKER)**

**Must complete before all other work**

**Tasks:** QA-005 only  
**Estimated Time:** 16-24 hours (2-3 days)  
**Why Sequential:** This systemic issue likely affects all modules. Fix it first.

**Prompt:**

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute task QA-005 from the roadmap.

This is the HIGHEST PRIORITY task - it blocks all other work. The application shows "No data found" across all modules despite metrics showing data exists.

Investigation required:
1. Check database connection and credentials
2. Verify authentication/authorization middleware
3. Check API endpoint responses
4. Verify user permissions and roles
5. Check database seeding/migration status

Follow the complete 4-phase protocol in .claude/AGENT_ONBOARDING.md.
```

---

## 🔴 After QA-005 Complete: Run These 5 Groups in Parallel

### **Group 1: Missing Core Modules (Agent 1)**

**Tasks:** QA-001, QA-002, QA-004  
**Modules:** Todo Lists, Accounting, Analytics  
**Estimated Time:** 20-40 hours (3-5 days)  
**Conflict Risk:** None (separate modules)

**Why Together:**

- All are 404 errors for missing modules
- Similar implementation pattern
- No file overlap
- Can reuse routing/structure patterns

**Combined Prompt:**

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-001, QA-002, and QA-004 from the roadmap in sequence.

Implement three missing modules that return 404 errors:
1. QA-001: Todo Lists module (/todo)
2. QA-002: Accounting module (/accounting)
3. QA-004: Analytics module (/analytics)

For each module:
- Create proper routing
- Implement basic UI
- Ensure data displays correctly
- Follow the 4-phase protocol for each task

Complete all three tasks in one session, creating separate commits for each.

Estimated effort: 20-40 hours total
Priority: P0 - CRITICAL
```

---

### **Group 2: COGS + Dashboard Buttons (Agent 2)**

**Tasks:** QA-003, QA-006, QA-007, QA-008, QA-009  
**Modules:** COGS Settings, Dashboard  
**Estimated Time:** 12-24 hours (2-3 days)  
**Conflict Risk:** Low (different modules)

**Why Together:**

- QA-003 is standalone COGS module
- QA-006-009 are all dashboard button fixes
- Dashboard buttons likely need similar fixes
- Can batch-fix all dashboard navigation issues

**Combined Prompt:**

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-003, QA-006, QA-007, QA-008, and QA-009 from the roadmap in sequence.

Fix five navigation issues:
1. QA-003: COGS Settings module 404 (/cogs-settings)
2. QA-006: Dashboard Vendors button 404
3. QA-007: Dashboard Purchase Orders button 404
4. QA-008: Dashboard Returns button 404
5. QA-009: Dashboard Locations button 404

For each: Either implement the module/page or remove/disable the button if not needed.

Complete all five tasks in one session, creating separate commits for each.

Estimated effort: 12-24 hours total
Priority: P0-P1
```

---

### **Group 3: Data Export + Search (Agent 3)**

**Tasks:** QA-010, QA-011, QA-012  
**Modules:** Inventory, Orders, Global Search  
**Estimated Time:** 20-30 hours (3-4 days)  
**Conflict Risk:** Low (different modules)

**Why Together:**

- QA-010 and QA-011 both implement CSV export (similar pattern)
- QA-012 is global search (separate feature)
- All are high-priority user-facing features
- Can reuse CSV export logic between Inventory and Orders

**Combined Prompt:**

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-010, QA-011, and QA-012 from the roadmap in sequence.

Implement three high-priority features:
1. QA-010: Export CSV functionality in Inventory module
2. QA-011: Export CSV functionality in Orders module
3. QA-012: Global search functionality

For CSV exports: Implement proper data extraction and file download.
For search: Implement search trigger on Enter key and results display.

Complete all three tasks in one session, creating separate commits for each.

Estimated effort: 20-30 hours total
Priority: P1 - HIGH
```

---

### **Group 4: Workflow + Matchmaking (Agent 4)**

**Tasks:** QA-013, QA-014, QA-015, QA-016  
**Modules:** Workflow Queue, Matchmaking  
**Estimated Time:** 16-24 hours (2-3 days)  
**Conflict Risk:** None (separate modules)

**Why Together:**

- QA-013-014 are both Workflow Queue buttons
- QA-015-016 are both Matchmaking buttons
- Similar pattern: missing button functionality
- Two related modules, no overlap

**Combined Prompt:**

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-013, QA-014, QA-015, and QA-016 from the roadmap in sequence.

Fix four button 404 errors:
1. QA-013: Workflow Queue Analytics button
2. QA-014: Workflow Queue History button
3. QA-015: Matchmaking Add Need button
4. QA-016: Matchmaking Add Supply button

For each: Either implement the feature or remove the button if not needed.

Complete all four tasks in one session, creating separate commits for each.

Estimated effort: 16-24 hours total
Priority: P2 - MEDIUM
```

---

### **Group 5: Save Buttons + Forms (Agent 5)**

**Tasks:** QA-017, QA-018, QA-019, QA-020, QA-021, QA-022  
**Modules:** Clients, Credit Settings, Calendar, Pricing Rules, Pricing Profiles  
**Estimated Time:** 24-36 hours (3-5 days)  
**Conflict Risk:** Low (different modules)

**Why Together:**

- QA-017-019 are all unresponsive save buttons
- QA-020-022 are all form submission testing
- Common pattern: form handling and data persistence
- Can reuse save/submit logic across modules

**Combined Prompt:**

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-017, QA-018, QA-019, QA-020, QA-021, and QA-022 from the roadmap in sequence.

Fix six form-related issues:

Save Buttons:
1. QA-017: Clients - Save button in Customize Metrics
2. QA-018: Credit Settings - Save Changes button
3. QA-019: Credit Settings - Reset to Defaults button

Form Submissions:
4. QA-020: Calendar - Create Event form
5. QA-021: Pricing Rules - Create Rule form
6. QA-022: Pricing Profiles - Create Profile form

For each: Implement proper save/submit functionality with validation and confirmation.

Complete all six tasks in one session, creating separate commits for each.

Estimated effort: 24-36 hours total
Priority: P2 - MEDIUM
```

---

### **Group 6: Testing & Optimization (Agent 6)**

**Tasks:** QA-023, QA-024, QA-025, QA-026, QA-027  
**Modules:** All modules (testing)  
**Estimated Time:** 46-68 hours (6-9 days)  
**Conflict Risk:** Low (mostly testing, not implementation)

**Why Together:**

- All are testing/QA tasks, not feature implementation
- Can be done after other groups complete
- Comprehensive testing across all modules
- Similar methodology and approach

**Combined Prompt:**

```
Clone the TERP repository from https://github.com/EvanTenenbaum/TERP and execute tasks QA-023, QA-024, QA-025, QA-026, and QA-027 from the roadmap in sequence.

Conduct five comprehensive testing initiatives:
1. QA-023: Mobile responsiveness testing (all modules)
2. QA-024: Settings forms testing (Create User, Reset Password, etc.)
3. QA-025: User profile functionality testing
4. QA-026: Performance testing (page load times, API response times)
5. QA-027: Security audit (authentication, vulnerabilities)

For each: Test thoroughly, document findings, and fix any issues discovered.

Complete all five tasks in one session, creating separate commits for each.

Estimated effort: 46-68 hours total
Priority: P3 - LOW
```

---

## 📊 Execution Timeline

### **Week 1: Critical Path**

- **Days 1-3:** Agent 0 completes QA-005 (BLOCKER)
- **Days 4-7:** Agents 1-5 start parallel work

### **Week 2: Parallel Execution**

- **Days 1-5:** Agents 1-5 continue parallel work
- **Days 6-7:** Review and merge PRs

### **Week 3-4: Testing (Optional)**

- **Agent 6:** Comprehensive testing and optimization

---

## 🎯 Optimal Execution Strategy

### **Phase 1: Sequential (Days 1-3)**

```
Agent 0 → QA-005 (Data Access)
```

### **Phase 2: Parallel (Days 4-14)**

```
Agent 1 → QA-001, QA-002, QA-004 (Missing Modules)
Agent 2 → QA-003, QA-006-009 (COGS + Dashboard)
Agent 3 → QA-010-012 (Export + Search)
Agent 4 → QA-013-016 (Workflow + Matchmaking)
Agent 5 → QA-017-022 (Save + Forms)
```

### **Phase 3: Testing (Days 15-28, Optional)**

```
Agent 6 → QA-023-027 (Testing & Optimization)
```

---

## ⚡ Time Savings

### **Sequential Execution:**

- Total: 164-238 hours
- Timeline: 20-30 days (one agent)

### **Parallel Execution (5 agents):**

- Critical path: 16-24 hours (QA-005)
- Parallel work: 24-40 hours (longest group)
- **Total timeline: 5-8 days** (excluding testing)

### **With Testing (6 agents):**

- **Total timeline: 11-17 days**

---

## ✅ Conflict Prevention

Each group works on different modules/files:

- ✅ Group 1: Todo, Accounting, Analytics modules
- ✅ Group 2: COGS, Dashboard module
- ✅ Group 3: Inventory, Orders, Global search
- ✅ Group 4: Workflow Queue, Matchmaking
- ✅ Group 5: Clients, Credit Settings, Calendar, Pricing
- ✅ Group 6: Testing (read-only mostly)

**No file conflicts expected** ✅

---

## 🚀 Ready-to-Use Commands

Copy these exact prompts to spin up your parallel agents:

**Agent 0 (FIRST):**

```
Execute QA-005 from TERP roadmap
```

**Then start these 5 in parallel:**

**Agent 1:**

```
Execute QA-001, QA-002, and QA-004 from TERP roadmap in sequence
```

**Agent 2:**

```
Execute QA-003, QA-006, QA-007, QA-008, and QA-009 from TERP roadmap in sequence
```

**Agent 3:**

```
Execute QA-010, QA-011, and QA-012 from TERP roadmap in sequence
```

**Agent 4:**

```
Execute QA-013, QA-014, QA-015, and QA-016 from TERP roadmap in sequence
```

**Agent 5:**

```
Execute QA-017, QA-018, QA-019, QA-020, QA-021, and QA-022 from TERP roadmap in sequence
```

**Agent 6 (LAST, Optional):**

```
Execute QA-023, QA-024, QA-025, QA-026, and QA-027 from TERP roadmap in sequence
```

---

**Estimated Completion:** 1-2 weeks (vs 4-6 weeks sequential)  
**Speedup:** 3-4x faster with parallel execution
