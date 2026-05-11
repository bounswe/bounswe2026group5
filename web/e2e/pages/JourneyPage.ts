import { expect, type Page } from '@playwright/test';

export class JourneyPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded(matchId: string) {
    await expect(this.page).toHaveURL(new RegExp(`/connections/${matchId}$`));
    await expect(this.page.getByRole('heading', { name: 'Our Journey' })).toBeVisible();
    await expect(this.page.getByText('A shared timeline of milestones, sessions, and moments in your mentorship.')).toBeVisible();
  }

  async expectTimelineVisible() {
    await expect(this.page.getByLabel('Journey timeline')).toBeVisible();
    await expect(this.page.getByText(/^Timeline$/)).toBeVisible();
  }

  async expectEventVisible(text: string) {
    await expect(this.eventCard(text)).toBeVisible();
  }

  async expectEventHidden(text: string) {
    await expect(this.eventCard(text)).toHaveCount(0);
  }

  async expectNoEditDeleteControlsForEvent(text: string) {
    const card = this.eventCard(text);
    await expect(card.getByRole('button', { name: 'Edit entry' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Delete entry' })).toHaveCount(0);
  }

  async expectEditDeleteControlsForEvent(text: string) {
    const card = this.eventCard(text);
    await expect(card.getByRole('button', { name: 'Edit entry' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Delete entry' })).toBeVisible();
  }

  async expectEmptyState() {
    await expect(this.page.getByText('No journey events yet')).toBeVisible();
    await expect(this.page.getByText('Your shared history will appear here as you schedule sessions and reach milestones together.')).toBeVisible();
  }

  async expectErrorState() {
    await expect(this.page.getByText('Could not load journey')).toBeVisible();
    await expect(this.page.getByText('You may not have access to this journey, or something went wrong. Please try again.')).toBeVisible();
  }

  async openAddEntryDialog() {
    await this.page.getByRole('button', { name: 'Add Entry' }).click();
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog.getByRole('heading', { name: 'Add Journey Entry' })).toBeVisible();
  }

  async expectAddEntryDisabled() {
    await expect(this.dialog.getByRole('button', { name: 'Add Entry' })).toBeDisabled();
  }

  async fillAddEntryContent(content: string) {
    await this.dialog.getByLabel(/^Content/i).fill(content);
  }

  async expectAddEntryCharacterCount(count: number, limit = 2000) {
    await expect(this.dialog.getByText(`${count}/${limit}`)).toBeVisible();
  }

  async expectAddEntryContentLength(length: number) {
    await expect(this.dialog.getByLabel(/^Content/i)).toHaveValue(new RegExp(`^[\\s\\S]{${length}}$`));
  }

  async selectAddEntryType(type: 'Achievement' | 'Social' | 'Progress') {
    await this.dialog.getByLabel('Type').click();
    await this.page.getByRole('option', { name: type }).click();
  }

  async toggleShareToProfile() {
    await this.dialog.getByText('Also share this on my profile').click();
  }

  async addEntry() {
    await this.dialog.getByRole('button', { name: 'Add Entry' }).click();
    await expect(this.page.getByText('Entry added to your journey')).toBeVisible();
    await expect(this.dialog).toHaveCount(0);
  }

  async openEditEntry(text: string) {
    await this.eventCard(text).getByRole('button', { name: 'Edit entry' }).click();
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog.getByRole('heading', { name: 'Edit Journey Entry' })).toBeVisible();
  }

  async clearEditContent() {
    await this.dialog.getByLabel(/^Content/i).fill('');
  }

  async expectSaveChangesDisabled() {
    await expect(this.dialog.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
  }

  async fillEditContent(content: string) {
    await this.dialog.getByLabel(/^Content/i).fill(content);
  }

  async saveEditedEntry() {
    await this.dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(this.page.getByText('Entry updated')).toBeVisible();
    await expect(this.dialog).toHaveCount(0);
  }

  async openDeleteEntry(text: string) {
    await this.eventCard(text).getByRole('button', { name: 'Delete entry' }).click();
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog.getByRole('heading', { name: 'Remove Entry' })).toBeVisible();
  }

  async cancelDeleteEntry() {
    await this.dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.dialog).toHaveCount(0);
  }

  async confirmDeleteEntry() {
    await this.dialog.getByRole('button', { name: 'Remove' }).click();
    await expect(this.dialog).toHaveCount(0);
  }

  private get dialog() {
    return this.page.getByRole('dialog');
  }

  private eventCard(text: string) {
    return this.page.locator('div.rounded-lg.border', {
      has: this.page.getByText(text),
    }).first();
  }
}
