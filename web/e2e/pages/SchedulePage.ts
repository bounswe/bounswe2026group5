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

  async goToMonth(targetDate: Date) {
    const targetLabel = targetDate.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });

    for (let i = 0; i < 12; i += 1) {
      const currentLabel = (await this.page.getByRole('heading', { level: 3 }).textContent())?.trim();
      if (currentLabel === targetLabel) {
        return;
      }

      await this.page.getByRole('button', { name: 'Next month' }).click();
    }
  }

  async filterBySessionDate(dayNumber: string | Date, peerName: string) {
    void peerName;
    const matcher =
      dayNumber instanceof Date
        ? new RegExp(
            `^${dayNumber.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}`,
          )
        : new RegExp(`^${dayNumber}\\s`);

    await this.page.getByRole('button', { name: matcher }).click();
  }
}
