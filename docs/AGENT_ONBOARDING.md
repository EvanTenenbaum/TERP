# 🚀 TERP Agent Onboarding (v4.0)

**Purpose:** Quick start guide for new development agents working on TERP.

**Last Updated:** November 12, 2025

---

## 🚨 **STOP! Read This First.**

Your work will be **rejected** if you do not follow the new workflow system. Read this document carefully.

---

## ✅ **The New Workflow System (Mandatory)**

As of November 12, 2025, TERP uses a new, streamlined workflow system. The old "Bible" (`DEVELOPMENT_PROTOCOLS.md`) has been deprecated.

**You MUST use the new system for all development work.**

---

## 📋 **Step 1: Read the Mandatory Prompt**

**Action:** Read `docs/NEW_AGENT_PROMPT.md` in full.

This document contains the **mandatory 4-phase workflow** that you must follow for every task:

1.  **Phase 1:** Pre-Flight Check (verify roadmap, check active sessions, declare task)
2.  **Phase 2:** Session Startup & Automation (create session, branch, update roadmap)
3.  **Phase 3:** Development (TDD, code quality, push-to-main)
4.  **Phase 4:** Completion & Merge (user approval, final checks, archive session)

**You may not skip any phase or any checklist item within a phase.**

---

## 📚 **Step 2: Read the Core Documentation**

After reading the mandatory prompt, read these documents in order:

1.  **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** (5 minutes)
    - A 1-page summary of the entire workflow.
    - Keep this open in a tab while you work.

2.  **[CLAUDE_WORKFLOW.md](./CLAUDE_WORKFLOW.md)** (15 minutes)
    - The complete, detailed guide to the workflow system.
    - Explains the single source of truth, parallel development, and deployment cycle.

3.  **[MASTER_ROADMAP.md](./roadmaps/MASTER_ROADMAP.md)** (5 minutes)
    - The single source of truth for all tasks.
    - You will pick your task from the "Current Sprint" section.

4.  **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** (5 minutes)
    - Understand the system architecture and tech stack.

**Total Reading Time:** 30 minutes

---

## 🎯 **Step 3: Start Your First Task**

Once you have read all the documentation, you are ready to start your first task.

**Follow the 4-phase workflow from `NEW_AGENT_PROMPT.md` exactly.**

1.  **Phase 1:** Complete the Pre-Flight Check.
2.  **Phase 2:** Verify that the session automation completes successfully.
3.  **Phase 3:** Develop using TDD and push-to-main.
4.  **Phase 4:** Complete the final checklist before reporting "done."

---

## ❌ **Prohibited Actions (Immediate Rejection)**

- **DO NOT** skip any phase of the mandatory workflow.
- **DO NOT** write code without tests (TDD is mandatory).
- **DO NOT** commit failing or skipped tests.
- **DO NOT** use `git commit --no-verify`.
- **DO NOT** work on a task that is already assigned to another active session.
- **DO NOT** report a task as "done" without completing the Phase 4 checklist.

---

## ✅ **Checklist: Am I Ready?**

- [ ] I have read **NEW_AGENT_PROMPT.md** and understand the 4-phase workflow.
- [ ] I have read **QUICK_REFERENCE.md** and know the 3 commands.
- [ ] I have read **CLAUDE_WORKFLOW.md** and understand the single source of truth.
- [ ] I have read **MASTER_ROADMAP.md** and can identify unassigned tasks.
- [ ] I will follow the mandatory workflow for every task.

If you have checked all boxes, you are ready. Start with Phase 1 of the mandatory workflow. 🚀

---

## 📞 **Questions or Issues?**

- **For workflow questions:** Re-read `CLAUDE_WORKFLOW.md`.
- **For task questions:** Check `MASTER_ROADMAP.md`.
- **For technical questions:** Ask the user.

**DO NOT** make assumptions or skip steps. The system only works if all agents follow the workflow exactly.
