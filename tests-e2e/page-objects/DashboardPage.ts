import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface DashboardConfig {
  name: string;
  url: string;
  expectedMetrics: string[];
  filterSelectors?: Record<string, string>;
}

export class DashboardPage extends BasePage {
  constructor(page: Page, private config: DashboardConfig) {
    super(page);
  }

  async gotoDashboard() {
    await this.goto(this.config.url);
  }

  async verifyMetrics() {
    for (const metric of this.config.expectedMetrics) {
      // Look for metric by text or data-testid
      const metricLocator = this.page.locator(`text="${metric}", [data-testid="${metric}"]`).first();
      await expect(metricLocator).toBeVisible();
    }
    await this.takeScreenshot(`${this.config.name}-metrics`);
    await this.checkAccessibility();
  }

  async applyFilter(filterName: string, value: string) {
    if (!this.config.filterSelectors || !this.config.filterSelectors[filterName]) {
      throw new Error(`No selector found for filter: ${filterName}`);
    }

    const selector = this.config.filterSelectors[filterName];
    await this.page.selectOption(selector, value);
    await this.page.waitForLoadState('networkidle');
    await this.takeScreenshot(`${this.config.name}-filtered-${filterName}-${value}`);
  }
}
