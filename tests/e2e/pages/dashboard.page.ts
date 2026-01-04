import { expect, Page } from "@playwright/test";

export class DashboardPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  }

  async openNavigationLink(label: string): Promise<void> {
    await this.page.getByRole("link", { name: label }).first().click();
  }
}
