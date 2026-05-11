import { expect, type Page } from '@playwright/test';

export class CommunityDetailPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded(slug: string, name: string) {
    await expect(this.page).toHaveURL(new RegExp(`/communities/${slug}$`));
    await expect(this.page.locator('h1').filter({ hasText: name })).toBeVisible();
  }

  async expectMetadata(description: string, creatorUsername: string, memberCount: number) {
    await expect(this.page.getByText(description)).toBeVisible();
    await expect(this.page.getByRole('link', { name: `@${creatorUsername}` })).toBeVisible();
    await this.expectMemberCount(memberCount);
  }

  async expectGuestState() {
    await expect(this.page.getByRole('button', { name: 'Join Community' })).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: 'Leave Community' })).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: 'New Post' })).toHaveCount(0);
  }

  async expectJoinAvailable() {
    await expect(this.page.getByRole('button', { name: 'Join Community' })).toBeVisible();
  }

  async join() {
    await this.page.getByRole('button', { name: 'Join Community' }).click();
    await expect(this.page.getByText('Joined community!')).toBeVisible();
  }

  async expectLeaveAvailable() {
    await expect(this.page.getByRole('button', { name: 'Leave Community' })).toBeVisible();
  }

  async leave() {
    await this.page.getByRole('button', { name: 'Leave Community' }).click();
    await expect(this.page.getByText('Left community.')).toBeVisible();
  }

  async expectMemberCount(memberCount: number) {
    await expect(this.page.getByText(new RegExp(`^${memberCount} member${memberCount === 1 ? '' : 's'}$`))).toBeVisible();
  }

  async expectNonMemberFeedPrompt() {
    await expect(this.page.getByText('Join this community to be the first to post.')).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'New Post' })).toHaveCount(0);
  }

  async expectMemberFeedAccess() {
    await expect(this.page.getByRole('button', { name: 'New Post' })).toBeVisible();
    await expect(this.page.getByText('Be the first to share something with this community.')).toBeVisible();
    await expect(this.page.getByText('Join this community to be the first to post.')).toHaveCount(0);
  }
}
