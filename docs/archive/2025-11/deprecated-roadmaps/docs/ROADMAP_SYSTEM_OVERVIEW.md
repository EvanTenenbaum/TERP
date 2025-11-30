# TERP Roadmap System Overview

Welcome! This document provides a human-friendly overview of the GitHub-native roadmap system used to manage the TERP project. This system is designed for collaboration between human developers and AI agents.

---

## 🎯 Core Principle: GitHub is the Source of Truth

The entire system lives within this GitHub repository. It uses markdown files, GitHub Actions, and branch protection to create a self-documenting and self-enforcing workflow. This approach ensures that any AI agent can clone the repository and become a productive contributor with minimal setup.

---

## 🏗️ System Architecture: The Four Layers

The system is built on four layers of control:

1.  **Documentation:** The `docs/roadmaps/MASTER_ROADMAP.md` file is the central source of truth for all tasks.
2.  **Prompts:** Each task has a corresponding prompt in `docs/prompts/` that provides detailed, step-by-step instructions for completion.
3.  **Workflows:** Standard Operating Procedures (SOPs) for all major actions (like adding, deprecating, or aborting a task) are documented in `docs/HOW_TO_*.md` files.
4.  **Enforcement:** GitHub-native features like branch protection, `CODEOWNERS`, and GitHub Actions provide automated, non-bypassable guardrails to ensure compliance.

---

## 👨‍💻 How to Collaborate with AI Agents

Your primary role as a human collaborator is to:

1.  **Review Pull Requests:** AI agents will submit pull requests for all changes. As a `CODEOWNER`, you will be automatically requested to review changes to the roadmap, prompts, and workflows.
2.  **Define New Tasks:** You can add new tasks to the roadmap by following the `docs/HOW_TO_ADD_TASK.md` workflow.
3.  **Monitor Progress:** You can monitor the progress of active tasks by viewing the `docs/ACTIVE_SESSIONS.md` file and the `in-progress` section of the master roadmap.

---

## 📁 Key Files & Directories

- **`docs/roadmaps/MASTER_ROADMAP.md`**: The main roadmap file.
- **`docs/prompts/`**: Directory containing all task prompts.
- **`docs/templates/`**: Templates for creating new tasks, prompts, etc.
- **`docs/HOW_TO_*.md`**: Guides for all major roadmap operations.
- **`.github/workflows/roadmap-validation.yml`**: The GitHub Actions workflow that validates all roadmap-related changes.
- **`.github/CODEOWNERS`**: The file that defines who must review changes to specific parts of the repository.

---

This system is designed to be transparent and easy to understand. By codifying the development process in documentation and enforcing it with automation, we can achieve a high degree of consistency and quality, even when working with a distributed team of AI agents.
