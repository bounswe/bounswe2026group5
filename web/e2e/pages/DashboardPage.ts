import { expect, type Page } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async expectSentRequest(mentorName: string, coverLetter: string) {
    await expect(this.page.getByRole('heading', { name: 'Sent Requests' })).toBeVisible();
    await expect(this.page.getByText(`To: ${mentorName}`)).toBeVisible();
    await expect(this.page.getByText(coverLetter)).toBeVisible();
    await expect(this.page.getByText('PENDING')).toBeVisible();
  }

  async acceptIncomingRequest(menteeName: string, coverLetter: string) {
    await expect(this.page.getByRole('heading', { name: 'Incoming Requests' })).toBeVisible();
    const requestCard = this.page.locator('.island-shell', {
      has: this.page.getByText(`${menteeName} wants to be your mentee.`),
    }).first();

    await expect(requestCard).toBeVisible();
    await expect(requestCard.getByText(coverLetter)).toBeVisible();
    await requestCard.getByRole('button', { name: /Accept/i }).click();
    await expect(this.page.getByText('Request accepted').first()).toBeVisible();
  }

  async expectUpcomingSession(peerName: string) {
    await expect(this.page.getByRole('heading', { name: 'Upcoming Sessions' })).toBeVisible();
    await expect(this.page.getByText(`Session with ${peerName}`).first()).toBeVisible();
  }
}
