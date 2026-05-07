import { expect, type Page } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded(username: string, displayName: string) {
    await expect(this.page).toHaveURL(new RegExp(`/profiles/${username}`));
    await expect(this.page.locator('h1').filter({ hasText: displayName })).toBeVisible();
    await expect(this.page.getByText('Green slots are available to book.')).toBeVisible();
  }

  async goto(username: string) {
    await this.page.goto(`/profiles/${username}`);
  }

  async goBackToDiscover() {
    await this.page.goBack();
    await expect(this.page).toHaveURL(/\/discover/);
  }

  async expectOwnerAvailabilityEmpty() {
    await expect(this.page.getByText('Click any empty slot to mark yourself as available.')).toBeVisible();
    await expect(this.page.getByText('Available ✕')).toHaveCount(0);
  }

  async createAvailabilityCell(dayIndexFromMonday: number, hour: number) {
    await this.clickAvailabilityCell(dayIndexFromMonday, hour);
    await expect(this.page.getByText('Slot added').first()).toBeVisible();
  }

  async expectAvailabilityCount(count: number) {
    await expect(this.page.getByText('Available ✕')).toHaveCount(count);
  }

  async expectBookableSlots(count: number) {
    await expect(this.page.locator('.cursor-pointer', { hasText: /^Book$/ })).toHaveCount(count);
  }

  async sendMentorshipRequest(coverLetter?: string) {
    await this.page.locator('.cursor-pointer', { hasText: /^Book$/ }).first().click();
    await expect(this.page.getByRole('heading', { name: 'Send Mentorship Request' })).toBeVisible();
    if (coverLetter) {
      await this.page.getByLabel(/Cover Letter/i).fill(coverLetter);
    }
    await this.page.getByRole('button', { name: 'Send Request' }).click();
    await expect(this.page.getByText('Request sent!')).toBeVisible();
  }

  async expectPendingRequestBlocksOtherSlots() {
    await expect(this.page.locator('.cursor-pointer', { hasText: /^Book$/ })).toHaveCount(0);
    await expect(this.page.getByText('Requested')).toBeVisible();
  }

  async expectAverageRating(rating: string | RegExp) {
    await expect(this.page.getByText('Average Rating')).toBeVisible();
    await expect(this.page.getByText(rating).first()).toBeVisible();
  }

  async expectPublicReview(reviewText: string) {
    await expect(this.page.getByText('Reviews')).toBeVisible();
    await expect(this.page.getByText(reviewText)).toBeVisible();
  }

  private async clickAvailabilityCell(dayIndexFromMonday: number, hour: number) {
    const hourIndex = hour - 8;
    const cellIndex = 8 + hourIndex * 8 + 1 + dayIndexFromMonday;
    const grid = this.page.locator('div[style*="grid-template-columns"], div[style*="gridTemplateColumns"]').first();
    await grid.locator(':scope > div').nth(cellIndex).click();
  }
}
