import { expect, type Locator, type Page } from '@playwright/test';

export class DiscoverPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/discover');
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /Discover the Curated Network/i })).toBeVisible();
    await expect(this.page.getByText('All Mentors')).toBeVisible();
  }

  mentorCard(mentorName: string): Locator {
    return this.page.locator('.island-shell', {
      has: this.page.getByRole('heading', { name: mentorName }),
    }).first();
  }

  async expectMentorVisible(mentorName: string) {
    await expect(this.mentorCard(mentorName)).toBeVisible();
  }

  async expectMentorHidden(mentorName: string) {
    await expect(this.mentorCard(mentorName)).toHaveCount(0);
  }

  async openSkillFilter() {
    await this.page.getByRole('button', { name: /Filter by skill/i }).click();
  }

  async selectSkill(skill: string) {
    await this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(skill)}$`) }).click();
  }

  async expectSelectedSkillCount(count: number) {
    await expect(this.page.getByText(`${count} selected ${count === 1 ? 'skill' : 'skills'}`)).toBeVisible();
  }

  async clearFilters() {
    await this.page.getByRole('button', { name: /Clear all/i }).click();
  }

  async expectPopularSectionVisible() {
    await expect(this.page.getByRole('heading', { name: 'Popular Mentors' })).toBeVisible();
  }

  async expectRecentlyJoinedSectionVisible() {
    await expect(this.page.getByRole('heading', { name: 'Recently Joined' })).toBeVisible();
  }

  async openMentorProfile(mentorName: string) {
    await this.mentorCard(mentorName).getByRole('button', { name: /View Profile/i }).click();
  }

  async search(value: string) {
    await this.page.getByLabel('Search profiles, skills, or projects...').fill(value);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
