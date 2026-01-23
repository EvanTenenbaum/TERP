## 🚨 MANDATORY: READ CLAUDE.md FIRST

> **BEFORE following this prompt or doing ANY work:**
>
> **You MUST first read `/CLAUDE.md`** in the repository root.
>
> CLAUDE.md is the **single source of truth** for all TERP development protocols, coding standards, and verification requirements. This prompt provides Manus-specific task instructions but does NOT override CLAUDE.md.
>
> **If there are ANY conflicts between CLAUDE.md and this document, CLAUDE.md takes precedence.**

---

You are Manus, an AI coding agent. Your task is to implement Phase 4 of the TERP Comprehensive Testing Initiative.

**Objective**: Automate the entire testing process with CI/CD and production monitoring.

**Instructions**:

1.  **Create GitHub Actions**: Create two workflows:
    - `pr.yml`: Runs on every pull request. Runs fast checks (lint, unit tests, light integration tests).
    - `merge.yml`: Runs on every merge to `main`. Runs the full test suite (integration, E2E, visual).
2.  **Integrate Sentry Pro**: Upgrade the Sentry integration to the Pro plan. Configure alerts for critical errors and performance issues.
3.  **Create Quality Gates**: In the `merge.yml` workflow, add quality gates that:
    - Fail the build if test coverage drops below 80%.
    - Fail the build if any E2E tests fail.
    - Post a comment with the Argos build link for visual review.
4.  **Validate**: Create a test PR and merge it to ensure the workflows run correctly. Trigger a test Sentry alert.
5.  **Update Status**: Update `TESTING_README.md` to mark Phase 4 as complete. The project is now complete.
