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
    const beforeCount = await this.page.getByText('Available ✕').count();
    await this.clickAvailabilityCell(dayIndexFromMonday, hour);
    await expect(this.page.getByText('Available ✕')).toHaveCount(beforeCount + 1);
  }

  async expectAvailabilityCount(count: number) {
    await expect(this.page.getByText('Available ✕')).toHaveCount(count);
  }

  async expectBookableSlots(count: number) {
    await expect(this.page.getByText(/^Book$/)).toHaveCount(count);
  }

  async sendMentorshipRequest(coverLetter?: string) {
    await expect.poll(async () => this.page.getByText(/^Book$/).count()).toBeGreaterThan(0);
    await this.page.getByText(/^Book$/).first().click();
    await expect(this.page.getByRole('heading', { name: 'Send Mentorship Request' })).toBeVisible();
    if (coverLetter) {
      await this.page.getByLabel(/Cover Letter/i).fill(coverLetter);
    }
    await this.page.getByRole('button', { name: 'Send Request' }).click();
    await expect(this.page.getByText('Request sent!')).toBeVisible();
  }

  async expectPendingRequestBlocksOtherSlots() {
    await expect(this.page.getByText(/^Book$/)).toHaveCount(0);
    await expect(this.page.getByText('Requested')).toBeVisible();
  }

  async expectAverageRating(rating: string | RegExp) {
    await expect(this.page.getByText('Average Rating')).toBeVisible();
    await expect(this.page.getByText(rating).first()).toBeVisible();
  }

  async expectPublicReview(reviewText: string) {
    await expect(this.page.getByText('Reviews', { exact: true })).toBeVisible();
    await expect(this.page.getByText(reviewText)).toBeVisible();
  }

  async expectBasicLoaded(username: string, displayName: string) {
    await expect(this.page).toHaveURL(new RegExp(`/profiles/${username}`));
    await expect(this.page.locator('h1').filter({ hasText: displayName })).toBeVisible();
  }

  async expectPostVisible(content: string) {
    await expect(this.postCard(content)).toBeVisible();
  }

  async expectPostHidden(content: string) {
    await expect(this.postCard(content)).toHaveCount(0);
  }

  async expectCommunityOrigin(content: string, communityName: string) {
    const card = this.postCard(content);
    await expect(card.getByText(/^Community$/)).toBeVisible();
    await expect(card.getByRole('link', { name: communityName })).toBeVisible();
  }

  async expectMentorshipJourneyOrigin(content: string, partnerUsername: string) {
    const card = this.postCard(content);
    await expect(card.getByText(/^Mentorship Journey$/)).toBeVisible();
    await expect(card.getByRole('link', { name: `@${partnerUsername}` })).toBeVisible();
  }

  async nextWeek() {
    await this.page.getByRole('button', { name: 'Next week' }).click();
  }

  async prevWeek() {
    await this.page.getByRole('button', { name: 'Previous week' }).click();
  }

  async goToWeekContaining(target: string | Date) {
    const targetDate = typeof target === 'string' ? new Date(`${target}T00:00:00`) : new Date(target);
    targetDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 10; i += 1) {
      const label = await this.page.getByText(/\d{1,2} \w+ – \d{1,2} \w+ \d{4}/).first().textContent();
      const range = parseWeekRangeLabel(label ?? '');
      if (!range) {
        break;
      }

      if (targetDate >= range.start && targetDate <= range.end) {
        return;
      }

      if (targetDate > range.end) {
        const previousLabel = label ?? '';
        await this.nextWeek();
        await expect(this.page.getByText(previousLabel)).toHaveCount(0);
      } else {
        const previousLabel = label ?? '';
        await this.prevWeek();
        await expect(this.page.getByText(previousLabel)).toHaveCount(0);
      }
    }

    throw new Error(`Could not navigate to week containing ${targetDate.toISOString().slice(0, 10)}`);
  }

  private async clickAvailabilityCell(dayIndexFromMonday: number, hour: number) {
    const hourIndex = hour - 8;
    const cellIndex = 8 + hourIndex * 8 + 1 + dayIndexFromMonday;
    const grid = this.page.locator('div[style*="grid-template-columns"], div[style*="gridTemplateColumns"]').first();
    await grid.locator(':scope > div').nth(cellIndex).click();
  }

  private postCard(content: string) {
    return this.page.locator('[class*="border-line"]', {
      has: this.page.getByText(content),
    }).first();
  }
}

function parseWeekRangeLabel(label: string) {
  const match = label.match(/^(\d{1,2}) (\w+) – (\d{1,2}) (\w+) (\d{4})$/);
  if (!match) {
    return null;
  }

  const [, startDay, startMonthName, endDay, endMonthName, endYear] = match;
  const startMonth = monthIndex(startMonthName);
  const endMonth = monthIndex(endMonthName);
  const endYearNumber = Number(endYear);
  const startYearNumber = startMonth > endMonth ? endYearNumber - 1 : endYearNumber;

  const start = new Date(startYearNumber, startMonth, Number(startDay));
  const end = new Date(endYearNumber, endMonth, Number(endDay));
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthIndex(month: string) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
}
