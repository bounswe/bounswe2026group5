import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';
import { DashboardPage } from '../pages/DashboardPage';

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test.describe('AT-002: Notifications Lifecycle', () => {
  test('validates mentorship notifications: requests, responses, and direct bookings', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    
    const mentor: UserSeed = {
      email: `notif.mentor.${runId}@example.com`,
      username: `notif_mentor_${runId}`,
      displayName: `Notif Mentor ${runId}`,
      title: 'Senior Mentor',
      bio: 'Testing notifications.',
      skills: ['General'],
    };

    const mentee: UserSeed = {
      email: `notif.mentee.${runId}@example.com`,
      username: `notif_mentee_${runId}`,
      displayName: `Notif Mentee ${runId}`,
      title: 'Eager Learner',
      bio: 'Testing history.',
      skills: ['General'],
    };

    const mentorAuth = await api.seedUser(mentor, 'MENTOR');
    const menteeAuth = await api.seedUser(mentee, 'MENTEE');

    const slotDate = toDateString(new Date(Date.now() + 48 * 60 * 60 * 1000));
    const firstSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: slotDate,
      startTime: '10:00:00',
      endTime: '11:00:00',
    });
    const secondSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: slotDate,
      startTime: '11:00:00',
      endTime: '12:00:00',
    });
    const thirdSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: slotDate,
      startTime: '12:00:00',
      endTime: '13:00:00',
    });

    const menteePage = page;
    const mentorContext = await browser.newContext();
    const mentorPage = await mentorContext.newPage();

    const mentorDashboard = new DashboardPage(mentorPage);
    const menteeDashboard = new DashboardPage(menteePage);

    // Setup: Login
    await api.loginInBrowser(mentorPage, mentorAuth);
    await api.loginInBrowser(menteePage, menteeAuth);

    await test.step('1. Mentee sends first request', async () => {
      await api.sendMentorshipRequest(menteeAuth, {
        mentor_username: mentor.username,
        slot_id: firstSlot.id,
        cover_letter: 'Rejection test',
      });
    });

    await test.step('2. Mentor reviews request alert', async () => {
      await mentorDashboard.goto();
      await mentorDashboard.expectNotification('New Mentorship Request', mentee.displayName);
    });

    await test.step('3. Mentor rejects request', async () => {
      await mentorDashboard.declineIncomingRequest(mentee.displayName);
    });

    await test.step('4. Mentee reviews rejection', async () => {
      // Manual refresh since we are not modifying source code to add polling
      await menteeDashboard.goto();
      await menteeDashboard.expectNotification('Request Rejected', mentor.displayName);
    });

    await test.step('5. Mentee sends second request', async () => {
      await api.sendMentorshipRequest(menteeAuth, {
        mentor_username: mentor.username,
        slot_id: secondSlot.id,
        cover_letter: 'Acceptance test',
      });
    });

    await test.step('6. Mentor accepts second request', async () => {
      await mentorDashboard.goto();
      await mentorDashboard.acceptIncomingRequest(mentee.displayName);
    });

    await test.step('7. Mentee reviews acceptance', async () => {
      // Manual refresh since we are not modifying source code
      await menteeDashboard.goto();
      await menteeDashboard.expectNotification('Request Accepted', mentor.displayName);
    });

    await test.step('8. Mentee books slot directly', async () => {
      // Direct booking for matched users
      await api.bookAvailabilitySlot(menteeAuth, mentor.username, thirdSlot.id);
    });

    await test.step('9. Mentor reviews booking notification', async () => {
      // Manual refresh since we are not modifying source code
      await mentorDashboard.goto();
      await mentorDashboard.expectNotification('Slot Booked', mentee.displayName);
    });

    await mentorContext.close();
  });
});
