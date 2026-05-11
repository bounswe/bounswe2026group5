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

  async expectCreateWorkshopVisible() {
    await expect(this.page.getByRole('button', { name: 'Create Workshop' })).toBeVisible();
  }

  async expectCreateWorkshopHidden() {
    await expect(this.page.getByRole('button', { name: 'Create Workshop' })).toHaveCount(0);
  }

  async openCreateWorkshopDialog() {
    await this.page.getByRole('button', { name: 'Create Workshop' }).click();
    await expect(this.workshopDialog).toBeVisible();
    await expect(this.workshopDialog.getByRole('heading', { name: 'Create Workshop' })).toBeVisible();
  }

  async expectCreateWorkshopSubmitEnabled() {
    await expect(this.workshopDialog.getByRole('button', { name: 'Create Workshop' })).toBeEnabled();
  }

  async fillWorkshopTitle(title: string) {
    await this.workshopDialog.getByLabel(/^Title/i).fill(title);
  }

  async clearWorkshopTitle() {
    await this.workshopDialog.getByLabel(/^Title/i).fill('');
  }

  async fillWorkshopDescription(description: string) {
    await this.workshopDialog.getByLabel(/^Description/i).fill(description);
  }

  async fillWorkshopStart(localDateTime: string) {
    await this.workshopDialog.getByLabel(/^Start/i).fill(localDateTime);
  }

  async fillWorkshopEnd(localDateTime: string) {
    await this.workshopDialog.getByLabel(/^End/i).fill(localDateTime);
  }

  async fillWorkshopCapacity(capacity: string) {
    await this.workshopDialog.getByLabel(/^Max Participants/i).fill(capacity);
  }

  async submitWorkshopCreate() {
    await this.workshopDialog.getByRole('button', { name: 'Create Workshop' }).click();
  }

  async expectWorkshopDialogOpen(title: 'Create Workshop' | 'Edit Workshop') {
    await expect(this.workshopDialog).toBeVisible();
    await expect(this.workshopDialog.getByRole('heading', { name: title })).toBeVisible();
  }

  async expectWorkshopValidationError(message: string) {
    await expect(this.workshopDialog.getByText(message)).toBeVisible();
  }

  async expectWorkshopCreated() {
    await expect(this.page.getByText('Workshop created!')).toBeVisible();
    await expect(this.workshopDialog).toHaveCount(0);
  }

  async expectWorkshopCardVisible(title: string) {
    await expect(this.workshopCard(title)).toBeVisible();
  }

  async expectNoWorkshopsEmptyState() {
    await expect(this.page.getByText('No workshops yet.')).toBeVisible();
  }

  async expectWorkshopCardSummary(title: string, participantCount: number, maxParticipants: number, status: 'Open' | 'Full' | 'Cancelled' | 'Ended') {
    const card = this.workshopCard(title);
    await expect(card).toBeVisible();
    await expect(card.getByText(`${participantCount}/${maxParticipants} Enrolled`)).toBeVisible();
    await expect(card.getByText(status)).toBeVisible();
  }

  async openWorkshopDetails(title: string) {
    const card = this.workshopCard(title);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'View Details' }).click();
    await expect(this.workshopDetailDialog).toBeVisible();
    await expect(this.workshopDetailDialog.getByText(title, { exact: true })).toBeVisible();
  }

  async expectWorkshopJoinVisible() {
    await expect(this.workshopDetailDialog.getByRole('button', { name: 'Join Workshop' })).toBeVisible();
  }

  async expectWorkshopJoinHidden() {
    await expect(this.workshopDetailDialog.getByRole('button', { name: 'Join Workshop' })).toHaveCount(0);
  }

  async joinWorkshop() {
    await this.workshopDetailDialog.getByRole('button', { name: 'Join Workshop' }).click();
    await expect(this.workshopDetailDialog.getByRole('button', { name: 'Leave Workshop' })).toBeVisible();
  }

  async expectWorkshopLeaveVisible() {
    await expect(this.workshopDetailDialog.getByRole('button', { name: 'Leave Workshop' })).toBeVisible();
  }

  async leaveWorkshop() {
    await this.workshopDetailDialog.getByRole('button', { name: 'Leave Workshop' }).click();
    await expect(this.workshopDetailDialog.getByRole('button', { name: 'Join Workshop' })).toBeVisible();
  }

  async expectWorkshopParticipantCount(participantCount: number, maxParticipants: number) {
    await expect(this.workshopDetailDialog.getByText(`${participantCount}/${maxParticipants} Enrolled`)).toBeVisible();
  }

  async expectWorkshopStatus(status: 'Open' | 'Full' | 'Cancelled' | 'Ended') {
    await expect(this.workshopDetailDialog.getByText(status)).toBeVisible();
  }

  async expectHostWorkshopActionsVisible() {
    await expect(this.workshopDetailDialog.getByRole('button', { name: 'Edit Workshop' })).toBeVisible();
    await expect(this.workshopDetailDialog.getByRole('button', { name: 'Cancel Workshop' })).toBeVisible();
  }

  async expectHostWorkshopActionsHidden() {
    await expect(this.workshopDetailDialog.getByRole('button', { name: 'Edit Workshop' })).toHaveCount(0);
    await expect(this.workshopDetailDialog.getByRole('button', { name: 'Cancel Workshop' })).toHaveCount(0);
  }

  async openWorkshopEditDialog() {
    await this.workshopDetailDialog.getByRole('button', { name: 'Edit Workshop' }).click();
    await expect(this.workshopDialog).toBeVisible();
    await expect(this.workshopDialog.getByRole('heading', { name: 'Edit Workshop' })).toBeVisible();
  }

  async saveWorkshopChanges() {
    await this.workshopDialog.getByRole('button', { name: 'Save Changes' }).click();
  }

  async expectWorkshopUpdated() {
    await expect(this.page.getByText('Workshop updated.')).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Edit Workshop' })).toHaveCount(0);
  }

  async startWorkshopCancelFlow() {
    await this.workshopDetailDialog.getByRole('button', { name: 'Cancel Workshop' }).click();
    await expect(this.workshopDetailDialog.getByText('Cancel this workshop?')).toBeVisible();
  }

  async keepWorkshopActive() {
    await this.workshopDetailDialog.getByRole('button', { name: 'Keep' }).click();
    await expect(this.workshopDetailDialog.getByText('Cancel this workshop?')).toHaveCount(0);
  }

  async confirmWorkshopCancellation() {
    await this.workshopDetailDialog.getByRole('button', { name: 'Yes, Cancel Workshop' }).click();
    await expect(this.page.getByText('Workshop cancelled.')).toBeVisible();
  }

  async expectWorkshopParticipantsVisible(...names: string[]) {
    await expect(this.workshopDetailDialog.getByText('Participants')).toBeVisible();
    for (const name of names) {
      await expect(this.workshopDetailDialog.getByText(name, { exact: true }).first()).toBeVisible();
    }
  }

  async closeWorkshopDetails() {
    await this.workshopDetailDialog.locator('button').filter({ hasText: 'Close' }).first().click();
    await expect(this.workshopDetailDialog).toHaveCount(0);
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

  private get workshopDialog() {
    return this.page.getByRole('dialog');
  }

  private get workshopDetailDialog() {
    return this.page.getByRole('dialog');
  }

  private postCard(content: string) {
    return this.page.locator('div.rounded-lg.border', {
      has: this.page.getByText(content),
    }).first();
  }

  private workshopCard(title: string) {
    return this.page.locator('.island-shell', {
      has: this.page.getByText(title, { exact: true }),
    }).first();
  }
}
