import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function checkAccessibility(page: Page) {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
}
