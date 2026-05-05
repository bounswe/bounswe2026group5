import { Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(this.page.getByText('Login to your account', { exact: true })).toBeVisible();
  }

  async fillEmail(email: string) {
    await this.page.getByLabel(/email/i).fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByLabel(/password/i).fill(password);
  }

  async submit() {
    await this.page.locator('main').getByRole('button', { name: 'Sign in', exact: true }).click();
  }

  async expectInlineError(text: string | RegExp) {
    await expect(this.page.getByText(text)).toBeVisible();
  }
}
