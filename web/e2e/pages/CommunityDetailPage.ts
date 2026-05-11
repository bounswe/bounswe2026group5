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

  async expectNewPostVisible() {
    await expect(this.page.getByRole('button', { name: 'New Post' })).toBeVisible();
  }

  async expectNewPostHidden() {
    await expect(this.page.getByRole('button', { name: 'New Post' })).toHaveCount(0);
  }

  async openNewPostDialog() {
    await this.page.getByRole('button', { name: 'New Post' }).click();
    await expect(this.postDialog).toBeVisible();
    await expect(this.postDialog.getByRole('heading', { name: 'New Post' })).toBeVisible();
  }

  async expectPublishDisabled() {
    await expect(this.postDialog.getByRole('button', { name: 'Publish' })).toBeDisabled();
  }

  async selectPostType(type: 'Achievement' | 'Social' | 'Progress') {
    await this.postDialog.getByLabel('Type').click();
    await this.page.getByRole('option', { name: type }).click();
  }

  async fillPostContent(content: string) {
    await this.postDialog.getByLabel(/^Content/i).fill(content);
  }

  async expectPostCharacterCount(count: number, limit = 2000) {
    await expect(this.postDialog.getByText(`${count}/${limit}`)).toBeVisible();
  }

  async expectPostContentLength(length: number) {
    await expect(this.postDialog.getByLabel(/^Content/i)).toHaveValue(new RegExp(`^[\\s\\S]{${length}}$`));
  }

  async expectTaggableUserVisible(username: string) {
    await expect(this.postDialog.getByText(new RegExp(`@${username}$`))).toBeVisible();
  }

  async selectTaggableUser(username: string) {
    await this.postDialog.getByText(new RegExp(`@${username}$`)).click();
  }

  async expectTaggableUserDisabled(username: string) {
    await expect(
      this.postDialog.getByRole('checkbox', {
        name: new RegExp(`@${username}$`),
      }).first(),
    ).toBeDisabled();
  }

  async toggleShareToProfile() {
    await this.postDialog.getByText('Share to my profile').click();
  }

  async attachMedia(filePath: string, fileName: string) {
    await this.postDialog.locator('input[type="file"]').setInputFiles(filePath);
    await expect(this.postDialog.getByText(fileName)).toBeVisible();
    await expect(this.postDialog.locator('svg.animate-spin')).toHaveCount(0);
  }

  async publishPost() {
    await this.postDialog.getByRole('button', { name: 'Publish' }).click();
    await expect(this.page.getByText('Post published')).toBeVisible();
    await expect(this.postDialog).toHaveCount(0);
  }

  async expectPostVisible(content: string) {
    await expect(this.postCard(content)).toBeVisible();
  }

  async expectPostHidden(content: string) {
    await expect(this.postCard(content)).toHaveCount(0);
  }

  async expectPostTag(content: string, username: string) {
    await expect(this.postCard(content).getByRole('link', { name: `@${username}` })).toBeVisible();
  }

  async expectPostHasMedia(content: string, fileName: string) {
    const card = this.postCard(content);
    await expect(card.getByRole('img', { name: fileName }).or(card.getByRole('link', { name: fileName }))).toBeVisible();
  }

  async expectOwnPostActions(content: string) {
    const card = this.postCard(content);
    await expect(card.getByRole('button', { name: 'Edit post' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Delete post' })).toBeVisible();
  }

  async expectNoPostActions(content: string) {
    const card = this.postCard(content);
    await expect(card.getByRole('button', { name: 'Edit post' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Delete post' })).toHaveCount(0);
  }

  async openEditPost(content: string) {
    const card = this.postCard(content);
    await card.getByRole('button', { name: 'Edit post' }).click();
    await expect(this.editDialog).toBeVisible();
    await expect(this.editDialog.getByRole('heading', { name: 'Edit Post' })).toBeVisible();
  }

  async clearEditContent() {
    await this.editDialog.getByLabel(/^Content/i).fill('');
  }

  async expectSaveChangesDisabled() {
    await expect(this.editDialog.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
  }

  async updateEditContent(content: string) {
    await this.editDialog.getByLabel(/^Content/i).fill(content);
  }

  async saveEditedPost() {
    await this.editDialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(this.page.getByText('Post updated')).toBeVisible();
    await expect(this.editDialog).toHaveCount(0);
  }

  async openDeletePost(content: string) {
    const card = this.postCard(content);
    await card.getByRole('button', { name: 'Delete post' }).click();
    await expect(this.deleteDialog).toBeVisible();
    await expect(this.deleteDialog.getByRole('heading', { name: 'Delete Post' })).toBeVisible();
  }

  async cancelDeletePost() {
    await this.deleteDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.deleteDialog).toHaveCount(0);
  }

  async confirmDeletePost() {
    await this.deleteDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(this.page.getByText('Post deleted')).toBeVisible();
    await expect(this.deleteDialog).toHaveCount(0);
  }

  private get postDialog() {
    return this.page.getByRole('dialog');
  }

  private get editDialog() {
    return this.page.getByRole('dialog');
  }

  private get deleteDialog() {
    return this.page.getByRole('dialog');
  }

  private postCard(content: string) {
    return this.page.locator('div.rounded-lg.border', {
      has: this.page.getByText(content),
    }).first();
  }
}
