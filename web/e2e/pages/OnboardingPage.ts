import { Page, expect } from '@playwright/test';

export class OnboardingPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/.*gettingToKnowYou/);
  }

  async expectQuestion(questionText: string | RegExp) {
    await expect(this.page.getByRole('heading', { level: 1, name: questionText })).toBeVisible();
  }

  async fillInput(value: string) {
    await this.page.getByRole('textbox').first().fill(value);
  }

  async fillTextarea(value: string) {
    await this.page.getByRole('textbox').first().fill(value);
  }

  async selectRole(role: 'mentee' | 'mentor') {
    const label = role === 'mentee' ? 'I want to learn' : 'I want to teach';
    await this.page.getByRole('button', { name: new RegExp(label, 'i') }).click();
  }

  async selectSkill(skill: string) {
    await this.page.getByRole('button', { name: new RegExp(skill, 'i') }).first().click({ timeout: 5000 });
  }

  async clickContinue() {
    await this.page.getByRole('button', { name: /continue/i }).click();
  }

  async clickFinish() {
    await this.page.getByRole('button', { name: /finish/i }).click();
  }

  async expectInlineError(errorText: string | RegExp) {
    await expect(this.page.getByText(errorText)).toBeVisible();
  }
}
