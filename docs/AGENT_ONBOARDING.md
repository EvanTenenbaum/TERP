# TERP Agent Onboarding

**Purpose:** Quick start guide for new development agents working on TERP.

**Last Updated:** November 6, 2025

---

## 🚨 **STOP! Read This First.**

Your work will be **rejected** if you do not follow these protocols. Read this document carefully.

---

## 🚀 **Onboarding in 5 Minutes**

### **Step 1: Read The Bible (MANDATORY)**

- **[DEVELOPMENT_PROTOCOLS.md](./DEVELOPMENT_PROTOCOLS.md)** (10 min)
  - This is **The Bible**. It contains all rules and standards.
  - You **MUST** follow these protocols. No exceptions.

### **Step 2: Read the Testing Protocol (MANDATORY)**

- **[Section 13 of The Bible](./DEVELOPMENT_PROTOCOLS.md#13-testing-protocol-mandatory)** (5 min)
  - **No code without tests.** This is the most important rule.
  - TDD is the required workflow.
  - All tests must pass.

### **Step 3: Read the Project Context**

- **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** (5 min)
  - Understand the system architecture and tech stack.

### **Step 4: Check Your Assignment**

- **[roadmaps/ACTIVE.md](./roadmaps/ACTIVE.md)** (2 min)
  - See what you are working on right now.

---

## 📋 **Your Workflow (MANDATORY)**

### **At Start of Every Session**

1.  ✅ Read `notes/user-feedback.md` (owner's latest instructions)
2.  ✅ Read `HANDOFF_CONTEXT.md` (what the last agent did)
3.  ✅ Read `roadmaps/ACTIVE.md` (your current assignment)
4.  ✅ Re-read Section 13 of The Bible (Testing Protocol)

### **During Work (TDD Cycle)**

1.  ✅ **Create Test File**: Copy `pricing.test.ts` template.
2.  ✅ **Write Failing Test (Red)**: `pnpm test your-file.test.ts`
3.  ✅ **Write Code to Pass (Green)**: Make the test pass.
4.  ✅ **Refactor**: Clean up your code.
5.  ✅ **Repeat**: For all functionality.

### **Before Committing**

1.  ✅ **Run All Tests**: `pnpm test` (must be 100% passing)
2.  ✅ **Check for Errors**: `pnpm run check` (must be zero TS errors)

### **Before Ending Session**

1.  ✅ Update `HANDOFF_CONTEXT.md` with your progress.
2.  ✅ Commit and push all changes.

---

## ❌ **Prohibited Actions (Immediate Rejection)**

- **DO NOT** write code without tests.
- **DO NOT** commit failing or skipped tests.
- **DO NOT** use `git commit --no-verify`.
- **DO NOT** ignore The Bible protocols.

---

## ✅ **Checklist: Am I Ready?**

- [ ] I have read **The Bible** (`DEVELOPMENT_PROTOCOLS.md`).
- [ ] I have read and understood the **Testing Protocol (Section 13)**.
- [ ] I will use **TDD** for all my work.
- [ ] I will **not commit failing tests** or TS errors.

If you have checked all boxes, you are ready. Start with `roadmaps/ACTIVE.md`. 🚀
