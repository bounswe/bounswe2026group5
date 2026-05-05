import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';
import { DashboardPage } from '../pages/DashboardPage';
import { DiscoverPage } from '../pages/DiscoverPage';
import { ProfilePage } from '../pages/ProfilePage';

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

    const mentorAuth = await api.seedUser(mentor, 'MENTOR');
    const menteeAuth = await api.seedUser(mentee, 'MENTEE');
    const otherMenteeAuth = await api.seedUser(otherMentee, 'MENTEE');

    await test.step('Mentor starts with an empty availability calendar', async () => {
      const profilePage = new ProfilePage(page);

      await api.loginInBrowser(page, mentorAuth);
      await profilePage.goto(mentor.username);
      await profilePage.expectOwnerAvailabilityEmpty();
      const slots = await api.fetchAvailabilitySlots(mentor.username, mentorAuth);
      expect(slots).toEqual([]);
    });

    let firstSlotId = '';
    let secondSlotId = '';

    await test.step('Mentor creates first availability slot and overlapping slot is rejected', async () => {
      const profilePage = new ProfilePage(page);

      await profilePage.createAvailabilityCell(6, 14);
      await profilePage.expectAvailabilityCount(1);

      const slots = await api.fetchAvailabilitySlots(mentor.username, mentorAuth);
      const firstSlot = slots.find((slot) => (
        slot.date === '2026-05-10'
        && slot.startTime === '14:00:00'
        && slot.endTime === '15:00:00'
      ));
      expect(firstSlot?.status).toBe('AVAILABLE');
      firstSlotId = firstSlot?.id ?? '';

      const overlap = await api.tryCreateAvailabilitySlot(mentorAuth, {
        date: '2026-05-10',
        startTime: '14:30:00',
        endTime: '15:30:00',
      });
      expect(overlap.status()).toBe(400);
      await expect(overlap.json()).resolves.toMatchObject({
        detail: expect.stringContaining('overlaps'),
      });
      expect(await api.fetchAvailabilitySlots(mentor.username, mentorAuth)).toHaveLength(1);
    });

    await test.step('Mentor creates adjacent slot and past slot creation is blocked', async () => {
      const profilePage = new ProfilePage(page);

      await profilePage.createAvailabilityCell(6, 15);
      await profilePage.expectAvailabilityCount(2);

      const slots = await api.fetchAvailabilitySlots(mentor.username, mentorAuth);
      const secondSlot = slots.find((slot) => (
        slot.date === '2026-05-10'
        && slot.startTime === '15:00:00'
        && slot.endTime === '16:00:00'
      ));
      expect(secondSlot?.status).toBe('AVAILABLE');
      secondSlotId = secondSlot?.id ?? '';

      const past = await api.tryCreateAvailabilitySlot(mentorAuth, {
        date: '2026-04-10',
        startTime: '10:00:00',
        endTime: '11:00:00',
      });
      expect(past.status()).toBe(400);
      await expect(past.json()).resolves.toMatchObject({
        date: expect.arrayContaining([expect.stringContaining('past')]),
      });
      expect(slots.some((slot) => slot.date === '2026-04-10')).toBeFalsy();
    });

    await test.step('Mentee discovers mentor by skill and sends an empty-cover-letter request', async () => {
      const discoverPage = new DiscoverPage(page);
      const profilePage = new ProfilePage(page);

      await api.loginInBrowser(page, menteeAuth);
      await discoverPage.goto();
      await discoverPage.filterBySkill('Machine Learning');
      await discoverPage.search(mentor.displayName);
      await discoverPage.openMentorProfile(mentor.displayName);
      await profilePage.expectLoaded(mentor.username, mentor.displayName);
      await profilePage.expectBookableSlots(2);
      await profilePage.sendMentorshipRequest();

      const requests = await api.fetchMyRequests(menteeAuth);
      const pendingRequest = requests.find((item) => item.mentor.username === mentor.username);
      expect(pendingRequest?.status).toBe('PENDING');
      expect(pendingRequest?.slot_id).toBe(firstSlotId);
      expect(pendingRequest?.cover_letter).toBe('');
    });

    await test.step('Duplicate request to same mentor is blocked while pending', async () => {
      const duplicate = await api.trySendMentorshipRequest(menteeAuth, {
        mentor_username: mentor.username,
        slot_id: secondSlotId,
        cover_letter: 'Trying to send a duplicate pending request.',
      });
      expect(duplicate.status()).toBe(400);

      const profilePage = new ProfilePage(page);
      await profilePage.goto(mentor.username);
      await profilePage.expectPendingRequestBlocksOtherSlots();
    });

    await test.step('Mentee can track pending request on dashboard', async () => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.expectSentRequest(mentor.displayName);
    });

    const mentorContext = await browser.newContext();
    const mentorPage = await mentorContext.newPage();

    await test.step('Mentor accepts incoming request from dashboard', async () => {
      const mentorDashboard = new DashboardPage(mentorPage);
      await api.loginInBrowser(mentorPage, mentorAuth);
      await mentorDashboard.goto();
      await mentorDashboard.acceptIncomingRequest(mentee.displayName);

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
      expect(slots.find((slot) => slot.id === firstSlotId)?.status).toBe('BOOKED');
    });

    await test.step('Mentee sees confirmed session on dashboard', async () => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.expectUpcomingSession(mentor.displayName);
    });

    await test.step('Another mentee can request a different available slot from same mentor', async () => {
      const response = await api.trySendMentorshipRequest(otherMenteeAuth, {
        mentor_username: mentor.username,
        slot_id: secondSlotId,
        cover_letter: 'I would like the later slot for a separate mentorship request.',
      });
      expect(response.status()).toBe(201);
    });

    await mentorContext.close();
  });
});
