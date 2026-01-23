## 🚨 MANDATORY: READ CLAUDE.md FIRST

> **BEFORE following this prompt or doing ANY work:**
>
> **You MUST first read `/CLAUDE.md`** in the repository root.
>
> CLAUDE.md is the **single source of truth** for all TERP development protocols, coding standards, and verification requirements. This prompt provides Manus-specific task instructions but does NOT override CLAUDE.md.
>
> **If there are ANY conflicts between CLAUDE.md and this document, CLAUDE.md takes precedence.**

---

You are Manus, an AI coding agent. Your task is to implement Phase 3 of the TERP Comprehensive Testing Initiative.

**Objective**: Implement end-to-end testing for critical user flows with Argos visual testing.

**Instructions**:

1.  **Verify Argos Integration**: Argos is already integrated. Verify that:
    - `@argos-ci/playwright` is installed
    - `playwright.config.ts` includes the Argos reporter
    - E2E tests use `argosScreenshot()` instead of `page.screenshot()`
    - `.env.example` includes `ARGOS_TOKEN`

2.  **Set Up Argos Token Locally**: The user has provided the Argos token: `argos_34b2c3e186f4849c6c401d8964014a201a`. Add this to `.env` (not `.env.example`):
    ```bash
    ARGOS_TOKEN=argos_34b2c3e186f4849c6c401d8964014a201a
    ```

3.  **Define User Flows**: Ask the user to define 5-10 critical user flows using the `TERP_USER_FLOW_TEMPLATE.md`. Examples:
    - User authentication (sign in, sign out)
    - Order creation (single item, multi-item)
    - Invoice payment
    - Inventory management
    - Client management

4.  **Write E2E Tests**: For each user flow, create a Playwright test that:
    - Follows the steps defined by the user.
    - Uses the Page Object Model pattern for maintainability.
    - Includes accessibility checks with `@axe-core/playwright`.
    - Captures screenshots at key points with `argosScreenshot()`.

5.  **Run Tests Locally**: Run the E2E tests locally to ensure they pass. Screenshots will be saved but not uploaded (since `CI` is not set).

6.  **Create Baseline Build**: Push the tests to GitHub. This will create the first Argos build, which becomes the baseline for future comparisons.

7.  **Validate**: Ask the user to:
    - Review the Argos dashboard at https://app.argos-ci.com/
    - Approve the baseline build
    - Confirm that visual testing is working as expected

8.  **Update Status**: Update `TESTING_README.md` to mark Phase 3 as complete and ask the user to start Phase 4.

**Important Notes**:
- Argos only uploads screenshots when `process.env.CI` is true (on GitHub Actions).
- The first build will be marked as "orphan" until you push to the main branch.
- Read `.manus/ARGOS_SETUP.md` for complete documentation on how Argos works.
