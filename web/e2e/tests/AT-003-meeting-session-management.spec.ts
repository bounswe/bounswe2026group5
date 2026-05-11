import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SchedulePage } from '../pages/SchedulePage';

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nextWeekday(base: Date, weekday: number) {
  const next = new Date(base);
  const delta = (weekday + 7 - next.getDay()) % 7 || 7;
  next.setDate(next.getDate() + delta);
  return next;
}

function formatScheduleDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRescheduleLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

test.describe('AT-003: Meeting Session Management', () => {
  test('mentee and mentor manage a rescheduled and canceled session from web surfaces', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    const mentor: UserSeed = {
      email: `session.mentor.${runId}@example.com`,
      username: `session_mentor_${runId}`,
      displayName: `Session Mentor ${runId}`,
      title: 'Backend Architecture Mentor',
      bio: 'Helps mentees plan resilient backend systems and review architecture tradeoffs.',
      skills: ['System Design', 'Python/Django', 'Testing'],
    };
    const mentee: UserSeed = {
      email: `session.mentee.${runId}@example.com`,
      username: `session_mentee_${runId}`,
      displayName: `Session Mentee ${runId}`,
      title: 'Computer Engineering Student',
      bio: 'Preparing for a backend architecture mentorship session.',
      skills: ['System Design'],
    };
    const unrelated: UserSeed = {
      email: `session.unrelated.${runId}@example.com`,
      username: `session_unrelated_${runId}`,
      displayName: `Unrelated User ${runId}`,
      title: 'Frontend Student',
      bio: 'Not involved in this mentorship session.',
      skills: ['React'],
    };

    const mentorAuth = await api.seedUser(mentor, 'MENTOR');
    const menteeAuth = await api.seedUser(mentee, 'MENTEE');
    const unrelatedAuth = await api.seedUser(unrelated, 'MENTEE');

    const originalDate = nextWeekday(new Date(), 3);
    const newDate = addDays(originalDate, 2);

    const originalSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: toDateString(originalDate),
      startTime: '14:00:00',
      endTime: '15:00:00',
    });
    const newSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: toDateString(newDate),
      startTime: '10:00:00',
      endTime: '11:00:00',
    });
    const alreadyBookedSlot = await api.createAvailabilitySlot(mentorAuth, {
      date: toDateString(newDate),
      startTime: '11:00:00',
      endTime: '12:00:00',
    });

    const requestForOriginalSlot = await api.sendMentorshipRequest(menteeAuth, {
      mentor_username: mentor.username,
      slot_id: originalSlot.id,
      cover_letter: 'I would like to discuss backend architecture during this scheduled session.',
    });
    await api.respondToRequest(mentorAuth, requestForOriginalSlot.id, 'accept');

    const requestForAlreadyBookedSlot = await api.sendMentorshipRequest(unrelatedAuth, {
      mentor_username: mentor.username,
      slot_id: alreadyBookedSlot.id,
      cover_letter: 'This request books another slot so it is not available for rescheduling.',
    });
    await api.respondToRequest(mentorAuth, requestForAlreadyBookedSlot.id, 'accept');

    let sessionId = '';

    await test.step('Mentee opens Schedule and sees only their upcoming session', async () => {
      const schedulePage = new SchedulePage(page);

      await api.loginInBrowser(page, menteeAuth);
      await schedulePage.openFromNavigation();
      await schedulePage.expectMenteeSchedule();
      await schedulePage.expectSession({
        peerName: mentor.displayName,
        date: formatScheduleDate(originalDate),
        time: '14:00 – 15:00',
        status: 'Upcoming',
      });
      await schedulePage.expectSessionNotListed(unrelated.displayName);

      const sessions = await api.fetchMySessions(menteeAuth);
      const session = sessions.find((item) => item.mentor.username === mentor.username);
      expect(session?.source_slot_id).toBe(originalSlot.id);
      expect(session?.allowed_actions).toEqual(expect.arrayContaining(['cancel', 'reschedule']));
      sessionId = session?.session_id ?? '';
    });

    await test.step('Mentee opens the mentor profile from the calendar row', async () => {
      const schedulePage = new SchedulePage(page);
      const profilePage = new ProfilePage(page);

      await schedulePage.openPeerProfile(mentor.displayName);
      await profilePage.expectLoaded(mentor.username, mentor.displayName);
    });

    await test.step('Mentee reschedules to the alternate future slot', async () => {
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.goto();
      await dashboardPage.openSessionManager(mentor.displayName);
      await dashboardPage.rescheduleSession({
        dayLabel: formatRescheduleLabel(newDate),
        timeLabel: '10:00 – 11:00',
      });

      const sessions = await api.fetchMySessions(menteeAuth);
      const rescheduledSession = sessions.find((item) => item.session_id === sessionId);
      expect(rescheduledSession?.source_slot_id).toBe(newSlot.id);
      expect(rescheduledSession?.display_status).toBe('RESCHEDULED');

      const slots = await api.fetchAvailabilitySlots(mentor.username, menteeAuth);
      expect(slots.find((slot) => slot.id === originalSlot.id)?.status).toBe('AVAILABLE');
      expect(slots.find((slot) => slot.id === newSlot.id)?.status).toBe('BOOKED');
      expect(slots.find((slot) => slot.id === alreadyBookedSlot.id)?.status).toBe('BOOKED');
    });

    await test.step('Mentee calendar shows the updated date and time', async () => {
      const schedulePage = new SchedulePage(page);

      await schedulePage.goto();
      await schedulePage.expectSession({
        peerName: mentor.displayName,
        date: formatScheduleDate(newDate),
        time: '10:00 – 11:00',
        status: 'Upcoming',
      });
      await schedulePage.goToMonth(newDate);
      await schedulePage.filterBySessionDate(newDate, mentor.displayName);
      await schedulePage.expectSession({
        peerName: mentor.displayName,
        date: formatScheduleDate(newDate),
        time: '10:00 – 11:00',
        status: 'Upcoming',
      });
    });

    const mentorContext = await browser.newContext();
    const mentorPage = await mentorContext.newPage();

    await test.step('Mentor sees the reschedule notification and matching schedule entry', async () => {
      const mentorDashboard = new DashboardPage(mentorPage);
      const mentorSchedule = new SchedulePage(mentorPage);

      await api.loginInBrowser(mentorPage, mentorAuth);
      await mentorDashboard.expectNotification('Session Rescheduled', mentee.displayName);
      await mentorSchedule.openFromNavigation();
      await mentorSchedule.expectMentorSchedule();
      await mentorSchedule.expectSession({
        peerName: mentee.displayName,
        date: formatScheduleDate(newDate),
        time: '10:00 – 11:00',
        status: 'Upcoming',
      });
    });

    await test.step('Mentor cancels the rescheduled session', async () => {
      const mentorDashboard = new DashboardPage(mentorPage);

      await mentorDashboard.goto();
      await mentorDashboard.openSessionManager(mentee.displayName);
      await mentorDashboard.cancelSession();

      const canceledSessions = await api.fetchMySessions(mentorAuth, '?role=mentor&status=canceled');
      const canceledSession = canceledSessions.find((item) => item.session_id === sessionId);
      expect(canceledSession?.display_status).toBe('CANCELED');
      expect(canceledSession?.allowed_actions).toEqual([]);

      const slots = await api.fetchAvailabilitySlots(mentor.username, mentorAuth);
      expect(slots.find((slot) => slot.id === newSlot.id)?.status).toBe('AVAILABLE');
    });

    await test.step('Mentee sees cancellation notification and no active upcoming session', async () => {
      const menteeDashboard = new DashboardPage(page);
      const menteeSchedule = new SchedulePage(page);

      await menteeDashboard.goto();
      await page.reload();
      await menteeDashboard.expectNotification('Session Canceled', mentor.displayName);

      await menteeSchedule.goto();
      await menteeSchedule.expectSessionNotListed(mentor.displayName);

      const canceledSessions = await api.fetchMySessions(menteeAuth, '?role=mentee&status=canceled');
      expect(canceledSessions.some((item) => item.session_id === sessionId)).toBeTruthy();

      const unrelatedNotifications = await api.fetchNotifications(unrelatedAuth);
      expect(unrelatedNotifications.some((item) => item.resource_id === sessionId)).toBeFalsy();
    });

    await mentorContext.close();
  });
});
