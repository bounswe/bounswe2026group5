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

  async filterBySkill(skill: string) {
    await this.page.getByRole('button', { name: 'Filter by skill' }).click();
    await this.page.getByRole('button', { name: skill }).click();
  }

  async openMentorProfile(mentorName: string) {
    const mentorCard = this.page.locator('.island-shell', {
      has: this.page.getByRole('heading', { name: mentorName }),
    }).first();

    await expect(mentorCard).toBeVisible();
    await mentorCard.getByRole('button', { name: /View Profile/i }).click();
  }
}
