import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';
import { ConnectionsPage } from '../pages/ConnectionsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DiscoverPage } from '../pages/DiscoverPage';
import { ProfilePage } from '../pages/ProfilePage';

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test.describe('AT-006: Mentorship Requests & Matching', () => {
  test('validates request submission, duplicate prevention, acceptance, matching, and decline', async ({
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
    const acceptedMentee: UserSeed = {
      email: `accepted.mentee.${runId}@example.com`,
      username: `accepted_mentee_${runId}`,
      displayName: `Accepted Mentee ${runId}`,
      title: 'Capstone Student',
      bio: 'Seeking long-term full stack mentorship.',
      skills: ['React', 'Testing'],
    };
    const otherMentee: UserSeed = {
      email: `other.mentee.${runId}@example.com`,
      username: `other_mentee_${runId}`,
      displayName: `Other Mentee ${runId}`,
      title: 'Sophomore Developer',
      bio: 'Looking for project feedback before applying again later.',
      skills: ['React'],
    };
    const discoverySkill = 'React';
    const acceptedCoverLetter = `I would like ongoing full stack mentorship for my capstone. Run ${runId}.`;
    const declinedCoverLetter = `I would like short-term guidance on my React project. Run ${runId}.`;

    const mentorAuth = await api.seedUser(mentor, 'MENTOR');
    const acceptedMenteeAuth = await api.seedUser(acceptedMentee, 'MENTEE');
    const otherMenteeAuth = await api.seedUser(otherMentee, 'MENTEE');

    const slotDate = toDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const firstSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: slotDate,
      startTime: '14:00:00',
      endTime: '15:00:00',
    });
    const secondSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: slotDate,
      startTime: '15:00:00',
      endTime: '16:00:00',
    });
    let acceptedRequestSlotId = '';
    let acceptedRequestId = '';

    await test.step('Mentee discovers mentor by skill and submits a request with cover letter', async () => {
      const discoverPage = new DiscoverPage(page);
      const profilePage = new ProfilePage(page);
      const dashboardPage = new DashboardPage(page);

      await api.loginInBrowser(page, acceptedMenteeAuth);
      await discoverPage.goto();
      await discoverPage.filterBySkill(discoverySkill);
      await discoverPage.search(mentor.displayName);
      await discoverPage.expectMentorCard(mentor.displayName, discoverySkill);
      await discoverPage.openMentorProfile(mentor.displayName);
      await profilePage.expectLoaded(mentor.username, mentor.displayName);
      await profilePage.sendMentorshipRequest(acceptedCoverLetter);

      const requests = await api.fetchMyRequests(acceptedMenteeAuth);
      const pendingRequest = requests.find((item) => item.mentor.username === mentor.username);
      expect(pendingRequest?.status).toBe('PENDING');
      expect(pendingRequest?.cover_letter).toBe(acceptedCoverLetter);
      expect(pendingRequest?.slot_id).toBe(firstSlot.id);
      acceptedRequestId = pendingRequest?.id ?? '';
      acceptedRequestSlotId = pendingRequest?.slot_id ?? '';

      await dashboardPage.goto();
      await dashboardPage.expectSentRequest(mentor.displayName, acceptedCoverLetter);
    });

    await test.step('One pending request per mentor is enforced', async () => {
      const duplicate = await api.trySendMentorshipRequest(acceptedMenteeAuth, {
        mentor_username: mentor.username,
        slot_id: secondSlot.id,
        cover_letter: 'Trying to send a second pending request to the same mentor.',
      });
      expect(duplicate.status()).toBe(400);
      await expect(duplicate.json()).resolves.toMatchObject({
        detail: 'You already have a pending request with this mentor.',
      });
    });

    const mentorContext = await browser.newContext();
    const mentorPage = await mentorContext.newPage();

    await test.step('Mentor accepts the pending request and creates an active match', async () => {
      const mentorDashboard = new DashboardPage(mentorPage);

      await api.loginInBrowser(mentorPage, mentorAuth);
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
    });

    await test.step('Accepted match appears for both participants', async () => {
      const dashboardPage = new DashboardPage(page);
      const menteeConnections = new ConnectionsPage(page);
      const mentorConnections = new ConnectionsPage(mentorPage);

      await dashboardPage.goto();
      await page.reload();
      await dashboardPage.expectNotification('Request Accepted', mentor.displayName);
      await menteeConnections.goto();
      await menteeConnections.expectMenteeConnection(mentor.displayName);

      await mentorConnections.goto();
      await mentorConnections.expectMentorConnection(acceptedMentee.displayName);
    });

    await test.step('Another mentee cannot book the accepted slot but can request a different slot', async () => {
      const otherPage = await browser.newPage();
      const profilePage = new ProfilePage(otherPage);

      await api.loginInBrowser(otherPage, otherMenteeAuth);
      await otherPage.goto(`/profiles/${mentor.username}`);
      await profilePage.expectLoaded(mentor.username, mentor.displayName);

      const slotsAfterAcceptance = await api.fetchAvailabilitySlots(mentor.username, otherMenteeAuth);
      expect(slotsAfterAcceptance.find((slot) => slot.id === firstSlot.id)?.status).toBe('BOOKED');

      await profilePage.sendMentorshipRequest(declinedCoverLetter);

      const pendingRequests = await api.fetchMyRequests(otherMenteeAuth);
      const otherRequest = pendingRequests.find((item) => item.mentor.username === mentor.username);
      expect(otherRequest?.status).toBe('PENDING');
      expect(otherRequest?.slot_id).toBe(secondSlot.id);

      await otherPage.close();
    });

    await test.step('Mentor declines the later pending request', async () => {
      const mentorDashboard = new DashboardPage(mentorPage);

      await mentorDashboard.goto();
      await mentorDashboard.declineIncomingRequest(otherMentee.displayName, declinedCoverLetter);

      const requests = await api.fetchMyRequests(mentorAuth);
      const rejectedRequest = requests.find((item) => item.mentee.username === otherMentee.username);
      expect(rejectedRequest?.status).toBe('REJECTED');

      const matches = await api.fetchMyMatches(otherMenteeAuth);
      expect(matches.some((match) => match.mentor.username === mentor.username)).toBeFalsy();

      const slots = await api.fetchAvailabilitySlots(mentor.username, otherMenteeAuth);
      expect(slots.find((slot) => slot.id === secondSlot.id)?.status).toBe('AVAILABLE');
    });

    await test.step('Declined mentee sees rejection notification and no connection', async () => {
      const otherPage = await browser.newPage();
      const dashboardPage = new DashboardPage(otherPage);
      const connectionsPage = new ConnectionsPage(otherPage);

      await api.loginInBrowser(otherPage, otherMenteeAuth);
      await dashboardPage.expectNotification('Request Rejected', mentor.displayName);
      await connectionsPage.goto();
      await connectionsPage.expectNoConnection(mentor.displayName);

      const notifications = await api.fetchNotifications(otherMenteeAuth);
      expect(notifications.some((item) => item.type === 'mentorship_request_rejected')).toBeTruthy();

      const repeatedResponse = await api.tryRespondToRequest(mentorAuth, acceptedRequestId, 'reject');
      expect(repeatedResponse.status()).toBe(400);
      await expect(repeatedResponse.json()).resolves.toMatchObject({
        detail: 'Only pending requests can be accepted or rejected.',
      });

      await otherPage.close();
    });

    await mentorContext.close();
  });
});
