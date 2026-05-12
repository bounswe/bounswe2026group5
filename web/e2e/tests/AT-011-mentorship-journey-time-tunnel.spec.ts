import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';
import { ConnectionsPage } from '../pages/ConnectionsPage';
import { JourneyPage } from '../pages/JourneyPage';
import { ProfilePage } from '../pages/ProfilePage';

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

test.describe('AT-011: Mentorship Journey / Time Tunnel', () => {
  test('matched users can view, share, edit, delete, and protect journey milestones on web', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(150_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    const connectionsPage = new ConnectionsPage(page);
    const journeyPage = new JourneyPage(page);
    const profilePage = new ProfilePage(page);

    const mentorSeed: UserSeed = {
      email: `journey.mentor.${runId}@example.com`,
      username: `journey_mentor_${runId}`,
      displayName: `Journey Mentor ${runId}`,
      title: 'Mentorship Guide',
      bio: 'Helps mentees reflect on progress and keep a durable record of their shared work.',
      skills: ['System Design', 'Testing'],
    };
    const menteeSeed: UserSeed = {
      email: `journey.mentee.${runId}@example.com`,
      username: `journey_mentee_${runId}`,
      displayName: `Journey Mentee ${runId}`,
      title: 'Learning Builder',
      bio: 'Wants to keep milestones and session history organized in one shared place.',
      skills: ['React', 'Testing'],
    };
    const outsiderSeed: UserSeed = {
      email: `journey.outsider.${runId}@example.com`,
      username: `journey_outsider_${runId}`,
      displayName: `Journey Outsider ${runId}`,
      title: 'Unrelated User',
      bio: 'Should never gain access to someone else’s private mentorship journey.',
      skills: ['TypeScript'],
    };
    const secondMenteeSeed: UserSeed = {
      email: `journey.second.${runId}@example.com`,
      username: `journey_second_${runId}`,
      displayName: `Journey Second ${runId}`,
      title: 'Second Match User',
      bio: 'Used to exercise the empty-state branch for a separate journey.',
      skills: ['Python/Django'],
    };

    const mentorAuth = await api.seedUser(mentorSeed, 'MENTOR');
    const menteeAuth = await api.seedUser(menteeSeed, 'MENTEE');
    const outsiderAuth = await api.seedUser(outsiderSeed, 'MENTEE');
    const secondMenteeAuth = await api.seedUser(secondMenteeSeed, 'MENTEE');

    async function createAcceptedMatch(mentee = menteeAuth, menteeSeedData = menteeSeed, dayOffset = 2) {
      const slotDate = toDateString(addDays(new Date(), dayOffset));
      const slot = await api.createAvailabilitySlot(mentorAuth, {
        date: slotDate,
        startTime: '13:00:00',
        endTime: '14:00:00',
      });
      const mentorshipRequest = await api.sendMentorshipRequest(mentee, {
        mentor_username: mentorSeed.username,
        slot_id: slot.id,
        cover_letter: `I would like to capture milestones for ${menteeSeedData.displayName}.`,
      });
      await api.respondToRequest(mentorAuth, mentorshipRequest.id, 'accept');

      const matches = await api.fetchMyMatches(mentee);
      const match = matches.find((item) => (
        item.mentor.username === mentorSeed.username
        && item.mentee.username === menteeSeedData.username
        && item.is_active
      ));
      expect(match).toBeTruthy();
      return match!;
    }

    const primaryMatch = await createAcceptedMatch();
    const emptyStateMatch = await createAcceptedMatch(secondMenteeAuth, secondMenteeSeed, 4);
    api.clearJourneyEvents(emptyStateMatch.id);

    const firstEntryText = `First manual journey milestone for run ${runId}.`;
    const editedEntryText = `Edited manual journey milestone for run ${runId}.`;

    await test.step('Matched user can open the journey from Connections and see existing auto-generated history', async () => {
      await api.loginInBrowser(page, menteeAuth);
      await connectionsPage.goto();
      await connectionsPage.openJourneyFor(mentorSeed.displayName);

      await journeyPage.expectLoaded(primaryMatch.id);
      await journeyPage.expectTimelineVisible();
      await journeyPage.expectEventVisible('Mentorship began');
      await journeyPage.expectEventVisible('Session scheduled');

      const journey = await api.fetchJourney(menteeAuth, primaryMatch.id);
      expect(journey.results.some((event) => event.type === 'request_accepted')).toBeTruthy();
      expect(journey.results.some((event) => event.type === 'session_scheduled')).toBeTruthy();
    });

    await test.step('Refreshing the same journey route keeps the page accessible and stable', async () => {
      await page.reload();
      await journeyPage.expectLoaded(primaryMatch.id);
      await journeyPage.expectTimelineVisible();
      await journeyPage.expectEventVisible('Mentorship began');
      await journeyPage.expectEventVisible('Session scheduled');
    });

    await test.step('Manual milestone creation enforces empty-content boundary and allows profile sharing', async () => {
      await journeyPage.openAddEntryDialog();
      await journeyPage.expectAddEntryDisabled();

      const maxLengthContent = 'x'.repeat(2000);
      await journeyPage.fillAddEntryContent(maxLengthContent);
      await journeyPage.expectAddEntryCharacterCount(2000);
      await journeyPage.fillAddEntryContent(`${maxLengthContent}overflow`);
      await journeyPage.expectAddEntryContentLength(2000);
      await journeyPage.expectAddEntryCharacterCount(2000);

      await journeyPage.fillAddEntryContent(firstEntryText);
      await journeyPage.selectAddEntryType('Progress');
      await journeyPage.toggleShareToProfile();
      await journeyPage.addEntry();

      await journeyPage.expectEventVisible(firstEntryText);
      await journeyPage.expectEditDeleteControlsForEvent(firstEntryText);

      const journey = await api.fetchJourney(menteeAuth, primaryMatch.id);
      const manualEntry = journey.results.find((event) => event.content === firstEntryText);
      expect(manualEntry).toBeTruthy();
      expect(manualEntry?.category).toBe('MCTE');
      expect(manualEntry?.author?.username).toBe(menteeSeed.username);
      expect(manualEntry?.show_on_profile).toBeTruthy();
      expect(manualEntry?.is_editable).toBeTruthy();
    });

    await test.step('Shared manual milestone appears on the author profile', async () => {
      await profilePage.goto(menteeSeed.username);
      await profilePage.expectBasicLoaded(menteeSeed.username, menteeSeed.displayName);
      await profilePage.expectPostVisible(firstEntryText);
      await profilePage.expectMentorshipJourneyOrigin(firstEntryText, mentorSeed.username);
    });

    await test.step('Author can edit the milestone, while empty edits stay blocked', async () => {
      await page.goto(`/connections/${primaryMatch.id}`);
      await journeyPage.expectLoaded(primaryMatch.id);
      await journeyPage.openEditEntry(firstEntryText);
      await journeyPage.fillEditContent(editedEntryText);
      await journeyPage.saveEditedEntry();

      await journeyPage.expectEventVisible(editedEntryText);
      await journeyPage.expectEventHidden(firstEntryText);

      await journeyPage.openEditEntry(editedEntryText);
      await journeyPage.clearEditContent();
      await journeyPage.expectSaveChangesDisabled();
      await page.keyboard.press('Escape');
    });

    await test.step('Delete cancel keeps the milestone, and delete confirm removes it from journey and profile', async () => {
      await journeyPage.openDeleteEntry(editedEntryText);
      await journeyPage.cancelDeleteEntry();
      await journeyPage.expectEventVisible(editedEntryText);

      await journeyPage.openDeleteEntry(editedEntryText);
      await journeyPage.confirmDeleteEntry();
      await journeyPage.expectEventHidden(editedEntryText);

      await profilePage.goto(menteeSeed.username);
      await profilePage.expectBasicLoaded(menteeSeed.username, menteeSeed.displayName);
      await profilePage.expectPostHidden(editedEntryText);
    });

    await test.step('The other participant can see the journey but not edit the first user’s manual entry or AGTE system entries', async () => {
      const mentorPage = await browser.newPage();
      const mentorJourneyPage = new JourneyPage(mentorPage);

      const visibleSharedEntry = `Shared but not owner-editable entry ${runId}.`;
      await api.loginInBrowser(page, menteeAuth);
      await page.goto(`/connections/${primaryMatch.id}`);
      await journeyPage.openAddEntryDialog();
      await journeyPage.fillAddEntryContent(visibleSharedEntry);
      await journeyPage.selectAddEntryType('Achievement');
      await journeyPage.addEntry();

      await api.loginInBrowser(mentorPage, mentorAuth);
      await mentorPage.goto(`/connections/${primaryMatch.id}`);
      await mentorJourneyPage.expectLoaded(primaryMatch.id);
      await mentorJourneyPage.expectEventVisible(visibleSharedEntry);
      await mentorJourneyPage.expectNoEditDeleteControlsForEvent(visibleSharedEntry);
      await mentorJourneyPage.expectNoEditDeleteControlsForEvent('Mentorship began');

      await mentorPage.close();
    });

    await test.step('An unrelated authenticated user cannot access the same journey directly', async () => {
      const outsiderPage = await browser.newPage();
      const outsiderJourneyPage = new JourneyPage(outsiderPage);

      await api.loginInBrowser(outsiderPage, outsiderAuth);
      await outsiderPage.goto(`/connections/${primaryMatch.id}`);
      await outsiderJourneyPage.expectErrorState();

      const forbidden = await api.tryFetchJourney(outsiderAuth, primaryMatch.id);
      expect(forbidden.status()).toBe(403);

      await outsiderPage.close();
    });

    await test.step('A separate match with no timeline records shows the empty state', async () => {
      await api.loginInBrowser(page, secondMenteeAuth);
      await page.goto(`/connections/${emptyStateMatch.id}`);
      await journeyPage.expectLoaded(emptyStateMatch.id);
      await journeyPage.expectEmptyState();

      const emptyJourney = await api.fetchJourney(secondMenteeAuth, emptyStateMatch.id);
      expect(emptyJourney.count).toBe(0);
      expect(emptyJourney.results).toHaveLength(0);
    });
  });
});
