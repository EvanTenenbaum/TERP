/**
 * Control-Action Contract Harness (TER-194)
 *
 * Utility to verify that interactive controls (buttons, toggles, dropdowns)
 * trigger their expected actions (API calls, state changes, navigation).
 * Prevents "dead button" regressions.
 *
 * Usage:
 *   import { ControlContract } from "../utils/control-action-contracts";
 *
 *   const contract = new ControlContract(page);
 *   await contract.verifyButtonTriggersNavigation(
 *     'button:has-text("New Order")',
 *     /\/orders\/create/
 *   );
 */

import { type Locator, type Page, expect } from "@playwright/test";

export interface ContractResult {
  control: string;
  action: string;
  passed: boolean;
  detail?: string;
}

export class ControlContract {
  constructor(private page: Page) {}

  private async findFirstVisibleControl(
    controlSelector: string,
    timeout = 5000
  ): Promise<Locator> {
    const controls = this.page.locator(controlSelector);
    await expect(controls.first()).toBeVisible({ timeout });

    const count = await controls.count();
    for (let i = 0; i < Math.min(count, 30); i++) {
      const candidate = controls.nth(i);
      if (await candidate.isVisible().catch(() => false)) {
        return candidate;
      }
    }

    return controls.first();
  }

  /**
   * Verify a button click triggers navigation to a specific URL pattern.
   */
  async verifyButtonTriggersNavigation(
    controlSelector: string,
    expectedUrlPattern: RegExp,
    options: { timeout?: number } = {}
  ): Promise<ContractResult> {
    const { timeout = 10000 } = options;
    const control = await this.findFirstVisibleControl(controlSelector, 5000);
    await expect(control).toBeEnabled();

    await control.click();

    try {
      await this.page.waitForURL(expectedUrlPattern, { timeout });
      return {
        control: controlSelector,
        action: `navigate to ${expectedUrlPattern}`,
        passed: true,
      };
    } catch {
      return {
        control: controlSelector,
        action: `navigate to ${expectedUrlPattern}`,
        passed: false,
        detail: `URL remained: ${this.page.url()}`,
      };
    }
  }

  /**
   * Verify a button click triggers an API call matching a URL pattern.
   */
  async verifyButtonTriggersApiCall(
    controlSelector: string,
    apiUrlPattern: RegExp,
    options: { method?: string; timeout?: number } = {}
  ): Promise<ContractResult> {
    const { method, timeout = 10000 } = options;
    const control = await this.findFirstVisibleControl(controlSelector, 5000);
    await expect(control).toBeEnabled();

    const apiCallPromise = this.page.waitForRequest(
      req => {
        const urlMatch = apiUrlPattern.test(req.url());
        const methodMatch = method
          ? req.method() === method.toUpperCase()
          : true;
        return urlMatch && methodMatch;
      },
      { timeout }
    );

    await control.click();

    try {
      const request = await apiCallPromise;
      return {
        control: controlSelector,
        action: `API ${method ?? "ANY"} to ${apiUrlPattern}`,
        passed: true,
        detail: `${request.method()} ${request.url()}`,
      };
    } catch {
      return {
        control: controlSelector,
        action: `API ${method ?? "ANY"} to ${apiUrlPattern}`,
        passed: false,
        detail: "No matching API call detected",
      };
    }
  }

  /**
   * Verify a button click causes a visible element to appear.
   */
  async verifyButtonShowsElement(
    controlSelector: string,
    expectedElementSelector: string,
    options: { timeout?: number } = {}
  ): Promise<ContractResult> {
    const { timeout = 5000 } = options;
    const control = await this.findFirstVisibleControl(controlSelector, 5000);
    await expect(control).toBeEnabled();

    await control.click();

    try {
      await expect(
        this.page.locator(expectedElementSelector).first()
      ).toBeVisible({ timeout });
      return {
        control: controlSelector,
        action: `show ${expectedElementSelector}`,
        passed: true,
      };
    } catch {
      return {
        control: controlSelector,
        action: `show ${expectedElementSelector}`,
        passed: false,
        detail: `Element not visible after ${timeout}ms`,
      };
    }
  }

  /**
   * Verify a toggle/switch changes a visual indicator.
   * The stateSelector should match when the toggle is in the "on" state.
   */
  async verifyToggleChangesState(
    toggleSelector: string,
    stateIndicatorSelector: string
  ): Promise<ContractResult> {
    const toggle = await this.findFirstVisibleControl(toggleSelector, 5000);

    const indicatorBefore = await this.page
      .locator(stateIndicatorSelector)
      .first()
      .isVisible()
      .catch(() => false);

    await toggle.click();
    await this.page.waitForTimeout(500);

    const indicatorAfter = await this.page
      .locator(stateIndicatorSelector)
      .first()
      .isVisible()
      .catch(() => false);

    const stateChanged = indicatorBefore !== indicatorAfter;

    return {
      control: toggleSelector,
      action: `toggle state via ${stateIndicatorSelector}`,
      passed: stateChanged,
      detail: stateChanged
        ? `State changed: ${indicatorBefore} → ${indicatorAfter}`
        : `State unchanged: both ${indicatorBefore}`,
    };
  }

  /**
   * Verify a button is not disabled / not hidden when it should be interactive.
   */
  async verifyControlIsInteractive(
    controlSelector: string
  ): Promise<ContractResult> {
    const control = this.page.locator(controlSelector).first();
    const isVisible = await control.isVisible().catch(() => false);

    if (!isVisible) {
      return {
        control: controlSelector,
        action: "be visible and interactive",
        passed: false,
        detail: "Control not visible",
      };
    }

    const isDisabled = await control.isDisabled().catch(() => false);

    return {
      control: controlSelector,
      action: "be visible and interactive",
      passed: !isDisabled,
      detail: isDisabled ? "Control is disabled" : "Control is enabled",
    };
  }

  /**
   * Verify a button click causes at least one observable effect.
   * This is useful for catching dead controls in redesigned screens.
   */
  async verifyButtonCausesObservableEffect(
    controlSelector: string,
    options: { timeout?: number } = {}
  ): Promise<ContractResult> {
    const { timeout = 2000 } = options;
    const startedAt = Date.now();
    const debug = process.env.CONTROL_CONTRACT_DEBUG === "1";
    const debugLog = (message: string) => {
      if (!debug) return;
      console.info(
        `[ControlContractCore +${Date.now() - startedAt}ms] ${message}`
      );
    };

    const control = await this.findFirstVisibleControl(controlSelector, 5000);
    await expect(control).toBeEnabled();
    debugLog("control resolved + enabled");

    const urlBefore = this.page.url();
    const dialogsBefore = await this.page.locator('[role="dialog"]').count();
    const toastsBefore = await this.page
      .locator('[role="alert"], [data-sonner-toast]')
      .count();
    const ariaExpandedBefore = await control
      .getAttribute("aria-expanded")
      .catch(() => null);
    const dataStateBefore = await control
      .getAttribute("data-state")
      .catch(() => null);

    let mutationRequestSeen = false;
    const onRequest = (request: { method(): string }) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
        mutationRequestSeen = true;
      }
    };

    this.page.on("request", onRequest);
    try {
      debugLog("starting click");
      const domClicked = await control
        .evaluate(el => {
          if (!(el instanceof HTMLElement)) return false;
          el.click();
          return true;
        })
        .catch(() => false);
      debugLog(`domClicked=${domClicked}`);
      if (!domClicked) {
        await control.scrollIntoViewIfNeeded().catch(() => undefined);
        await control
          .click({ timeout: 3000, force: true, noWaitAfter: true })
          .catch(() => undefined);
        debugLog("forced click attempted");
      }
      await this.page.waitForTimeout(timeout);
      debugLog(`post-click wait complete (${timeout}ms)`);
    } finally {
      this.page.off("request", onRequest);
    }

    const urlAfter = this.page.url();
    const dialogsAfter = await this.page.locator('[role="dialog"]').count();
    const toastsAfter = await this.page
      .locator('[role="alert"], [data-sonner-toast]')
      .count();
    const urlChanged = urlAfter !== urlBefore;

    const ariaExpandedAfter = urlChanged
      ? ariaExpandedBefore
      : await control
          .getAttribute("aria-expanded", { timeout: 300 })
          .catch(() => ariaExpandedBefore);
    const dataStateAfter = urlChanged
      ? dataStateBefore
      : await control
          .getAttribute("data-state", { timeout: 300 })
          .catch(() => dataStateBefore);

    const dialogChanged = dialogsAfter > dialogsBefore;
    const toastChanged = toastsAfter > toastsBefore;
    const expandedChanged = ariaExpandedBefore !== ariaExpandedAfter;
    const dataStateChanged = dataStateBefore !== dataStateAfter;

    const passed =
      urlChanged ||
      dialogChanged ||
      toastChanged ||
      mutationRequestSeen ||
      expandedChanged ||
      dataStateChanged;

    return {
      control: controlSelector,
      action: "cause observable effect",
      passed,
      detail: [
        `urlChanged=${urlChanged}`,
        `dialogChanged=${dialogChanged}`,
        `toastChanged=${toastChanged}`,
        `mutationRequestSeen=${mutationRequestSeen}`,
        `expandedChanged=${expandedChanged}`,
        `dataStateChanged=${dataStateChanged}`,
      ].join(", "),
    };
  }

  /**
   * Run multiple contracts and assert all pass.
   */
  static assertAllPassed(results: ContractResult[]): void {
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      const details = failures
        .map(
          f =>
            `  - [FAIL] ${f.control} → ${f.action}${f.detail ? `: ${f.detail}` : ""}`
        )
        .join("\n");
      throw new Error(
        `${failures.length}/${results.length} control-action contracts failed:\n${details}`
      );
    }
  }
}
