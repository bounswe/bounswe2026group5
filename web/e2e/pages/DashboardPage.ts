import { Page, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/.*dashboard/);
    await expect(this.page.getByRole('link', { name: /Open profile page/i })).toBeVisible();
  }

  async logout() {
    await this.page.getByRole('button', { name: /Sign out/i }).click();
  }
}
