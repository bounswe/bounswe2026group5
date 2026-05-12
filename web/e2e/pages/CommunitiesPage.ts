import { expect, type Locator, type Page } from '@playwright/test';

export class CommunitiesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/communities');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/communities/);
    await expect(this.page.getByRole('heading', { name: /Explore Communities/i })).toBeVisible();
    await expect(this.searchInput).toBeVisible();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  async expectCommunityCardVisible(name: string) {
    await expect(this.communityCard(name)).toBeVisible();
  }

  async expectCommunityCardHidden(name: string) {
    await expect(this.communityCard(name)).toHaveCount(0);
  }

  async expectEmptyState(term: string) {
    await expect(this.page.getByText(`No communities found matching "${term}".`)).toBeVisible();
  }

  async openCommunity(name: string) {
    const card = this.communityCard(name);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'View' }).click();
  }

  async openCreateCommunity() {
    await this.page.getByRole('button', { name: /^Create$/i }).click();
    await this.expectCreateDialogOpen();
  }

  async expectCreateDialogOpen() {
    await expect(this.createDialog).toBeVisible();
    await expect(this.createDialog.getByRole('heading', { name: 'Create a Community' })).toBeVisible();
  }

  async expectCreateButtonDisabled() {
    await expect(this.createDialog.getByRole('button', { name: 'Create' })).toBeDisabled();
  }

  async submitCreateFromNameField(name: string) {
    await this.nameInput.fill(name);
    await this.nameInput.press('Enter');
  }

  async expectCreateNameError(message: string) {
    await expect(this.createDialog.getByText(message)).toBeVisible();
  }

  async createCommunity(name: string, description?: string) {
    await this.nameInput.fill(name);
    if (description !== undefined) {
      await this.descriptionInput.fill(description);
    }
    await this.createDialog.getByRole('button', { name: 'Create' }).click();
  }

  async expectCreateDialogClosed() {
    await expect(this.createDialog).toHaveCount(0);
  }

  async expectDuplicateCreateToast() {
    await expect(this.page.getByText('Failed to create community. The name may already be taken.')).toBeVisible();
  }

  private get searchInput() {
    return this.page.getByRole('textbox', { name: 'Search communities...' });
  }

  private get createDialog() {
    return this.page.getByRole('dialog');
  }

  private get nameInput() {
    return this.createDialog.getByLabel(/^Name/i);
  }

  private get descriptionInput() {
    return this.createDialog.getByLabel('Description');
  }

  private communityCard(name: string): Locator {
    return this.page.locator('.island-shell', {
      has: this.page.getByRole('heading', { name }),
    }).first();
  }
}
