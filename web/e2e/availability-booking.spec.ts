import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from './api/TestDataApi';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { ProfilePage } from './pages/ProfilePage';

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test.describe('AT-AVAIL-004: Availability & Booking', () => {
  test('mentor publishes availability and mentee books through request acceptance', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    const mentor: UserSeed = {
      email: `dr.ayse.${runId}@example.com`,
      username: `dr_ayse_${runId}`,
      displayName: `Dr Ayse ${runId}`,
      title: 'Machine Learning Mentor',
      bio: 'Mentors students on machine learning foundations, project planning, and applied model evaluation.',
      skills: ['Machine Learning', 'Python/Django', 'Testing'],
    };
    const mentee: UserSeed = {
      email: `cem.mentee.${runId}@example.com`,
      username: `cem_mentee_${runId}`,
      displayName: `Cem Mentee ${runId}`,
      title: 'Computer Science Student',
      bio: 'Looking for structured mentorship on machine learning projects.',
      skills: ['Machine Learning'],
    };
    const otherMentee: UserSeed = {
      email: `other.mentee.${runId}@example.com`,
      username: `other_mentee_${runId}`,
      displayName: `Other Mentee ${runId}`,
      title: 'Junior Developer',
      bio: 'Wants guidance on model evaluation and reliable experimentation.',
      skills: ['Machine Learning'],
    };
    const coverLetter = `Hi Dr Ayse, I would like help planning a machine learning project. Run ${runId}.`;

    const mentorAuth = await api.seedUser(mentor, 'MENTOR');
    const menteeAuth = await api.seedUser(mentee, 'MENTEE');
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

    await test.step('Mentee discovers mentor and sends a request with a cover letter', async () => {
      const discoverPage = new DiscoverPage(page);
      const profilePage = new ProfilePage(page);

      await api.loginInBrowser(page, menteeAuth);
      await discoverPage.goto();
      await discoverPage.search(mentor.displayName);
      await discoverPage.openMentorProfile(mentor.displayName);
      await profilePage.expectLoaded(mentor.username, mentor.displayName);
      await profilePage.sendMentorshipRequest(coverLetter);

      const requests = await api.fetchMyRequests(menteeAuth);
      const pendingRequest = requests.find((item) => item.mentor.username === mentor.username);
      expect(pendingRequest?.status).toBe('PENDING');
      expect(pendingRequest?.slot_id).toBe(firstSlot.id);
      expect(pendingRequest?.cover_letter).toBe(coverLetter);
    });

    await test.step('Duplicate request to same mentor is rejected while pending', async () => {
      const duplicate = await api.sendMentorshipRequest(menteeAuth, {
        mentor_username: mentor.username,
        slot_id: secondSlot.id,
        cover_letter: 'Trying to send a duplicate pending request.',
      });
      expect(duplicate.status()).toBe(400);
    });

    await test.step('Mentee can track pending request on dashboard', async () => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.expectSentRequest(mentor.displayName, coverLetter);
    });

    const mentorContext = await browser.newContext();
    const mentorPage = await mentorContext.newPage();

    await test.step('Mentor accepts incoming request from dashboard', async () => {
      const mentorDashboard = new DashboardPage(mentorPage);
      await api.loginInBrowser(mentorPage, mentorAuth);
      await mentorDashboard.goto();
      await mentorDashboard.acceptIncomingRequest(mentee.displayName, coverLetter);

      const requests = await api.fetchMyRequests(mentorAuth);
      const acceptedRequest = requests.find((item) => item.mentee.username === mentee.username);
      expect(acceptedRequest?.status).toBe('ACCEPTED');
    });

    await test.step('Accepted request creates match, booked slot, and upcoming session', async () => {
      const matches = await api.fetchMyMatches(menteeAuth);
      expect(matches.some((match) => match.mentor.username === mentor.username && match.is_active)).toBeTruthy();

      const sessions = await api.fetchMySessions(menteeAuth);
      expect(sessions.some((session) => session.mentor.username === mentor.username)).toBeTruthy();

      const slots = await api.fetchAvailabilitySlots(mentor.username, menteeAuth);
      expect(slots.find((slot) => slot.id === firstSlot.id)?.status).toBe('BOOKED');
    });

    await test.step('Mentee sees confirmed session on dashboard', async () => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.expectUpcomingSession(mentor.displayName);
    });

    await test.step('Another mentee can request a different available slot from same mentor', async () => {
      const response = await api.sendMentorshipRequest(otherMenteeAuth, {
        mentor_username: mentor.username,
        slot_id: secondSlot.id,
        cover_letter: 'I would like the later slot for a separate mentorship request.',
      });
      expect(response.status()).toBe(201);
    });

    await mentorContext.close();
  });
});
