import { expect, test } from '@playwright/test';
import { CommunityDetailPage } from '../pages/CommunityDetailPage';
import { CommunitiesPage } from '../pages/CommunitiesPage';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';

test.describe('AT-009: Communities Discovery & Membership', () => {
  test('guest discovery, community creation validation, and membership lifecycle work on web', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    const communitiesPage = new CommunitiesPage(page);
    const communityDetailPage = new CommunityDetailPage(page);

    const creatorSeed: UserSeed = {
      email: `community.creator.${runId}@example.com`,
      username: `community_creator_${runId}`,
      displayName: `Community Creator ${runId}`,
      title: 'Community Builder',
      bio: 'Creates communities around collaborative learning and project-driven growth.',
      skills: ['React', 'Testing'],
    };
    const memberSeed: UserSeed = {
      email: `community.member.${runId}@example.com`,
      username: `community_member_${runId}`,
      displayName: `Community Member ${runId}`,
      title: 'Curious Student',
      bio: 'Explores communities to learn from others and join discussion spaces.',
      skills: ['React', 'TypeScript'],
    };

    const creatorAuth = await api.seedUser(creatorSeed, 'MENTOR');
    const memberAuth = await api.seedUser(memberSeed, 'MENTEE');

    const targetCommunity = await api.createCommunity(creatorAuth, {
      name: `Systems Studio ${runId}`,
      description: 'A place to discuss architecture, testing, and thoughtful implementation tradeoffs.',
    });
    const secondCommunity = await api.createCommunity(creatorAuth, {
      name: `Frontend Focus ${runId}`,
      description: 'A community for interface polish, accessibility, and modern frontend craft.',
    });

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    const guestCommunitiesPage = new CommunitiesPage(guestPage);
    const guestCommunityDetailPage = new CommunityDetailPage(guestPage);

    await test.step('Guest can browse, search, and open a community without authentication', async () => {
      await guestCommunitiesPage.goto();
      await guestCommunitiesPage.expectLoaded();

      await guestCommunitiesPage.search(targetCommunity.name);
      await guestCommunitiesPage.expectCommunityCardVisible(targetCommunity.name);
      await guestCommunitiesPage.expectCommunityCardHidden(secondCommunity.name);

      await guestCommunitiesPage.search(`sYsTeMs sTuDiO ${runId}`);
      await guestCommunitiesPage.expectCommunityCardVisible(targetCommunity.name);

      const searchResponse = await api.fetchCommunities(`systems studio ${runId}`);
      expect(searchResponse.results.some((community) => community.slug === targetCommunity.slug)).toBeTruthy();

      const missingSearch = `missing-community-${runId}`;
      await guestCommunitiesPage.search(missingSearch);
      await guestCommunitiesPage.expectEmptyState(missingSearch);

      await guestCommunitiesPage.search(targetCommunity.name);
      await guestCommunitiesPage.openCommunity(targetCommunity.name);
      await guestCommunityDetailPage.expectLoaded(targetCommunity.slug, targetCommunity.name);
      await guestCommunityDetailPage.expectMetadata(
        targetCommunity.description,
        creatorSeed.username,
        targetCommunity.member_count,
      );
      await guestCommunityDetailPage.expectGuestState();
      await guestCommunityDetailPage.expectNonMemberFeedPrompt();
    });

    await test.step('Authenticated user can open the create flow and sees validation boundaries', async () => {
      await api.loginInBrowser(page, memberAuth);
      await communitiesPage.goto();
      await communitiesPage.expectLoaded();
      await communitiesPage.openCreateCommunity();

      await communitiesPage.expectCreateButtonDisabled();

      await communitiesPage.submitCreateFromNameField('ab');
      await communitiesPage.expectCreateDialogOpen();
      await communitiesPage.expectCreateButtonDisabled();

      await communitiesPage.submitCreateFromNameField('123');
      await communitiesPage.expectCreateNameError('Name cannot be only numbers.');
    });

    const createdCommunityName = `Testing Circle ${runId}`;
    const createdCommunityDescription = 'A home for end-to-end test design and healthy QA workflows.';

    await test.step('Authenticated user can create a new community and duplicate names are rejected', async () => {
      await communitiesPage.createCommunity(createdCommunityName, createdCommunityDescription);
      await communitiesPage.expectCreateDialogClosed();
      await communitiesPage.expectCommunityCardVisible(createdCommunityName);

      const createdCommunity = await api.fetchCommunityDetail(`testing-circle-${runId}`, memberAuth);
      expect(createdCommunity.name).toBe(createdCommunityName);
      expect(createdCommunity.description).toBe(createdCommunityDescription);
      expect(createdCommunity.created_by_username).toBe(memberSeed.username);
      expect(createdCommunity.is_member).toBeTruthy();

      await communitiesPage.openCreateCommunity();
      await communitiesPage.createCommunity(createdCommunityName, 'Trying to create a duplicate name.');
      await communitiesPage.expectDuplicateCreateToast();

      const duplicateQuery = await api.fetchCommunities(createdCommunityName);
      const exactMatches = duplicateQuery.results.filter((community) => community.name === createdCommunityName);
      expect(exactMatches).toHaveLength(1);
    });

    await test.step('Member can join a community, retain access after reload, and duplicate join is guarded', async () => {
      await page.goto(`/communities/${targetCommunity.slug}`);
      await communityDetailPage.expectLoaded(targetCommunity.slug, targetCommunity.name);
      await communityDetailPage.expectJoinAvailable();
      await communityDetailPage.expectNonMemberFeedPrompt();

      await communityDetailPage.join();
      await communityDetailPage.expectLeaveAvailable();
      await communityDetailPage.expectMemberCount(targetCommunity.member_count + 1);

      await page.reload();
      await communityDetailPage.expectLoaded(targetCommunity.slug, targetCommunity.name);
      await communityDetailPage.expectLeaveAvailable();
      await communityDetailPage.expectMemberFeedAccess();

      const duplicateJoin = await api.tryJoinCommunity(memberAuth, targetCommunity.slug);
      expect(duplicateJoin.status()).toBe(400);
      await expect(duplicateJoin.json()).resolves.toMatchObject({
        detail: 'You are already a member of this tag.',
      });

      const joinedCommunity = await api.fetchCommunityDetail(targetCommunity.slug, memberAuth);
      expect(joinedCommunity.member_count).toBe(targetCommunity.member_count + 1);
      expect(joinedCommunity.is_member).toBeTruthy();
    });

    await test.step('Member can leave a community, the non-member state persists, and duplicate leave is guarded', async () => {
      await communityDetailPage.leave();
      await communityDetailPage.expectJoinAvailable();
      await communityDetailPage.expectMemberCount(targetCommunity.member_count);
      await communityDetailPage.expectNonMemberFeedPrompt();

      await page.reload();
      await communityDetailPage.expectLoaded(targetCommunity.slug, targetCommunity.name);
      await communityDetailPage.expectJoinAvailable();
      await communityDetailPage.expectNonMemberFeedPrompt();

      const duplicateLeave = await api.tryLeaveCommunity(memberAuth, targetCommunity.slug);
      expect(duplicateLeave.status()).toBe(400);
      await expect(duplicateLeave.json()).resolves.toMatchObject({
        detail: 'You are not a member of this tag.',
      });

      const leftCommunity = await api.fetchCommunityDetail(targetCommunity.slug, memberAuth);
      expect(leftCommunity.member_count).toBe(targetCommunity.member_count);
      expect(leftCommunity.is_member).toBeFalsy();
    });

    await guestContext.close();
  });
});
