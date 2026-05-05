import { expect, type Page } from '@playwright/test';

export class SchedulePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async openFromNavigation() {
    await this.page.getByRole('navigation').getByRole('link', { name: 'Schedule', exact: true }).click();
    await expect(this.page).toHaveURL(/\/schedule/);
  }

  async goto() {
    await this.page.goto('/schedule');
  }

  async expectMenteeSchedule() {
    await expect(this.page.getByRole('heading', { name: 'Learning Schedule' })).toBeVisible();
  }

  async expectMentorSchedule() {
    await expect(this.page.getByRole('heading', { name: 'Teaching Schedule' })).toBeVisible();
  }

  async expectSession(session: { peerName: string; date: string; time: string; status: string }) {
    const row = this.page.getByRole('row', { name: new RegExp(`${session.date}.*${session.time}.*${session.peerName}.*${session.status}`) });
    await expect(row).toBeVisible();
  }

  async expectSessionNotListed(peerName: string) {
    await expect(this.page.getByRole('link', { name: peerName })).toHaveCount(0);
  }

  async openPeerProfile(peerName: string) {
    await this.page.getByRole('link', { name: peerName }).click();
  }

  async goToNextMonth() {
    await this.page.getByRole('button').filter({ has: this.page.locator('svg.lucide-chevron-right') }).click();
  }

  async filterBySessionDate(dayNumber: string, peerName: string) {
    await this.page.getByRole('button', { name: new RegExp(`${dayNumber}.*${peerName}`) }).click();
  }
}
