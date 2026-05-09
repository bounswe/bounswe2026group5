import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';

test.describe('AT-005: Messaging and Moderation', () => {
  test('validates secure communication, access control, and reporting', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);

    const runId = Date.now();
    const api = new TestDataApi(request);

    // 1. Seed Users
    const mentorSeed: UserSeed = {
      email: `dr_ayse.${runId}@example.com`,
      username: `dr_ayse_${runId}`,
      displayName: `Dr. Ayşe ${runId}`,
      title: 'Expert Mentor',
      bio: 'Python expert.',
      skills: ['Python'],
    };

    const menteeSeed: UserSeed = {
      email: `cem_mentee.${runId}@example.com`,
      username: `cem_mentee_${runId}`,
      displayName: `Cem Mentee ${runId}`,
      title: 'Student',
      bio: 'Learning Python.',
      skills: ['Python'],
    };

    const unrelatedSeed: UserSeed = {
      email: `unrelated.${runId}@example.com`,
      username: `unrelated_user_${runId}`,
      displayName: `Unrelated User ${runId}`,
      title: 'Stranger',
      bio: 'No match.',
      skills: ['Java'],
    };

    const mentorAuth = await api.seedUser(mentorSeed, 'MENTOR');
    const menteeAuth = await api.seedUser(menteeSeed, 'MENTEE');
    const unrelatedAuth = await api.seedUser(unrelatedSeed, 'MENTEE');

    // 2. Establish Match (Prerequisite)
    const slot = await api.createAvailabilitySlot(mentorAuth, {
      date: '2026-10-10',
      startTime: '10:00:00',
      endTime: '11:00:00',
    });
    const mentorshipRequest = await api.sendMentorshipRequest(menteeAuth, {
      mentor_username: mentorSeed.username,
      slot_id: slot.id,
      cover_letter: 'Match me please!',
    });
    await api.respondToRequest(mentorAuth, mentorshipRequest.id, 'accept');

    // 3. Setup Browser Contexts
    const mentorContext = await browser.newContext();
    const mentorPage = await mentorContext.newPage();
    const menteeContext = await browser.newContext();
    const menteePage = await menteeContext.newPage();
    const unrelatedContext = await browser.newContext();
    const unrelatedPage = await unrelatedContext.newPage();

    await api.loginInBrowser(mentorPage, mentorAuth);
    await api.loginInBrowser(menteePage, menteeAuth);
    await api.loginInBrowser(unrelatedPage, unrelatedAuth);

    let conversationId = '';

    await test.step('1. Mentee navigates to Messages', async () => {
      await menteePage.goto('/messages');
      const conversationThread = menteePage.getByText(mentorSeed.displayName);
      await expect(conversationThread).toBeVisible();
      await conversationThread.click();

      // Wait for URL synchronization
      await expect(menteePage).toHaveURL(/conversationId=/, { timeout: 10000 });
      await expect(menteePage.getByText('No messages yet')).toBeVisible();

      const url = menteePage.url();
      const match = url.match(/conversationId=([^&]+)/);
      conversationId = match ? match[1] : '';
      expect(conversationId).not.toBe('');
    });

    await test.step('2. Mentee sends a message', async () => {
      const input = menteePage.locator('textarea[placeholder*="message"]');
      await input.fill('Hello dr_ayse! I have a question about the Python exercises.');
      await menteePage.getByRole('button', { name: /send/i }).click();
      await expect(menteePage.getByText('Hello dr_ayse! I have a question about the Python exercises.')).toBeVisible();
    });

    await test.step('3. Mentor receives the message', async () => {
      await mentorPage.goto('/messages');
      const menteeThread = mentorPage.getByText(menteeSeed.displayName);
      await expect(menteeThread).toBeVisible();
      await menteeThread.click();
      await expect(mentorPage.getByText('Hello dr_ayse! I have a question about the Python exercises.')).toBeVisible();
    });

    await test.step('4. Mentor replies to the message', async () => {
      const input = mentorPage.locator('textarea[placeholder*="message"]');
      await input.fill('Thank you Cem! I have prepared some exercises.');
      await mentorPage.getByRole('button', { name: /send/i }).click();
      await expect(mentorPage.getByText('Thank you Cem! I have prepared some exercises.')).toBeVisible();
    });

    await test.step('5. Persistence check', async () => {
      await expect(menteePage.getByText('Thank you Cem! I have prepared some exercises.')).toBeVisible({ timeout: 15000 });
      await menteePage.reload();
      await expect(menteePage.getByText('Hello dr_ayse! I have a question about the Python exercises.')).toBeVisible();
      await expect(menteePage.getByText('Thank you Cem! I have prepared some exercises.')).toBeVisible();
    });

    await test.step('6. Access Control (Unmatched User)', async () => {
      await unrelatedPage.goto('/messages');
      await expect(unrelatedPage.getByText(mentorSeed.displayName)).not.toBeVisible();
      await unrelatedPage.goto(`/messages?conversationId=${conversationId}`);
      await expect(unrelatedPage.getByText('Hello dr_ayse! I have a question about the Python exercises.')).not.toBeVisible();
    });

    await test.step('7. Reporting Workflow Initiation', async () => {
      const mentorMessage = menteePage.getByText('Thank you Cem! I have prepared some exercises.');
      await mentorMessage.hover();

      const reportBtn = menteePage.locator('button[title="Report Message"]').first();
      await expect(reportBtn).toBeVisible();
      await reportBtn.click();

      const modalHeading = menteePage.getByRole('heading', { name: 'Report Message', exact: true });
      await expect(modalHeading).toBeVisible();
    });

    await test.step('8. Submit Moderation Report', async () => {
      await menteePage.locator('select').selectOption({ label: 'Inappropriate Content' });
      await menteePage.getByRole('button', { name: /submit report/i }).click();
      await expect(menteePage.getByText(/report submitted/i).first()).toBeVisible();
    });

    await test.step('9. User-Level Idempotency: Cannot report same user twice', async () => {
      // Find a message from the same mentor (dr_ayse) - we can use the same one
      const mentorMessage = menteePage.getByText('Thank you Cem! I have prepared some exercises.');
      await mentorMessage.hover();

      const reportBtn = menteePage.locator('button[title="Report Message"]').first();
      await reportBtn.click();

      // Select any reason and submit
      await menteePage.locator('select').selectOption({ label: 'Spam' });
      await menteePage.getByRole('button', { name: /submit report/i }).click();

      // Should show the "already reported this user" error
      await expect(menteePage.getByText(/already reported this user/i)).toBeVisible();
      await menteePage.keyboard.press('Escape'); // Close dialog
    });

    await test.step('10. Stability: Rapid message sending', async () => {
      const input = menteePage.locator('textarea[placeholder*="message"]');
      for (let i = 1; i <= 3; i++) {
        await input.fill(`Rapid message ${i}`);
        await menteePage.getByRole('button', { name: /send/i }).click();
      }
      for (let i = 1; i <= 3; i++) {
        await expect(menteePage.getByText(`Rapid message ${i}`)).toBeVisible();
      }
    });

    await mentorContext.close();
    await menteeContext.close();
    await unrelatedContext.close();
  });
});