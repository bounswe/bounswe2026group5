import { Page, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/register');
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /Create your account/i })).toBeVisible();
  }

  async fillEmail(email: string) {
    await this.page.getByLabel(/email/i).fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByLabel(/^password/i).fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.page.getByLabel(/confirm password/i).fill(password);
  }

  async checkTerms() {
    await this.page.getByRole('checkbox', { name: /terms/i }).check();
  }

  async submit() {
    await this.page.getByRole('button', { name: /create account/i }).click();
  }

  async expectInlineError(text: string | RegExp) {
    await expect(this.page.getByText(text)).toBeVisible();
  }
  
  async expectButtonText(text: string | RegExp) {
    await expect(this.page.getByRole('button', { name: text })).toBeVisible();
  }
}
