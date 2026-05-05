import { expect, type Page } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/.*dashboard/);
    await expect(this.page.getByRole('link', { name: /Open profile page/i })).toBeVisible();
  }

  async logout() {
    await this.page.getByRole('button', { name: /Sign out/i }).click();
  }

  async expectNotification(title: string, messagePart: string) {
    await expect(this.page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    const notification = this.page.locator('.border-l-4', { hasText: title }).filter({ hasText: messagePart }).first();
    await expect(notification).toBeVisible();
  }

  async openSessionManager(peerName: string) {
    const sessionCard = this.page.locator('.island-shell', {
      has: this.page.getByText(`Session with ${peerName}`),
    }).first();

    await expect(sessionCard).toBeVisible();
    await sessionCard.getByRole('button', { name: 'Manage Session' }).click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async rescheduleSession(newSlot: { dayLabel: string; timeLabel: string }) {
    await this.page.getByRole('button', { name: 'Reschedule' }).click();
    await expect(this.page.getByRole('heading', { name: 'Pick a New Time Slot' })).toBeVisible();

    for (let i = 0; i < 4; i += 1) {
      await this.page.getByRole('button').filter({ has: this.page.locator('svg.lucide-chevron-right') }).click();
    }

    const oldBookedSlot = this.page.locator('button', { hasText: 'Wed, Jun 3' }).filter({ hasText: '14:00 – 15:00' });
    await expect(oldBookedSlot).toHaveCount(0);

    const targetSlot = this.page.locator('button', { hasText: newSlot.dayLabel }).filter({ hasText: newSlot.timeLabel }).first();
    await expect(targetSlot).toBeVisible();
    await targetSlot.click();
    await this.page.getByRole('button', { name: 'Confirm Reschedule' }).click();
    await expect(this.page.getByText('Session rescheduled').first()).toBeVisible();
  }

  async cancelSession() {
    await this.page.getByRole('button', { name: 'Cancel Session' }).click();
    await expect(this.page.getByText('Session cancelled').first()).toBeVisible();
  }
}
