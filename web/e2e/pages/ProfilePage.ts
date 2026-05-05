import { expect, type Page } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded(username: string, displayName: string) {
    await expect(this.page).toHaveURL(new RegExp(`/profiles/${username}`));
    await expect(this.page.getByRole('heading', { name: displayName })).toBeVisible();
    await expect(this.page.getByText('Green slots are available to book.')).toBeVisible();
  }

  async sendMentorshipRequest(coverLetter: string) {
    await this.page.locator('.cursor-pointer', { hasText: /^Book$/ }).first().click();
    await expect(this.page.getByRole('heading', { name: 'Send Mentorship Request' })).toBeVisible();
    await this.page.getByLabel(/Cover Letter/i).fill(coverLetter);
    await this.page.getByRole('button', { name: 'Send Request' }).click();
    await expect(this.page.getByText('Request sent!')).toBeVisible();
  }
}
