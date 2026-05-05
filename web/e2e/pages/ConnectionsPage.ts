import { expect, type Page } from '@playwright/test';

export class ConnectionsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/connections');
  }

  async expectMenteeConnection(mentorName: string) {
    await expect(this.page.getByRole('heading', { name: 'My Connections' })).toBeVisible();
    await expect(this.page.getByText(mentorName)).toBeVisible();
  }

  async expectMentorConnection(menteeName: string) {
    await expect(this.page.getByRole('heading', { name: 'My Mentees' })).toBeVisible();
    await expect(this.page.getByText(menteeName)).toBeVisible();
  }

  async expectNoConnection(name: string) {
    await expect(this.page.getByText(name)).toHaveCount(0);
  }
}
