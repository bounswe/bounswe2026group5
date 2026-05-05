import { expect, type Page } from '@playwright/test';

export class DiscoverPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/discover');
    await expect(this.page.getByRole('heading', { name: /Discover the Curated Network/i })).toBeVisible();
  }

  async search(query: string) {
    await this.page.getByLabel('Search profiles, skills, or projects...').fill(query);
  }

  async openMentorProfile(mentorName: string) {
    const card = this.page.locator('.island-shell', { has: this.page.getByRole('heading', { name: mentorName }) }).first();
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'View Profile' }).click();
  }
}
