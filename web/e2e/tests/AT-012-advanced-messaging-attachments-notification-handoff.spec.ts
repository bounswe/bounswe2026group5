import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';
import { DashboardPage } from '../pages/DashboardPage';
import { MessagesPage } from '../pages/MessagesPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ATTACHMENT_FILE = path.resolve(__dirname, '../../public/icon.png');

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

test.describe('AT-012: Advanced Messaging, Attachments & Notification Handoff', () => {
  test('matched users exchange rich messages, follow notifications, and preserve privacy on web', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    const senderMessagesPage = new MessagesPage(page);

    const senderSeed: UserSeed = {
      email: `rich.sender.${runId}@example.com`,
      username: `rich_sender_${runId}`,
      displayName: `Rich Sender ${runId}`,
      title: 'Curious Mentee',
      bio: 'Uses messaging with text and attachments.',
      skills: ['React', 'Testing'],
    };
    const receiverSeed: UserSeed = {
      email: `rich.receiver.${runId}@example.com`,
      username: `rich_receiver_${runId}`,
      displayName: `Rich Receiver ${runId}`,
      title: 'Responsive Mentor',
      bio: 'Receives messages, notifications, and reports.',
      skills: ['TypeScript', 'Mentoring'],
    };
    const outsiderSeed: UserSeed = {
      email: `rich.outsider.${runId}@example.com`,
      username: `rich_outsider_${runId}`,
      displayName: `Rich Outsider ${runId}`,
      title: 'Unrelated User',
      bio: 'Must not access private threads.',
      skills: ['Security'],
    };

    const senderAuth = await api.seedUser(senderSeed, 'MENTEE');
    const receiverAuth = await api.seedUser(receiverSeed, 'MENTOR');
    const outsiderAuth = await api.seedUser(outsiderSeed, 'MENTEE');

    const slot = await api.createAvailabilitySlot(receiverAuth, {
      date: toDateString(addDays(new Date(), 3)),
      startTime: '11:00:00',
      endTime: '12:00:00',
    });
    const mentorshipRequest = await api.sendMentorshipRequest(senderAuth, {
      mentor_username: receiverSeed.username,
      slot_id: slot.id,
      cover_letter: 'Creating a conversation for AT-012.',
    });
    await api.respondToRequest(receiverAuth, mentorshipRequest.id, 'accept');

    const senderConversations = await api.fetchConversations(senderAuth);
    const conversation = senderConversations.find((item) => (
      item.mentor.username === receiverSeed.username && item.mentee.username === senderSeed.username
    ));
    expect(conversation).toBeTruthy();
    const conversationId = conversation!.id;

    const receiverContext = await browser.newContext();
    const receiverPage = await receiverContext.newPage();
    const receiverMessagesPage = new MessagesPage(receiverPage);
    const receiverDashboardPage = new DashboardPage(receiverPage);

    const outsiderContext = await browser.newContext();
    const outsiderPage = await outsiderContext.newPage();
    const outsiderMessagesPage = new MessagesPage(outsiderPage);

    await api.loginInBrowser(page, senderAuth);
    await api.loginInBrowser(receiverPage, receiverAuth);
    await api.loginInBrowser(outsiderPage, outsiderAuth);

    const plainText = `Plain AT-012 message ${runId}`;
    const trimmedTextRaw = `   Trimmed AT-012 message ${runId}   `;
    const trimmedText = trimmedTextRaw.trim();
    const combinedText = `Combined AT-012 message ${runId}`;
    const rapidMessages = [
      `Rapid AT-012 message 1 ${runId}`,
      `Rapid AT-012 message 2 ${runId}`,
      `Rapid AT-012 message 3 ${runId}`,
    ];
    const receiverReply = `Receiver reply for self-report boundary ${runId}`;

    await test.step('Sender can open the conversation and empty input stays blocked', async () => {
      await senderMessagesPage.goto();
      await senderMessagesPage.expectLoaded();
      await senderMessagesPage.selectConversation(receiverSeed.displayName);
      await senderMessagesPage.expectSendDisabled();
    });

    await test.step('Sender can send plain text, trimmed text, attachment-only, and combined messages that persist after reload', async () => {
      await senderMessagesPage.sendMessage(plainText);
      await senderMessagesPage.expectMessageVisible(plainText);

      await senderMessagesPage.fillMessage(trimmedTextRaw);
      await senderMessagesPage.sendCurrentMessage();
      await senderMessagesPage.expectMessageVisible(trimmedText);

      await senderMessagesPage.attachFile(ATTACHMENT_FILE);
      await senderMessagesPage.expectAttachedFileChip('icon.png');
      await senderMessagesPage.sendCurrentMessage();
      await senderMessagesPage.expectAttachmentVisible('icon.png');

      await senderMessagesPage.fillMessage(combinedText);
      await senderMessagesPage.attachFile(ATTACHMENT_FILE);
      await senderMessagesPage.expectAttachedFileChip('icon.png');
      await senderMessagesPage.sendCurrentMessage();
      await senderMessagesPage.expectCombinedMessage(combinedText, 'icon.png');

      await senderMessagesPage.reloadAndExpectThread(receiverSeed.displayName);
      await senderMessagesPage.expectMessageVisible(plainText);
      await senderMessagesPage.expectMessageVisible(trimmedText);
      await senderMessagesPage.expectCombinedMessage(combinedText, 'icon.png');

      const persistedMessages = await api.fetchMessages(senderAuth, conversationId);
      expect(persistedMessages.some((message) => message.body === plainText)).toBeTruthy();
      expect(persistedMessages.some((message) => message.body === trimmedText)).toBeTruthy();
      expect(persistedMessages.some((message) => message.body === '' && !!message.attachment_url)).toBeTruthy();
      expect(persistedMessages.some((message) => message.body === combinedText && !!message.attachment_url)).toBeTruthy();
    });

    await test.step('Receiver sees unread conversation state before opening the thread', async () => {
      await receiverDashboardPage.goto();
      await receiverDashboardPage.expectLoaded();

      await expect.poll(async () => {
        const notifications = await api.fetchNotifications(receiverAuth);
        return notifications.filter((item) => item.type === 'new_message' && item.resource_id === conversationId).length;
      }).toBeGreaterThan(0);

      await receiverDashboardPage.expectUnreadMessagesBadge();
    });

    await test.step('Receiver can follow the dashboard notification into the correct thread and read the rich messages', async () => {
      await receiverDashboardPage.goto();
      await receiverDashboardPage.expectLoaded();

      await expect.poll(async () => {
        const notifications = await api.fetchNotifications(receiverAuth);
        return notifications.filter((item) => item.type === 'new_message' && item.resource_id === conversationId).length;
      }).toBeGreaterThan(0);

      await receiverDashboardPage.openLatestConversationNotification();
      await receiverMessagesPage.expectMessageVisible(plainText);
      await receiverMessagesPage.expectMessageVisible(trimmedText);
      await receiverMessagesPage.expectAttachmentVisible('icon.png');
      await receiverMessagesPage.expectCombinedMessage(combinedText, 'icon.png');
    });

    await test.step('Read state clears after the conversation is opened, and rapid sender messages keep ordering stable', async () => {
      await expect.poll(async () => {
        const conversations = await api.fetchConversations(receiverAuth);
        return conversations.find((item) => item.id === conversationId)?.unread_count ?? -1;
      }).toBe(0);

      await receiverPage.goto('/messages');
      await receiverMessagesPage.expectNoUnreadBadge(senderSeed.displayName);

      await receiverMessagesPage.selectConversation(senderSeed.displayName);
      await receiverMessagesPage.sendMessage(receiverReply);
      await receiverMessagesPage.expectMessageVisible(receiverReply);

      await page.goto(`/messages?conversationId=${conversationId}`);
      for (const message of rapidMessages) {
        await senderMessagesPage.sendMessage(message);
      }

      for (const message of rapidMessages) {
        await receiverMessagesPage.expectMessageVisible(message);
      }

      const receivedMessages = await api.fetchMessages(receiverAuth, conversationId);
      const rapidIndexes = rapidMessages.map((message) => receivedMessages.findIndex((item) => item.body === message));
      expect(rapidIndexes.every((index) => index >= 0)).toBeTruthy();
      const isAscending = rapidIndexes[0] < rapidIndexes[1] && rapidIndexes[1] < rapidIndexes[2];
      const isDescending = rapidIndexes[0] > rapidIndexes[1] && rapidIndexes[1] > rapidIndexes[2];
      expect(isAscending || isDescending).toBeTruthy();

      await receiverPage.goto('/dashboard');
      await receiverDashboardPage.expectLoaded();
      await expect.poll(async () => {
        const notifications = await api.fetchNotifications(receiverAuth);
        return notifications.filter((item) => item.type === 'new_message' && item.resource_id === conversationId).length;
      }).toBeGreaterThan(0);
    });

    await test.step('An unrelated authenticated user cannot access the private thread contents', async () => {
      await outsiderMessagesPage.goto(conversationId);
      await outsiderMessagesPage.expectLoaded();
      await outsiderMessagesPage.expectConversationMissing(senderSeed.displayName);
      await outsiderMessagesPage.expectMessageMissing(plainText);
      await outsiderMessagesPage.expectMessageMissing(combinedText);

      const forbidden = await api.tryFetchMessages(outsiderAuth, conversationId);
      expect(forbidden.status()).toBe(403);
    });

    await test.step('Receiver can report the sender once, cannot report the same user twice, and cannot self-report through the normal UI', async () => {
      await receiverPage.goto(`/messages?conversationId=${conversationId}`);
      await receiverMessagesPage.openReportForMessage(plainText);
      await receiverMessagesPage.submitReport('Inappropriate Content', 'AT-012 first report');
      await expect(receiverPage.getByText('Report submitted')).toBeVisible();

      const senderMessages = await api.fetchMessages(receiverAuth, conversationId);
      const combinedMessage = senderMessages.find((item) => item.body === combinedText);
      expect(combinedMessage).toBeTruthy();

      await receiverMessagesPage.openReportForMessage(combinedText);
      await receiverMessagesPage.submitReport('Spam');
      await expect(receiverPage.getByText(/already reported this user/i)).toBeVisible();
      await receiverPage.keyboard.press('Escape');

      await receiverMessagesPage.expectOwnMessageNotReportable(receiverReply);
    });

    await test.step('Conversation stays accessible after reporting and retains message history after reload', async () => {
      await receiverPage.reload();
      await receiverMessagesPage.expectMessageVisible(plainText);
      await receiverMessagesPage.expectMessageVisible(trimmedText);
      await receiverMessagesPage.expectCombinedMessage(combinedText, 'icon.png');
      await receiverMessagesPage.expectMessageVisible(receiverReply);
    });

    await receiverContext.close();
    await outsiderContext.close();
  });
});
