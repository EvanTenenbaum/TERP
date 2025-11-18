# Agent Prompt: Configure Sentry Monitoring

**Objective:** Configure Sentry monitoring for a new project, including alert rules and uptime monitoring.

**Context:** The Sentry SDK has been installed and configured in the codebase, but the Sentry.io dashboard and UptimeRobot monitoring have not been set up. This task involves configuring the Sentry project, creating alert rules, and setting up an UptimeRobot monitor for the health endpoint.

**Sentry API Key:** `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`
**UptimeRobot API Key:** `u3183829-bd5bb0d188513f19f76e56ff`

**Checklist:**

1.  **Configure Sentry Environment Variables:**
    *   Add `VITE_SENTRY_DSN` and `SENTRY_DSN` to the production environment (e.g., Digital Ocean).

2.  **Create Sentry Alert Rules (via API):**
    *   Use the provided Sentry API key to create the following alert rules:
        *   **Alert: New Errors:** Triggers when a new issue is created.
        *   **Alert: High Frequency Errors:** Triggers when an issue is seen more than 100 times in 1 hour.
        *   **Alert: Error Regression:** Triggers when a resolved issue re-appears.
    *   Ensure all alerts send email notifications to issue owners/active members.

3.  **Set Up UptimeRobot Monitoring (via API):**
    *   Use the provided UptimeRobot API key to create a new HTTP monitor.
    *   **URL:** `https://terp-app-qkqhc.ondigitalocean.app/health`
    *   **Interval:** 5 minutes
    *   **Name:** "TERP App Health Check"

4.  **Update Documentation:**
    *   Update the `MASTER_ROADMAP.md` to mark the Sentry configuration task as complete.
    *   Add a completion summary to `SENTRY_QA_ANALYSIS.md`.

5.  **Commit and Push Changes:**
    *   Commit all documentation changes to the `main` branch.

**Success Criteria:**

*   Sentry alert rules are created and active.
*   UptimeRobot monitor is created and active.
*   All documentation is updated and pushed to the `main` branch.
*   A completion report is generated and delivered to the user.
