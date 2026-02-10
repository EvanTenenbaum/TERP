/**
 * Selector strategy utilities for E2E tests.
 *
 * POLICY: Prefer selectors in this order:
 * 1. data-testid (most stable)
 * 2. role + name (semantic, accessible)
 * 3. label text (accessible)
 * 4. Specific CSS with data attributes
 *
 * AVOID: text-based selectors, placeholder matching, :has-text with partial match
 */
import { type Page, type Locator } from "@playwright/test";

/**
 * Get an element by its data-testid attribute.
 * This is the preferred selector strategy.
 */
export function byTestId(page: Page, testId: string): Locator {
  return page.getByTestId(testId);
}

/**
 * Get a button by accessible role and name.
 */
export function button(page: Page, name: string | RegExp): Locator {
  return page.getByRole("button", { name });
}

/**
 * Get a link by accessible role and name.
 */
export function link(page: Page, name: string | RegExp): Locator {
  return page.getByRole("link", { name });
}

/**
 * Get a tab by accessible role and name.
 */
export function tab(page: Page, name: string | RegExp): Locator {
  return page.getByRole("tab", { name });
}

/**
 * Get a heading element.
 */
export function heading(
  page: Page,
  name: string | RegExp,
  level?: 1 | 2 | 3 | 4 | 5 | 6
): Locator {
  return page.getByRole("heading", { name, level });
}

/**
 * Get a table row (for data tables).
 */
export function tableRow(page: Page, name?: string | RegExp): Locator {
  return page.getByRole("row", name ? { name } : undefined);
}

/**
 * Get a form input by its label.
 */
export function inputByLabel(page: Page, label: string | RegExp): Locator {
  return page.getByLabel(label);
}

/**
 * Get navigation sidebar link.
 */
export function navLink(page: Page, name: string | RegExp): Locator {
  return page.locator("nav").getByRole("link", { name });
}

/**
 * Get the main content area (inside app shell, excluding sidebar).
 */
export function mainContent(page: Page): Locator {
  return page
    .locator("main, [role='main'], [data-testid='main-content']")
    .first();
}

/**
 * Get a dialog/modal by its title or testid.
 */
export function dialog(page: Page, title?: string | RegExp): Locator {
  if (title) {
    return page.getByRole("dialog").filter({ hasText: title });
  }
  return page.getByRole("dialog").first();
}

/**
 * Get the first visible element from a priority list of selectors.
 * Unlike the old fillFirstVisible pattern, this logs which selector matched.
 */
export async function firstVisible(
  page: Page,
  selectors: string[],
  timeout = 5000
): Promise<{ locator: Locator; matchedSelector: string } | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({
        state: "visible",
        timeout: Math.min(timeout, 2000),
      });
      return { locator, matchedSelector: selector };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * AG-Grid specific selectors (used by golden flow tests).
 */
export const agGrid = {
  container: (page: Page): Locator =>
    page.locator(".ag-root-wrapper, [data-testid*='grid']").first(),

  row: (page: Page, index: number): Locator =>
    page.locator(`.ag-center-cols-container .ag-row[row-index="${index}"]`),

  cell: (page: Page, rowIndex: number, colId: string): Locator =>
    page.locator(
      `.ag-center-cols-container .ag-row[row-index="${rowIndex}"] [col-id="${colId}"]`
    ),

  allRows: (page: Page): Locator =>
    page.locator(".ag-center-cols-container .ag-row"),

  headerCell: (page: Page, colId: string): Locator =>
    page.locator(`.ag-header-cell[col-id="${colId}"]`),
};
