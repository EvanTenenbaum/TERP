# TERP Product Management System v2 - User Guide

**A comprehensive guide to the multi-agent development and project management system with automated status tracking.**

**Version**: 2.0  
**Created**: November 3, 2025

---

## Introduction

Welcome to the next evolution of the TERP Product Management System. This version introduces a powerful multi-agent workflow that enables parallel development, automated status tracking, and intelligent project management.

**Key Enhancements**:
- **Multi-Agent Workflow**: Coordinate multiple development agents and a dedicated project manager agent.
- **Automated Status Tracking**: Real-time visibility into development progress without manual check-ins.
- **Initiative-Based Development**: A new layer for managing larger bodies of work.
- **PM Evaluation Workflow**: A structured process for evaluating, prioritizing, and orchestrating initiatives.

---

## Core Concepts

### 1. Initiatives

An **initiative** is a complete body of work that can be assigned to a development agent. It may include multiple features, documentation, and implementation artifacts. Each initiative has a unique ID (e.g., `TERP-INIT-001`).

### 2. Development Agents

**Development agents** are responsible for:
- Creating and documenting initiatives.
- Implementing the features within an initiative.
- Automatically updating the status of their work.

### 3. Project Manager (PM) Agent

The **PM agent** is responsible for:
- Monitoring all development work via a real-time dashboard.
- Evaluating new initiatives from development agents.
- Prioritizing work and creating roadmaps.
- Detecting conflicts and dependencies.

### 4. Automated Status Tracking

Development agents use a `status-tracker.py` script to automatically update their progress. This feeds a real-time dashboard that the PM agent uses to monitor all work.

---

## Getting Started (5-Minute Tutorial)

### For Development Agents

**Goal**: Create and implement a new initiative.

1.  **Load Your Context**: Start your session with the `dev-agent-context.md` file.

    ```bash
    # In your agent's instructions:
    "Load and follow the instructions in product-management/_system/chat-contexts/dev-agent-context.md"
    ```

2.  **Create an Initiative**:

    ```bash
    python3 product-management/_system/scripts/initiative-manager.py create \
      "Add User Profile Pictures" \
      --tags "user-profile,ui,avatars"
    ```

3.  **Document It**: Fill out the `overview.md` and add feature files in the newly created `initiatives/TERP-INIT-XXX/` directory.

4.  **Submit for Review**:

    ```bash
    python3 product-management/_system/scripts/status-tracker.py update TERP-INIT-XXX \
      --status pending_review \
      --message "Ready for PM evaluation"
    ```

5.  **Implement (After Approval)**:

    ```bash
    # Start work
    python3 product-management/_system/scripts/status-tracker.py update TERP-INIT-XXX \
      --status in-progress

    # As you work, update progress
    python3 product-management/_system/scripts/status-tracker.py complete-task TERP-INIT-XXX "Implemented image upload"
    python3 product-management/_system/scripts/status-tracker.py set-progress TERP-INIT-XXX 50
    ```

6.  **Complete the Initiative**:

    ```bash
    python3 product-management/_system/scripts/status-tracker.py update TERP-INIT-XXX \
      --status completed
    ```

### For the Project Manager Agent

**Goal**: Monitor and manage development work.

1.  **Load Your Context**: Start your session with the `pm-agent-context.md` file.

    ```bash
    # In your agent's instructions:
    "Load and follow the instructions in product-management/_system/chat-contexts/pm-agent-context.md"
    ```

2.  **Check the Dashboard**:

    ```bash
    python3 product-management/_system/scripts/status-tracker.py dashboard
    ```

3.  **Evaluate New Initiatives**:

    ```bash
    # See what's waiting for review
    python3 product-management/_system/scripts/pm-evaluator.py list-inbox

    # Create an evaluation for a new initiative
    python3 product-management/_system/scripts/pm-evaluator.py create-evaluation TERP-INIT-XXX
    ```

4.  **Complete the Evaluation**: Edit the generated `TERP-EVAL-XXX.md` file, providing your analysis and recommendation.

5.  **Approve and Prioritize**:

    ```bash
    python3 product-management/_system/scripts/initiative-manager.py update TERP-INIT-XXX \
      --status approved \
      --priority high
    ```

6.  **Generate a Roadmap**:

    ```bash
    python3 product-management/_system/scripts/pm-evaluator.py generate-roadmap
    ```

---

## Detailed Workflows

### Development Agent Workflow

This workflow details the end-to-end process for a development agent.

| Phase                 | Action                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **1. Conception**     | Have an idea for a new feature or improvement.                                                                                      |
| **2. Create**         | Use `initiative-manager.py create` to create the initiative structure.                                                              |
| **3. Document**       | Fill out `overview.md`, add feature specs to the `features/` directory, and add any other relevant docs to the `docs/` directory.    |
| **4. Submit**         | Use `status-tracker.py update --status pending_review` to submit for PM evaluation.                                                 |
| **5. Wait**           | Wait for the PM agent to approve the initiative.                                                                                    |
| **6. Implement**      | Once approved, use `status-tracker.py update --status in-progress` to start work.                                                   |
| **7. Track Progress** | As you work, use `complete-task`, `set-progress`, and `add-artifact` to automatically update your progress.                           |
| **8. Complete**       | When finished, use `status-tracker.py update --status completed`.                                                                   |

### Project Manager Agent Workflow

This workflow details the end-to-end process for the PM agent.

| Phase                   | Action                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Monitor**          | Regularly run `status-tracker.py dashboard` to get a real-time view of all development work.                                                                        |
| **2. Triage**           | Run `pm-evaluator.py list-inbox` to see new initiatives that need review.                                                                                             |
| **3. Evaluate**         | For each new initiative, run `pm-evaluator.py create-evaluation` and complete the evaluation document. Analyze scope, dependencies, conflicts, priority, and effort. |
| **4. Decide**           | Based on your evaluation, approve, defer, or reject the initiative using `initiative-manager.py update`.                                                              |
| **5. Prioritize**       | For approved initiatives, set a priority (`high`, `medium`, `low`).                                                                                                 |
| **6. Orchestrate**      | Update the `dependencies.json` file to reflect any cross-initiative dependencies.                                                                                   |
| **7. Plan**             | Run `pm-evaluator.py generate-roadmap` and complete the `current.md` roadmap to define the build order and sprint plan.                                               |
| **8. Unblock**          | If the dashboard shows a blocked initiative, investigate the cause and provide guidance to the development agent.                                                     |

---

## Scripts Reference

### `initiative-manager.py`

Used for creating and managing the basic information of initiatives.

| Command          | Description                                       |
| ---------------- | ------------------------------------------------- |
| `create [TITLE]` | Creates a new initiative.                         |
| `list`           | Lists all initiatives.                            |
| `show [ID]`      | Shows detailed information about an initiative.   |
| `update [ID]`    | Updates the status or priority of an initiative.  |
| `stats`          | Shows statistics about all initiatives.           |

### `status-tracker.py`

Used by development agents to automatically update their progress.

| Command                     | Description                                         |
| --------------------------- | --------------------------------------------------- |
| `update [ID] --status ...`  | Updates the status of an initiative.                |
| `complete-task [ID] [TASK]` | Marks a task as complete.                           |
| `set-progress [ID] [PCT]`   | Sets the progress percentage of an initiative.      |
| `add-artifact [ID] [FILE]`  | Adds a file (code, doc, etc.) to the initiative.    |
| `dashboard`                 | Shows the real-time PM dashboard.                   |
| `refresh`                   | Manually refreshes the dashboard data.              |

### `pm-evaluator.py`

Used by the PM agent to evaluate and plan initiatives.

| Command                   | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `list-inbox`              | Lists all initiatives pending PM review.          |
| `create-evaluation [ID]`  | Creates a new evaluation document for an initiative. |
| `list-evaluations`        | Lists all completed evaluations.                  |
| `generate-roadmap`        | Generates a new roadmap template.                 |
| `analyze-dependencies`    | Analyzes and displays cross-initiative dependencies. |

---

## Best Practices

### For All Agents

-   **Communicate Through the System**: Use status updates, evaluation documents, and roadmaps to communicate. Avoid out-of-band communication.
-   **Keep It Up-to-Date**: The system is only as good as the data in it. Keep statuses, progress, and documentation current.
-   **Trust the Process**: Follow the defined workflows to ensure smooth coordination and prevent conflicts.

### For Development Agents

-   **Update Frequently**: Update your status after every significant task. Don't wait until the end of the day.
-   **Be Specific**: In your update messages, be specific about what you accomplished (e.g., "Implemented user login endpoint," not "Made progress").
-   **Document Thoroughly**: A well-documented initiative is easier for the PM agent to evaluate and approve.

### For the PM Agent

-   **Check the Dashboard Often**: The dashboard is your single source of truth. Check it multiple times a day.
-   **Evaluate Promptly**: Don't let new initiatives sit in the inbox. Prompt evaluation keeps the development pipeline full.
-   **Provide Clear Rationale**: When you make a decision (approve, reject, prioritize), explain why. This helps development agents understand the bigger picture.

---

## Conclusion

This multi-agent system is designed to bring structure, visibility, and efficiency to your development process. By automating status updates and providing a clear workflow for evaluation and prioritization, it enables multiple agents to work together seamlessly.

If you have any questions, please refer to the context files in the `_system/chat-contexts/` directory for detailed instructions for each agent role.
