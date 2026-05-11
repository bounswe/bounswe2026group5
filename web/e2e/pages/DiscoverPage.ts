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

  async expectAnyMentorVisible() {
    await expect(this.page.locator('.island-shell').first()).toBeVisible();
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

  async filterBySkill(skill: string) {
    await this.openSkillFilter();
    await this.selectSkill(skill);
    await this.openSkillFilter();
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

  async expectMentorCard(mentorName: string, skill: string) {
    const card = this.mentorCard(mentorName);
    await expect(card).toBeVisible({ timeout: 5_000 });
    await expect(card.getByText(skill, { exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'View Profile' })).toBeVisible();
  }

  async openMentorProfile(mentorName: string) {
    await expect(this.mentorCard(mentorName)).toBeVisible();
    await this.mentorCard(mentorName).getByRole('button', { name: /View Profile/i }).click();
  }

  async openFirstRecentlyJoinedMentorProfile() {
    const recentSection = this.page.locator('div.flex.flex-col.gap-4', {
      has: this.page.getByRole('heading', { name: 'Recently Joined' }),
    }).first();
    const recentCard = recentSection.locator('.island-shell').first();
    await expect(recentCard).toBeVisible();

    const mentorName = (await recentCard.getByRole('heading').first().textContent())?.trim();
    if (!mentorName) {
      throw new Error('Could not determine the first recently joined mentor name.');
    }

    await recentCard.getByRole('button', { name: /View Profile/i }).click();
    return mentorName;
  }

  async search(value: string) {
    await this.page.getByLabel('Search profiles, skills, or projects...').fill(value);
    await this.page.waitForTimeout(400);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
