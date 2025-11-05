import { Page } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';
import { argosScreenshot } from '@argos-ci/playwright';

export class BasePage {
  constructor(public page: Page) {}

  async goto(url: string) {
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await argosScreenshot(this.page, name);
  }

  async checkAccessibility() {
    await injectAxe(this.page);
    await checkA11y(this.page);
  }

  async waitForSelector(selector: string) {
    await this.page.waitForSelector(selector);
  }

  async click(selector: string) {
    await this.page.click(selector);
  }

  async fill(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || '';
  }
}
