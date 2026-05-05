import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from './api/TestDataApi';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { ProfilePage } from './pages/ProfilePage';

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test.describe('AT-006: Mentorship Requests & Matching', () => {
  test('validates request submission, duplicate prevention, decline, acceptance, and match creation', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    const mentor: UserSeed = {
      email: `request.mentor.${runId}@example.com`,
      username: `request_mentor_${runId}`,
      displayName: `Request Mentor ${runId}`,
      title: 'Full Stack Mentor',
      bio: 'Guides students through full stack project planning and implementation.',
      skills: ['React', 'Python/Django', 'System Design'],
    };
    const declinedMentee: UserSeed = {
      email: `declined.mentee.${runId}@example.com`,
      username: `declined_mentee_${runId}`,
      displayName: `Declined Mentee ${runId}`,
      title: 'Sophomore Developer',
      bio: 'Looking for project feedback before applying again later.',
      skills: ['React'],
    };
    const acceptedMentee: UserSeed = {
      email: `accepted.mentee.${runId}@example.com`,
      username: `accepted_mentee_${runId}`,
      displayName: `Accepted Mentee ${runId}`,
      title: 'Capstone Student',
      bio: 'Seeking long-term full stack mentorship.',
      skills: ['React', 'Testing'],
    };
    const declinedCoverLetter = `I would like short-term guidance on my React project. Run ${runId}.`;
    const acceptedCoverLetter = `I would like ongoing full stack mentorship for my capstone. Run ${runId}.`;

    const mentorAuth = await api.seedUser(mentor, 'MENTOR');
    const declinedMenteeAuth = await api.seedUser(declinedMentee, 'MENTEE');
    const acceptedMenteeAuth = await api.seedUser(acceptedMentee, 'MENTEE');

    const slotDate = toDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const firstSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: slotDate,
      startTime: '13:00:00',
      endTime: '14:00:00',
    });
    const duplicateAttemptSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: slotDate,
      startTime: '14:00:00',
      endTime: '15:00:00',
    });
    await api.createAvailabilitySlot(mentorAuth, {
      date: slotDate,
      startTime: '15:00:00',
      endTime: '16:00:00',
    });
    let acceptedRequestSlotId = '';

    await test.step('Mentee discovers mentor and submits a request with cover letter', async () => {
      const discoverPage = new DiscoverPage(page);
      const profilePage = new ProfilePage(page);
      const dashboardPage = new DashboardPage(page);

      await api.loginInBrowser(page, declinedMenteeAuth);
      await discoverPage.goto();
      await discoverPage.search(mentor.displayName);
      await discoverPage.openMentorProfile(mentor.displayName);
      await profilePage.expectLoaded(mentor.username, mentor.displayName);
      await profilePage.sendMentorshipRequest(declinedCoverLetter);

      const requests = await api.fetchMyRequests(declinedMenteeAuth);
      const pendingRequest = requests.find((item) => item.mentor.username === mentor.username);
      expect(pendingRequest?.status).toBe('PENDING');
      expect(pendingRequest?.cover_letter).toBe(declinedCoverLetter);
      expect(pendingRequest?.slot_id).toBe(firstSlot.id);

      await dashboardPage.goto();
      await dashboardPage.expectSentRequest(mentor.displayName, declinedCoverLetter);
    });

    await test.step('One pending request per mentor is enforced', async () => {
      const duplicate = await api.sendMentorshipRequest(declinedMenteeAuth, {
        mentor_username: mentor.username,
        slot_id: duplicateAttemptSlot.id,
        cover_letter: 'Trying to send a second pending request to the same mentor.',
      });
      expect(duplicate.status()).toBe(400);
      await expect(duplicate.json()).resolves.toMatchObject({
        detail: 'You already have a pending request with this mentor.',
      });
    });

    const mentorContext = await browser.newContext();
    const mentorPage = await mentorContext.newPage();

    await test.step('Mentor declines a pending request', async () => {
      const mentorDashboard = new DashboardPage(mentorPage);

      await api.loginInBrowser(mentorPage, mentorAuth);
      await mentorDashboard.declineIncomingRequest(declinedMentee.displayName, declinedCoverLetter);

      const requests = await api.fetchMyRequests(mentorAuth);
      const rejectedRequest = requests.find((item) => item.mentee.username === declinedMentee.username);
      expect(rejectedRequest?.status).toBe('REJECTED');

      const matches = await api.fetchMyMatches(declinedMenteeAuth);
      expect(matches.some((match) => match.mentor.username === mentor.username)).toBeFalsy();

      const slots = await api.fetchAvailabilitySlots(mentor.username, declinedMenteeAuth);
      expect(slots.find((slot) => slot.id === firstSlot.id)?.status).toBe('AVAILABLE');
    });

    await test.step('Declined mentee sees rejection notification and no connection', async () => {
      const dashboardPage = new DashboardPage(page);
      const connectionsPage = new ConnectionsPage(page);

      await dashboardPage.goto();
      await page.reload();
      await dashboardPage.expectNotification('Request Rejected', mentor.displayName);
      await connectionsPage.goto();
      await connectionsPage.expectNoConnection(mentor.displayName);

      const notifications = await api.fetchNotifications(declinedMenteeAuth);
      expect(notifications.some((item) => item.type === 'mentorship_request_rejected')).toBeTruthy();
    });

    await test.step('Second mentee submits a request that mentor accepts', async () => {
      const acceptedPage = await browser.newPage();
      const discoverPage = new DiscoverPage(acceptedPage);
      const profilePage = new ProfilePage(acceptedPage);
      const mentorDashboard = new DashboardPage(mentorPage);

      await api.loginInBrowser(acceptedPage, acceptedMenteeAuth);
      await discoverPage.goto();
      await discoverPage.search(mentor.displayName);
      await discoverPage.openMentorProfile(mentor.displayName);
      await profilePage.expectLoaded(mentor.username, mentor.displayName);
      await profilePage.sendMentorshipRequest(acceptedCoverLetter);

      const pendingRequests = await api.fetchMyRequests(acceptedMenteeAuth);
      const acceptedPathRequest = pendingRequests.find((item) => item.mentor.username === mentor.username);
      expect(acceptedPathRequest?.status).toBe('PENDING');
      acceptedRequestSlotId = acceptedPathRequest?.slot_id ?? '';

      await mentorDashboard.goto();
      await mentorDashboard.acceptIncomingRequest(acceptedMentee.displayName, acceptedCoverLetter);

      const mentorRequests = await api.fetchMyRequests(mentorAuth);
      const acceptedRequest = mentorRequests.find((item) => item.mentee.username === acceptedMentee.username);
      expect(acceptedRequest?.status).toBe('ACCEPTED');

      const matches = await api.fetchMyMatches(acceptedMenteeAuth);
      expect(matches.some((match) => (
        match.mentor.username === mentor.username
        && match.mentee.username === acceptedMentee.username
        && match.is_active
      ))).toBeTruthy();

      const slots = await api.fetchAvailabilitySlots(mentor.username, acceptedMenteeAuth);
      expect(slots.find((slot) => slot.id === acceptedRequestSlotId)?.status).toBe('BOOKED');

      await acceptedPage.close();
    });

    await test.step('Accepted match appears for both participants', async () => {
      const acceptedPage = await browser.newPage();
      const menteeDashboard = new DashboardPage(acceptedPage);
      const menteeConnections = new ConnectionsPage(acceptedPage);
      const mentorConnections = new ConnectionsPage(mentorPage);

      await api.loginInBrowser(acceptedPage, acceptedMenteeAuth);
      await menteeDashboard.expectNotification('Request Accepted', mentor.displayName);
      await menteeConnections.goto();
      await menteeConnections.expectMenteeConnection(mentor.displayName);

      await mentorConnections.goto();
      await mentorConnections.expectMentorConnection(acceptedMentee.displayName);
      await mentorConnections.expectNoConnection(declinedMentee.displayName);

      await acceptedPage.close();
    });

    await mentorContext.close();
  });
});
