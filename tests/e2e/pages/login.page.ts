import { expect, Page } from "@playwright/test";

export class LoginPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async assertLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "TERP" })
    ).toBeVisible();
    await expect(
      this.page.getByText("Sign in to your account", { exact: false })
    ).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await this.page.fill("#username", username);
    await this.page.fill("#password", password);
    await this.page.getByRole("button", { name: /sign in/i }).click();
  }
}
