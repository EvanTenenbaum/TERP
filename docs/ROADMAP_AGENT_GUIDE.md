'''

# TERP Agent Onboarding Protocol

**Welcome to the TERP project.** This document is your entry point for contributing. Follow these instructions exactly.

---

## 🎯 Your Mission

Your mission is to execute tasks from the TERP roadmap, following a strict, 4-phase protocol to ensure quality, consistency, and collaboration.

---

## 🚀 Getting Started: How to Execute a Task

When the user asks you to work on a task (e.g., "Execute ST-005 from the TERP roadmap"), follow this process:

### 1. Read the Master Roadmap

Navigate to and read the entire `docs/roadmaps/MASTER_ROADMAP.md` file.

### 2. Find Your Task

Locate the task ID provided by the user in the roadmap.

### 3. Open the Prompt

Click the link in the `Prompt:` field for your task. This will take you to a detailed, step-by-step guide for completing the work.

### 4. Follow the Prompt Exactly

The prompt contains the complete 4-phase workflow. Do not deviate from it. It includes critical steps for:

- **Phase 1: Pre-Flight Check:** Registering your session atomically to prevent conflicts.
- **Phase 2: Session Startup:** Creating a branch and updating the roadmap.
- **Phase 3: Development:** Writing tests and implementing the solution.
- **Phase 4: Completion:** Creating a completion report and pushing directly to main.

---

## 📝 How to Add a New Task to the Roadmap

If the user asks you to add a new task to the roadmap (e.g., "Add a task to implement a new feature"), follow this process:

### 1. STOP! Do NOT Edit the Roadmap Directly

Never edit `docs/roadmaps/MASTER_ROADMAP.md` on the `main` branch directly.

### 2. Read the "How To" Guide

Navigate to and read the `docs/HOW_TO_ADD_TASK.md` file.

### 3. Follow the Checklist

The guide provides a complete checklist for creating a new task, including:

- Creating a new branch.
- Using the `TASK_TEMPLATE.md`.
- Creating a corresponding prompt using `PROMPT_TEMPLATE.md`.
- Adding the new task to the master roadmap.
- Submitting a pull request for review.

---

## ⚠️ Critical Rules

1.  **Always follow the documented workflows.** They are located in `docs/HOW_TO_*.md`.
2.  \*\*NAlways push directly to the `main` branch after completing a task. Do not create pull requests..
3.  **Atomic session registration is mandatory.** You must successfully push your session to `docs/ACTIVE_SESSIONS.md` before starting any work to prevent race conditions.
4.  **Check for module conflicts before starting.** Read `docs/ACTIVE_SESSIONS.md` to ensure no other agent is working on the same files.
5.  **TDD is mandatory.** Write tests before you write implementation code.

---

## 📁 Key Files

- **`docs/ROADMAP_AGENT_GUIDE.md`**: This file.
- **`docs/roadmaps/MASTER_ROADMAP.md`**: The list of all tasks.
- **`docs/prompts/`**: Directory containing detailed, step-by-step task instructions.
- **`docs/templates/`**: All official templates for tasks, prompts, etc.
- **`docs/HOW_TO_*.md`**: The official workflows for all major actions.
- **`docs/ACTIVE_SESSIONS.md`**: A list of all currently active agent sessions.

By following this protocol, you will be a successful contributor to the TERP project. Good luck.
'''
