import { expect, type Page } from '@playwright/test';

export class AdminModerationPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/admin-moderation');
  }

  async expectLoaded() {
    await expect(this.page.getByText('Admin Moderation', { exact: true })).toBeVisible();
  }

  async switchToReports() {
    await this.page.getByRole('button', { name: /Reports/i }).click();
  }

  async switchToUsers() {
    await this.page.getByRole('button', { name: /User Management/i }).click();
  }

  async searchUser(username: string) {
    await this.page.getByPlaceholder(/Search by email or username/i).fill(username);
  }

  async banUser(username: string) {
    // Find the row with the username and click the Ban button
    const row = this.page.locator('tr').filter({ hasText: username }).first();
    await row.getByRole('button', { name: /Ban/i }).click();
    
    // Confirm in dialog
    await expect(this.page.getByRole('heading', { name: /Ban User/i })).toBeVisible();
    await this.page.getByRole('button', { name: /Ban User/i }).click();
  }

  async expectUserBanned(username: string) {
    const row = this.page.locator('tr').filter({ hasText: username }).first();
    await expect(row.getByText(/Banned/i)).toBeVisible();
  }

  async reviewReport(reportedUsername: string) {
    const row = this.page.locator('tr').filter({ hasText: reportedUsername }).first();
    await row.getByRole('button', { name: /Review/i }).click();
  }

  async resolveReport(note: string) {
    await this.page.getByPlaceholder(/Add a note/i).fill(note);
    await this.page.getByRole('button', { name: /Resolve/i }).click();
  }

  async expectToast(message: string | RegExp) {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }
}
