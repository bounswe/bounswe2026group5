import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';
import { CommunityDetailPage } from '../pages/CommunityDetailPage';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toLocalDatetimeInput(date: Date, hour: number, minute: number) {
  const local = new Date(date);
  local.setHours(hour, minute, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
}

test.describe('AT-013: Workshops Lifecycle in Communities', () => {
  test('hosts manage workshops and community members join within capacity rules on web', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    const hostCommunityPage = new CommunityDetailPage(page);

    const hostSeed: UserSeed = {
      email: `workshop.host.${runId}@example.com`,
      username: `workshop_host_${runId}`,
      displayName: `Workshop Host ${runId}`,
      title: 'Community Mentor',
      bio: 'Hosts structured group sessions.',
      skills: ['System Design', 'Leadership'],
    };
    const memberOneSeed: UserSeed = {
      email: `workshop.member1.${runId}@example.com`,
      username: `workshop_member1_${runId}`,
      displayName: `Workshop Member One ${runId}`,
      title: 'Participant One',
      bio: 'Joins and leaves workshops.',
      skills: ['React'],
    };
    const memberTwoSeed: UserSeed = {
      email: `workshop.member2.${runId}@example.com`,
      username: `workshop_member2_${runId}`,
      displayName: `Workshop Member Two ${runId}`,
      title: 'Participant Two',
      bio: 'Fills capacity.',
      skills: ['TypeScript'],
    };
    const memberThreeSeed: UserSeed = {
      email: `workshop.member3.${runId}@example.com`,
      username: `workshop_member3_${runId}`,
      displayName: `Workshop Member Three ${runId}`,
      title: 'Participant Three',
      bio: 'Fills capacity.',
      skills: ['Python'],
    };
    const memberFourSeed: UserSeed = {
      email: `workshop.member4.${runId}@example.com`,
      username: `workshop_member4_${runId}`,
      displayName: `Workshop Member Four ${runId}`,
      title: 'Overflow Member',
      bio: 'Used for full-workshop checks.',
      skills: ['Testing'],
    };

    const hostAuth = await api.seedUser(hostSeed, 'MENTOR');
    const memberOneAuth = await api.seedUser(memberOneSeed, 'MENTEE');
    const memberTwoAuth = await api.seedUser(memberTwoSeed, 'MENTEE');
    const memberThreeAuth = await api.seedUser(memberThreeSeed, 'MENTEE');
    const memberFourAuth = await api.seedUser(memberFourSeed, 'MENTEE');

    const community = await api.createCommunity(hostAuth, {
      name: `Workshop Lifecycle ${runId}`,
      description: 'Community used for AT-013 workshop lifecycle coverage.',
    });

    for (const auth of [memberOneAuth, memberTwoAuth, memberThreeAuth, memberFourAuth]) {
      await api.joinCommunity(auth, community.slug);
    }

    const initialTitle = `Workshop Kickoff ${runId}`;
    const updatedTitle = `Workshop Rescheduled ${runId}`;
    const initialDescription = `Workshop description ${runId}`;
    const updatedDescription = `Updated workshop description ${runId}`;
    const startInput = toLocalDatetimeInput(addDays(new Date(), 3), 14, 0);
    const endInput = toLocalDatetimeInput(addDays(new Date(), 3), 15, 30);
    const editedStartInput = toLocalDatetimeInput(addDays(new Date(), 4), 16, 0);
    const editedEndInput = toLocalDatetimeInput(addDays(new Date(), 4), 17, 0);

    await api.loginInBrowser(page, hostAuth);

    await test.step('Host can open workshop creation and invalid workshop states are blocked', async () => {
      await page.goto(`/communities/${community.slug}`);
      await hostCommunityPage.expectLoaded(community.slug, community.name);
      await hostCommunityPage.expectCreateWorkshopVisible();
      await hostCommunityPage.openCreateWorkshopDialog();

      await hostCommunityPage.expectCreateWorkshopSubmitEnabled();
      await hostCommunityPage.submitWorkshopCreate();
      await hostCommunityPage.expectWorkshopDialogOpen('Create Workshop');
      await hostCommunityPage.expectNoWorkshopsEmptyState();

      await hostCommunityPage.fillWorkshopTitle(initialTitle);
      await hostCommunityPage.fillWorkshopStart(startInput);
      await hostCommunityPage.fillWorkshopEnd(startInput);
      await hostCommunityPage.submitWorkshopCreate();
      await hostCommunityPage.expectWorkshopValidationError('End time must be after start time.');

      await hostCommunityPage.fillWorkshopEnd(endInput);
      await hostCommunityPage.fillWorkshopCapacity('0');
      await hostCommunityPage.submitWorkshopCreate();
      await hostCommunityPage.expectWorkshopDialogOpen('Create Workshop');
      await hostCommunityPage.expectNoWorkshopsEmptyState();
    });

    let workshopId = '';

    await test.step('Host can create a valid workshop and the workshop card appears in the community list', async () => {
      await hostCommunityPage.fillWorkshopDescription(initialDescription);
      await hostCommunityPage.fillWorkshopCapacity('4');
      await hostCommunityPage.submitWorkshopCreate();
      await hostCommunityPage.expectWorkshopCreated();
      await hostCommunityPage.expectWorkshopCardSummary(initialTitle, 0, 4, 'Open');

      const workshops = await api.fetchCommunityWorkshops(hostAuth, community.id);
      const createdWorkshop = workshops.results.find((item) => item.title === initialTitle);
      expect(createdWorkshop).toBeTruthy();
      expect(createdWorkshop?.author.username).toBe(hostSeed.username);
      expect(createdWorkshop?.participant_count).toBe(1);
      workshopId = createdWorkshop!.id;
    });

    await test.step('A community member can join, persist joined state after reload, and then leave', async () => {
      const memberOneContext = await browser.newContext();
      const memberOnePage = await memberOneContext.newPage();
      const memberOneCommunityPage = new CommunityDetailPage(memberOnePage);

      await api.loginInBrowser(memberOnePage, memberOneAuth);
      await memberOnePage.goto(`/communities/${community.slug}`);
      await memberOneCommunityPage.expectLoaded(community.slug, community.name);
      await memberOneCommunityPage.openWorkshopDetails(initialTitle);
      await memberOneCommunityPage.expectWorkshopJoinVisible();
      await memberOneCommunityPage.joinWorkshop();
      await memberOneCommunityPage.expectWorkshopParticipantCount(1, 4);
      await memberOneCommunityPage.expectWorkshopLeaveVisible();

      await memberOnePage.reload();
      await memberOneCommunityPage.openWorkshopDetails(initialTitle);
      await memberOneCommunityPage.expectWorkshopParticipantCount(1, 4);
      await memberOneCommunityPage.expectWorkshopLeaveVisible();

      await memberOneCommunityPage.leaveWorkshop();
      await memberOneCommunityPage.expectWorkshopParticipantCount(0, 4);
      await memberOneCommunityPage.expectWorkshopJoinVisible();

      await memberOneContext.close();
    });

    await test.step('Workshop full-state is reflected accurately and an extra member cannot join through the web UI', async () => {
      await api.joinWorkshop(memberOneAuth, community.id, workshopId);
      await api.joinWorkshop(memberTwoAuth, community.id, workshopId);
      await api.joinWorkshop(memberThreeAuth, community.id, workshopId);

      await page.reload();
      await hostCommunityPage.expectLoaded(community.slug, community.name);
      await hostCommunityPage.expectWorkshopCardSummary(initialTitle, 3, 4, 'Full');
      await hostCommunityPage.openWorkshopDetails(initialTitle);
      await hostCommunityPage.expectWorkshopParticipantCount(3, 4);
      await hostCommunityPage.expectWorkshopStatus('Full');
      await hostCommunityPage.expectWorkshopParticipantsVisible(
        hostSeed.displayName,
        memberOneSeed.displayName,
        memberTwoSeed.displayName,
        memberThreeSeed.displayName,
      );
      await hostCommunityPage.closeWorkshopDetails();

      const overflowContext = await browser.newContext();
      const overflowPage = await overflowContext.newPage();
      const overflowCommunityPage = new CommunityDetailPage(overflowPage);

      await api.loginInBrowser(overflowPage, memberFourAuth);
      await overflowPage.goto(`/communities/${community.slug}`);
      await overflowCommunityPage.expectLoaded(community.slug, community.name);
      await overflowCommunityPage.openWorkshopDetails(initialTitle);
      await overflowCommunityPage.expectWorkshopStatus('Full');
      await overflowCommunityPage.expectWorkshopJoinHidden();
      await overflowCommunityPage.expectHostWorkshopActionsHidden();

      const fullJoinAttempt = await api.tryJoinWorkshop(memberFourAuth, community.id, workshopId);
      expect(fullJoinAttempt.status()).toBe(409);

      await overflowContext.close();
    });

    await test.step('Non-host community members do not see host-only workshop controls before cancellation', async () => {
      const memberTwoContext = await browser.newContext();
      const memberTwoPage = await memberTwoContext.newPage();
      const memberTwoCommunityPage = new CommunityDetailPage(memberTwoPage);

      await api.loginInBrowser(memberTwoPage, memberTwoAuth);
      await memberTwoPage.goto(`/communities/${community.slug}`);
      await memberTwoCommunityPage.expectLoaded(community.slug, community.name);
      await memberTwoCommunityPage.openWorkshopDetails(initialTitle);
      await memberTwoCommunityPage.expectHostWorkshopActionsHidden();

      await memberTwoContext.close();
    });

    await test.step('Host can edit a workshop, while invalid edits stay blocked and keep the old data intact', async () => {
      await page.goto(`/communities/${community.slug}`);
      await hostCommunityPage.expectLoaded(community.slug, community.name);
      await hostCommunityPage.openWorkshopDetails(initialTitle);
      await hostCommunityPage.expectHostWorkshopActionsVisible();
      await hostCommunityPage.openWorkshopEditDialog();
      await hostCommunityPage.fillWorkshopTitle(updatedTitle);
      await hostCommunityPage.fillWorkshopDescription(updatedDescription);
      await hostCommunityPage.fillWorkshopStart(editedStartInput);
      await hostCommunityPage.fillWorkshopEnd(editedEndInput);
      await hostCommunityPage.saveWorkshopChanges();
      await hostCommunityPage.expectWorkshopUpdated();
      await hostCommunityPage.closeWorkshopDetails();
      await hostCommunityPage.expectWorkshopCardSummary(updatedTitle, 3, 4, 'Full');

      await hostCommunityPage.openWorkshopDetails(updatedTitle);
      await hostCommunityPage.openWorkshopEditDialog();
      await hostCommunityPage.clearWorkshopTitle();
      await hostCommunityPage.saveWorkshopChanges();
      await hostCommunityPage.expectWorkshopDialogOpen('Edit Workshop');
      await page.keyboard.press('Escape');
      await hostCommunityPage.closeWorkshopDetails();

      const detailAfterInvalidEdit = await api.fetchWorkshopDetail(hostAuth, community.id, workshopId);
      expect(detailAfterInvalidEdit.title).toBe(updatedTitle);
      expect(detailAfterInvalidEdit.description).toBe(updatedDescription);
    });

    await test.step('Host can cancel the cancel-workshop confirmation once, then confirm cancellation and participants see the cancelled state', async () => {
      await page.goto(`/communities/${community.slug}`);
      await hostCommunityPage.expectLoaded(community.slug, community.name);
      await hostCommunityPage.openWorkshopDetails(updatedTitle);
      await hostCommunityPage.startWorkshopCancelFlow();
      await hostCommunityPage.keepWorkshopActive();
      await hostCommunityPage.expectHostWorkshopActionsVisible();

      await hostCommunityPage.startWorkshopCancelFlow();
      await hostCommunityPage.confirmWorkshopCancellation();

      await hostCommunityPage.expectWorkshopCardSummary(updatedTitle, 3, 4, 'Cancelled');

      const cancelledDetail = await api.fetchWorkshopDetail(hostAuth, community.id, workshopId);
      expect(cancelledDetail.status).toBe('CANCELLED');

      const memberFourContext = await browser.newContext();
      const memberFourPage = await memberFourContext.newPage();
      const memberFourCommunityPage = new CommunityDetailPage(memberFourPage);

      await api.loginInBrowser(memberFourPage, memberFourAuth);
      await memberFourPage.goto(`/communities/${community.slug}`);
      await memberFourCommunityPage.expectLoaded(community.slug, community.name);
      await memberFourCommunityPage.openWorkshopDetails(updatedTitle);
      await memberFourCommunityPage.expectWorkshopStatus('Cancelled');
      await memberFourCommunityPage.expectWorkshopJoinHidden();
      await memberFourCommunityPage.expectHostWorkshopActionsHidden();

      await memberFourContext.close();
    });
  });
});
