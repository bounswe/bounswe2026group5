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
    await expect(this.page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  }

  async logout() {
    await this.page.getByRole('button', { name: /Sign out/i }).click();
  }

  async expectSentRequest(mentorName: string, coverLetter?: string) {
    await expect(this.page.getByRole('heading', { name: 'Sent Requests' })).toBeVisible();
    await expect(this.page.getByText(`To: ${mentorName}`)).toBeVisible();
    if (coverLetter) {
      await expect(this.page.getByText(coverLetter)).toBeVisible();
    }
    await expect(this.page.getByText('PENDING')).toBeVisible();
  }

  async expectNotification(title: string, messagePart: string) {
    const notification = this.page.locator('.border-l-4', { hasText: title }).filter({ hasText: messagePart }).first();

    // We avoid reloads here because the dashboard marks notifications as read immediately on display.
    // A reload would cause a notification that was fetched but not yet asserted to disappear.
    // We use a 25s timeout to account for the 10s polling interval.
    await expect(notification).toBeVisible({ timeout: 25_000 });
  }

  async expectUnreadMessagesBadge() {
    const messagesLink = this.page.getByRole('link', { name: /Messages/i });
    await expect(messagesLink.locator('span.sr-only').filter({ hasText: 'unread messages' })).toBeVisible();
  }

  async openConversationFromNotification(messagePart: string) {
    const notification = this.page.locator('.border-l-4').filter({ hasText: messagePart }).first();
    await expect(notification).toBeVisible({ timeout: 25_000 });
    await notification.getByRole('link', { name: 'View conversation →' }).click();
    await expect(this.page).toHaveURL(/\/messages\?conversationId=/);
  }

  async openLatestConversationNotification() {
    const notification = this.page.locator('.border-l-4', {
      has: this.page.getByRole('link', { name: 'View conversation →' }),
    }).first();
    await expect(notification).toBeVisible({ timeout: 25_000 });
    await notification.getByRole('link', { name: 'View conversation →' }).click();
    await expect(this.page).toHaveURL(/\/messages\?conversationId=/);
  }

  async acceptIncomingRequest(menteeName: string, coverLetter?: string) {
    const requestCard = await this.findIncomingRequest(menteeName, coverLetter);
    await requestCard.getByRole('button', { name: /Accept/i }).click();
    await expect(this.page.getByText('Request accepted').first()).toBeVisible();
  }

  async declineIncomingRequest(menteeName: string, coverLetter?: string) {
    const requestCard = await this.findIncomingRequest(menteeName, coverLetter);
    await requestCard.getByRole('button', { name: /Decline/i }).click();
    await expect(this.page.getByText('Request declined').first()).toBeVisible();
  }

  async expectUpcomingSession(peerName: string) {
    await expect(this.page.getByRole('heading', { name: 'Upcoming Sessions' })).toBeVisible();
    await expect(this.page.getByText(`Session with ${peerName}`).first()).toBeVisible();
  }

  async expectRateMentorCard(mentorName: string) {
    await expect(this.page.getByRole('heading', { name: 'Rate Your Mentors' })).toBeVisible();
    const ratingCard = this.findRatingCard(mentorName);
    await expect(ratingCard).toBeVisible();
    await expect(ratingCard.getByRole('button', { name: /^Rate$/i })).toBeVisible();
  }

  async openRatingModal(mentorName: string) {
    const ratingCard = this.findRatingCard(mentorName);
    await expect(ratingCard).toBeVisible();
    await ratingCard.getByRole('button', { name: /^Rate$/i }).click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
    await expect(this.page.getByRole('heading', { name: `Rate your session with ${mentorName}` })).toBeVisible();
  }

  async expectRatingSubmitDisabled() {
    await expect(this.page.getByRole('button', { name: 'Submit Rating' })).toBeDisabled();
  }

  async selectRating(stars: number, expectedLabel: string) {
    await this.page.getByRole('button', { name: `Rate ${stars} stars` }).click();
    await expect(this.page.getByText(expectedLabel)).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Submit Rating' })).toBeEnabled();
  }

  async submitRating(reviewText: string) {
    await this.page.getByPlaceholder('Share your experience with this mentor...').fill(reviewText);
    await this.page.getByRole('button', { name: 'Submit Rating' }).click();
    await expect(this.page.getByText('Rating submitted!').first()).toBeVisible();
    await expect(this.page.getByRole('dialog')).toHaveCount(0);
  }

  async expectMentorNotPendingRating(mentorName: string) {
    await expect(this.findRatingCard(mentorName)).toHaveCount(0);
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
    const dialog = this.page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Reschedule' }).click();
    await expect(this.page.getByRole('heading', { name: 'Pick a New Time Slot' })).toBeVisible();
    await expect(dialog.locator('svg.animate-spin')).toHaveCount(0);
    const slotByDayAndTime = this.page
      .locator('button', { hasText: newSlot.dayLabel })
      .filter({ hasText: newSlot.timeLabel })
      .first();
    const slotByTimeOnly = this.page.locator('button', { hasText: newSlot.timeLabel }).first();

    const nextWeekButton = this.page.getByRole('button').filter({
      has: this.page.locator('svg.lucide-chevron-right'),
    });

    for (let i = 0; i < 8; i += 1) {
      const slotVisible =
        (await slotByDayAndTime.isVisible().catch(() => false)) ||
        (await slotByTimeOnly.isVisible().catch(() => false));
      if (slotVisible) {
        break;
      }
      await nextWeekButton.click();
    }

    const targetSlot =
      (await slotByDayAndTime.isVisible().catch(() => false)) ? slotByDayAndTime : slotByTimeOnly;
    await expect(targetSlot).toBeVisible();
    await targetSlot.click();
    await this.page.getByRole('button', { name: 'Confirm Reschedule' }).click();
    await expect(this.page.getByText('Session rescheduled').first()).toBeVisible();
  }

  async cancelSession() {
    await this.page.getByRole('dialog').getByRole('button', { name: 'Cancel Session' }).click();
    await expect(this.page.getByText('Session cancelled').first()).toBeVisible();
  }

  private async findIncomingRequest(menteeName: string, coverLetter?: string) {
    await expect(this.page.getByRole('heading', { name: 'Incoming Requests' })).toBeVisible();
    const requestCard = this.page.locator('.island-shell', {
      has: this.page.getByText(`${menteeName} wants to be your mentee.`),
    }).first();

    await expect(requestCard).toBeVisible();
    if (coverLetter) {
      await expect(requestCard.getByText(coverLetter)).toBeVisible();
    }
    return requestCard;
  }

  private findRatingCard(mentorName: string) {
    return this.page.locator('.island-shell', {
      has: this.page.getByText(mentorName),
    }).filter({
      has: this.page.getByRole('button', { name: /^Rate$/i }),
    }).first();
  }
}
