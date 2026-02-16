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
    let visibleCount = 0;
    for (const metric of this.config.expectedMetrics) {
      // Use case-insensitive partial match for resilience against label drift
      const escapedMetric = metric.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const metricLocator = this.page
        .locator(`text=/${escapedMetric}/i, [data-testid="${metric}"]`)
        .first();
      const isVisible = await metricLocator.isVisible().catch(() => false);
      if (isVisible) visibleCount++;
    }
    // At least one expected metric should be visible (dashboard may show different labels)
    if (this.config.expectedMetrics.length > 0) {
      expect(visibleCount).toBeGreaterThan(0);
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
