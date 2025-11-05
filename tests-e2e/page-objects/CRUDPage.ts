import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CRUDEntity {
  name: string;
  listUrl: string;
  createButtonSelector?: string;
  formSelectors: Record<string, string>;
  tableSelector?: string;
  createData: Record<string, any>;
  editData: Record<string, any>;
}

export class CRUDPage extends BasePage {
  constructor(page: Page, private entity: CRUDEntity) {
    super(page);
  }

  async gotoList() {
    await this.goto(this.entity.listUrl);
  }

  async verifyListPage() {
    const tableSelector = this.entity.tableSelector || 'table';
    await this.waitForSelector(tableSelector);
    await expect(this.page.locator(tableSelector)).toBeVisible();
    await this.takeScreenshot(`${this.entity.name}-list`);
    await this.checkAccessibility();
  }

  async clickCreate() {
    const createButtonSelector = this.entity.createButtonSelector || 'button:has-text("Create"), button:has-text("New"), button:has-text("Add")';
    await this.click(createButtonSelector);
    await this.page.waitForLoadState('networkidle');
  }

  async fillForm(data: Record<string, any>) {
    for (const [field, value] of Object.entries(data)) {
      const selector = this.entity.formSelectors[field];
      if (!selector) {
        console.warn(`No selector found for field: ${field}`);
        continue;
      }

      if (typeof value === 'string') {
        await this.fill(selector, value);
      } else if (typeof value === 'boolean') {
        const isChecked = await this.page.isChecked(selector);
        if (isChecked !== value) {
          await this.click(selector);
        }
      }
    }
  }

  async submitForm() {
    await this.page.click('button[type="submit"], button:has-text("Save"), button:has-text("Submit")');
    await this.page.waitForLoadState('networkidle');
  }

  async verifySuccess() {
    // Look for success indicators
    const successSelectors = [
      'text="Success"',
      'text="Created"',
      'text="Updated"',
      'text="Saved"',
      '[role="alert"]:has-text("Success")',
      '.toast:has-text("Success")',
    ];

    let found = false;
    for (const selector of successSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 });
        found = true;
        break;
      } catch {
        // Continue to next selector
      }
    }

    if (!found) {
      // If no success message, just verify we're not on an error page
      const errorSelectors = ['text="Error"', '[role="alert"]:has-text("Error")'];
      for (const selector of errorSelectors) {
        await expect(this.page.locator(selector)).not.toBeVisible();
      }
    }
  }

  async create(data: Record<string, any>) {
    await this.clickCreate();
    await this.fillForm(data);
    await this.takeScreenshot(`${this.entity.name}-create-form`);
    await this.submitForm();
    await this.verifySuccess();
    await this.takeScreenshot(`${this.entity.name}-created`);
  }

  async clickFirstRow() {
    const tableSelector = this.entity.tableSelector || 'table';
    await this.page.click(`${tableSelector} tbody tr:first-child`);
    await this.page.waitForLoadState('networkidle');
  }

  async clickEdit() {
    await this.page.click('button:has-text("Edit")');
    await this.page.waitForLoadState('networkidle');
  }

  async edit(data: Record<string, any>) {
    await this.clickFirstRow();
    await this.clickEdit();
    await this.fillForm(data);
    await this.takeScreenshot(`${this.entity.name}-edit-form`);
    await this.submitForm();
    await this.verifySuccess();
    await this.takeScreenshot(`${this.entity.name}-edited`);
  }

  async clickDelete() {
    await this.page.click('button:has-text("Delete")');
  }

  async confirmDelete() {
    // Look for confirmation dialog
    await this.page.click('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
    await this.page.waitForLoadState('networkidle');
  }

  async delete() {
    await this.clickFirstRow();
    await this.clickDelete();
    await this.confirmDelete();
    await this.verifySuccess();
    await this.takeScreenshot(`${this.entity.name}-deleted`);
  }
}
