# Agent Execution Prompts V2 (Programmatically Generated)

**Date:** November 14, 2025  
**System:** GitHub-Native Roadmap Management V3.2  
**Prompt Source:** Programmatically generated from `scripts/generate-prompts.ts`

---

## 🎯 How to Use These Prompts

All task prompts are now **programmatically generated** and stored in `docs/prompts/`.

### For Individual Tasks

Simply reference the prompt file:

```
Read and execute the prompt in docs/prompts/QA-001.md from the TERP repository.
```

### For Multiple Tasks (Sequential)

```
Read and execute the prompts in docs/prompts/ for tasks QA-001, QA-002, and QA-004 in sequence from the TERP repository.
```

---

## 🚀 Parallel Execution Groups

### **Agent 0 - Data Access (BLOCKER) - RUN FIRST**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompt in docs/prompts/QA-005.md.

This is the HIGHEST PRIORITY task and blocks all other work.
```

**Wait for Agent 0 to complete before starting Agents 1-5.**

---

### **Agent 1 - Missing Core Modules**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompts in docs/prompts/ for tasks QA-001, QA-002, and QA-004 in sequence.

Complete all three tasks in one session:
1. QA-001: Todo Lists module
2. QA-002: Accounting module
3. QA-004: Analytics module

Follow the 4-phase protocol in each prompt.
Push directly to main after each task (no PRs).
Update the roadmap after each completion.
```

**Estimated Time:** 20-40 hours  
**Priority:** P0 - CRITICAL

---

### **Agent 2 - COGS + Dashboard Buttons**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompts in docs/prompts/ for tasks QA-003, QA-006, QA-007, QA-008, and QA-009 in sequence.

Complete all five tasks in one session:
1. QA-003: COGS Settings module
2. QA-006: Dashboard Vendors button
3. QA-007: Dashboard Purchase Orders button
4. QA-008: Dashboard Returns button
5. QA-009: Dashboard Locations button

Follow the 4-phase protocol in each prompt.
Push directly to main after each task (no PRs).
Update the roadmap after each completion.
```

**Estimated Time:** 12-24 hours  
**Priority:** P0-P1

---

### **Agent 3 - Export + Search**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompts in docs/prompts/ for tasks QA-010, QA-011, and QA-012 in sequence.

Complete all three tasks in one session:
1. QA-010: Export CSV in Inventory module
2. QA-011: Export CSV in Orders module
3. QA-012: Global search functionality

Follow the 4-phase protocol in each prompt.
Push directly to main after each task (no PRs).
Update the roadmap after each completion.
```

**Estimated Time:** 20-30 hours  
**Priority:** P1 - HIGH

---

### **Agent 4 - Workflow + Matchmaking**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompts in docs/prompts/ for tasks QA-013, QA-014, QA-015, and QA-016 in sequence.

Complete all four tasks in one session:
1. QA-013: Workflow Queue - Create button
2. QA-014: Workflow Queue - Bulk Actions button
3. QA-015: Matchmaking - Add Rule button
4. QA-016: Matchmaking - Edit Rule button

Follow the 4-phase protocol in each prompt.
Push directly to main after each task (no PRs).
Update the roadmap after each completion.
```

**Estimated Time:** 16-24 hours  
**Priority:** P2 - MEDIUM

---

### **Agent 5 - Save Buttons + Forms**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompts in docs/prompts/ for tasks QA-017, QA-018, QA-019, QA-020, QA-021, and QA-022 in sequence.

Complete all six tasks in one session:
1. QA-017: Clients - Save button
2. QA-018: Credit Limits - Save button
3. QA-019: Calendar - Save button
4. QA-020: Pricing Rules - Save button
5. QA-021: Pricing Profiles - Save button
6. QA-022: Create User form submission

Follow the 4-phase protocol in each prompt.
Push directly to main after each task (no PRs).
Update the roadmap after each completion.
```

**Estimated Time:** 24-36 hours  
**Priority:** P2 - MEDIUM

---

### **Agent 6 - Testing & Optimization (OPTIONAL)**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompts in docs/prompts/ for tasks QA-023, QA-024, QA-025, QA-026, and QA-027 in sequence.

Complete all five tasks in one session:
1. QA-023: Mobile responsiveness testing
2. QA-024: Settings forms testing
3. QA-025: User profile functionality testing
4. QA-026: Performance testing
5. QA-027: Security audit

Follow the 4-phase protocol in each prompt.
Push directly to main after each task (no PRs).
Update the roadmap after each completion.
```

**Estimated Time:** 46-68 hours  
**Priority:** P3 - LOW

---

## 📋 Execution Checklist

- [ ] Start **Agent 0** (QA-005) - BLOCKER
- [ ] Wait for Agent 0 to complete
- [ ] Start **Agent 1** (QA-001, 002, 004)
- [ ] Start **Agent 2** (QA-003, 006-009)
- [ ] Start **Agent 3** (QA-010-012)
- [ ] Start **Agent 4** (QA-013-016)
- [ ] Start **Agent 5** (QA-017-022)
- [ ] Wait for Agents 1-5 to complete
- [ ] (Optional) Start **Agent 6** (QA-023-027)

---

## ⏱️ Timeline

**Day 1-3:** Agent 0 completes QA-005  
**Day 4-8:** Agents 1-5 work in parallel  
**Day 9-17:** (Optional) Agent 6 testing

**Total Time:** 1-2 weeks (vs 4-6 weeks sequential)

---

## 🔄 Regenerating Prompts

If the protocol changes or tasks are updated:

```bash
cd TERP
npx tsx scripts/generate-prompts.ts
git add docs/prompts/
git commit -m "Regenerate task prompts"
git push origin main
```

All prompts will be regenerated with the latest protocol and task data.

---

## ✅ Key Features

- **Programmatically Generated:** Consistent format, no manual errors
- **Protocol-Compliant:** All prompts include roadmap update steps
- **Push-to-Main:** No PRs, immediate integration
- **Session Management:** Atomic registration, conflict detection
- **Complete Instructions:** 4-phase protocol in every prompt
- **Easy Updates:** Regenerate all prompts with one command

---

**Generated:** 2025-11-14  
**Generator:** scripts/generate-prompts.ts  
**Total Prompts:** 27 (QA-001 through QA-027)
