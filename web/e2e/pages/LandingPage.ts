import { Page, expect } from '@playwright/test';

export class LandingPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectUnauthorizedHeader() {
    // Check that we're not redirected to dashboard
    await expect(this.page).not.toHaveURL(/.*dashboard/);
    // Verify login and register links are visible in the header
    // In the UI, these are "Sign in" and "Get started"
    const header = this.page.locator('header').first();
    const loginLink = header.getByText(/Sign in/i).first();
    const registerLink = header.getByText(/Get started/i).first();
    
    await expect(loginLink).toBeVisible();
    await expect(registerLink).toBeVisible();
  }

  async clickRegister() {
    await this.page.locator('header').first().getByText(/Get started/i).first().click();
  }
}
