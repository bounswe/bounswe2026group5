import { expect, type Page } from '@playwright/test';

export class MessagesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(conversationId?: string) {
    if (conversationId) {
      await this.page.goto(`/messages?conversationId=${conversationId}`);
      return;
    }
    await this.page.goto('/messages');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/messages/);
    await expect(this.page.getByRole('heading', { name: 'Messages' })).toBeVisible();
  }

  async selectConversation(displayName: string) {
    const item = this.conversationItem(displayName);
    await expect(item).toBeVisible();
    await item.click();
    await expect(this.page).toHaveURL(/conversationId=/);
    await expect(this.threadHeader(displayName)).toBeVisible();
  }

  async expectConversationVisible(displayName: string) {
    await expect(this.conversationItem(displayName)).toBeVisible();
  }

  async expectConversationMissing(displayName: string) {
    await expect(this.conversationItem(displayName)).toHaveCount(0);
  }

  async expectUnreadBadge(displayName: string) {
    await expect(this.conversationItem(displayName).locator('[aria-label*="unread messages"]')).toBeVisible();
  }

  async expectNoUnreadBadge(displayName: string) {
    await expect(this.conversationItem(displayName).locator('[aria-label*="unread messages"]')).toHaveCount(0);
  }

  async expectEmptyThreadState() {
    await expect(this.page.getByText('No messages yet. Say hello!')).toBeVisible();
  }

  async expectSendDisabled() {
    await expect(this.page.getByRole('button', { name: 'Send message' })).toBeDisabled();
  }

  async fillMessage(text: string) {
    await this.messageInput.fill(text);
  }

  async attachFile(filePath: string) {
    await this.page.locator('input[type="file"]').setInputFiles(filePath);
  }

  async expectAttachedFileChip(fileName: string) {
    await expect(this.page.getByText(fileName)).toBeVisible();
  }

  async sendCurrentMessage() {
    await this.page.getByRole('button', { name: 'Send message' }).click();
  }

  async sendMessage(text: string) {
    await this.fillMessage(text);
    await this.sendCurrentMessage();
  }

  async expectMessageVisible(text: string) {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectMessageMissing(text: string) {
    await expect(this.page.getByText(text, { exact: true })).toHaveCount(0);
  }

  async expectAttachmentVisible(fileName: string) {
    await expect(this.attachmentLocator(this.page, fileName).first()).toBeVisible();
  }

  async expectCombinedMessage(text: string, fileName: string) {
    const bubble = this.page.locator('div.max-w-\\[70\\%\\]').filter({
      has: this.page.getByText(text, { exact: true }),
      has: this.attachmentLocator(this.page, fileName),
    }).first();
    await expect(bubble).toBeVisible();
    await expect(this.attachmentLocator(bubble, fileName).first()).toBeVisible();
  }

  async reloadAndExpectThread(displayName: string) {
    await this.page.reload();
    await expect(this.threadHeader(displayName)).toBeVisible();
  }

  async openReportForMessage(text: string) {
    const bubble = this.incomingMessageBubble(text);
    await bubble.hover();
    await bubble.locator('button[title="Report Message"]').click();
    await expect(this.page.getByRole('heading', { name: 'Report Message' })).toBeVisible();
  }

  async submitReport(reasonLabel: 'Spam' | 'Harassment' | 'Inappropriate Content' | 'Other', description?: string) {
    await this.page.locator('select').selectOption({ label: reasonLabel });
    if (description) {
      await this.page.getByPlaceholder('Provide additional details...').fill(description);
    }
    await this.page.getByRole('button', { name: /Submit Report/i }).click();
  }

  async expectOwnMessageNotReportable(text: string) {
    const bubble = this.ownMessageBubble(text);
    await expect(bubble.locator('button[title="Report Message"]')).toHaveCount(0);
  }

  private get messageInput() {
    return this.page.getByPlaceholder('Type a message… (Enter to send)');
  }

  private conversationItem(displayName: string) {
    return this.page.locator('button', { has: this.page.getByText(displayName, { exact: true }) }).first();
  }

  private threadHeader(displayName: string) {
    return this.page.locator('div').filter({
      has: this.page.getByText(displayName, { exact: true }),
      has: this.page.getByRole('link', { name: 'View profile' }),
    }).first();
  }

  private messageBubble(text: string) {
    return this.page.locator('div.max-w-\\[70\\%\\]').filter({
      has: this.page.getByText(text, { exact: true }),
    }).first();
  }

  private incomingMessageBubble(text: string) {
    return this.page.locator('div.flex.items-end.gap-2.group').filter({
      has: this.page.getByText(text, { exact: true }),
      has: this.page.locator('button[title="Report Message"]'),
    }).first();
  }

  private ownMessageBubble(text: string) {
    return this.page.locator('div.flex.items-end.gap-2.group').filter({
      has: this.page.getByText(text, { exact: true }),
    }).filter({
      hasNot: this.page.locator('button[title="Report Message"]'),
    }).first();
  }

  private attachmentLocator(scope: Page | ReturnType<Page['locator']>, fileName: string) {
    const stem = fileName.replace(/\.[^.]+$/, '');
    const extension = fileName.split('.').pop() ?? '';
    const pattern = new RegExp(`${stem}.*\\.${extension}$`);
    return scope.getByRole('img', { name: pattern }).or(scope.getByRole('link', { name: pattern }));
  }
}
