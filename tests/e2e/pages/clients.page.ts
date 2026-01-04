import { expect, Page } from "@playwright/test";

export class ClientsPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/clients/);
    await expect(this.page.getByText(/Add Client/i)).toBeVisible();
  }
}
