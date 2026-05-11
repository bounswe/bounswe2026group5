import path from 'node:path';
import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';
import { CommunityDetailPage } from '../pages/CommunityDetailPage';
import { ProfilePage } from '../pages/ProfilePage';

const MEDIA_FILE_PATH = path.resolve(process.cwd(), 'public/icon.png');
const MEDIA_FILE_NAME = 'icon.png';

test.describe('AT-010: Community Posts & Profile Cross-Posting', () => {
  test('community members can publish, share, edit, and delete posts while ownership stays protected', async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(150_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    const communityDetailPage = new CommunityDetailPage(page);
    const profilePage = new ProfilePage(page);

    const authorSeed: UserSeed = {
      email: `cop.author.${runId}@example.com`,
      username: `cop_author_${runId}`,
      displayName: `CoP Author ${runId}`,
      title: 'Community Storyteller',
      bio: 'Shares progress updates and invites others into community learning.',
      skills: ['React', 'Testing'],
    };
    const taggedSeed: UserSeed = {
      email: `cop.tagged.${runId}@example.com`,
      username: `cop_tagged_${runId}`,
      displayName: `CoP Tagged ${runId}`,
      title: 'Helpful Peer',
      bio: 'Participates in communities and is often tagged in collaborative updates.',
      skills: ['React', 'TypeScript'],
    };
    const peerSeed: UserSeed = {
      email: `cop.peer.${runId}@example.com`,
      username: `cop_peer_${runId}`,
      displayName: `CoP Peer ${runId}`,
      title: 'Community Member',
      bio: 'Reads and reacts to community updates without owning every post.',
      skills: ['Testing'],
    };
    const nonMemberSeed: UserSeed = {
      email: `cop.outsider.${runId}@example.com`,
      username: `cop_outsider_${runId}`,
      displayName: `CoP Outsider ${runId}`,
      title: 'Outside Observer',
      bio: 'Can browse a community page but should not gain posting controls without membership.',
      skills: ['System Design'],
    };

    const extraTagSeeds: UserSeed[] = Array.from({ length: 4 }, (_, index) => ({
      email: `cop.extra${index}.${runId}@example.com`,
      username: `cop_extra_${index}_${runId}`,
      displayName: `CoP Extra ${index} ${runId}`,
      title: 'Extra Member',
      bio: 'Added to exercise the max-tag limit in the community post dialog.',
      skills: ['React'],
    }));

    const authorAuth = await api.seedUser(authorSeed, 'MENTOR');
    const taggedAuth = await api.seedUser(taggedSeed, 'MENTEE');
    const peerAuth = await api.seedUser(peerSeed, 'MENTEE');
    const nonMemberAuth = await api.seedUser(nonMemberSeed, 'MENTEE');
    const extraTagAuths = await Promise.all(extraTagSeeds.map((seed) => api.seedUser(seed, 'MENTEE')));

    const community = await api.createCommunity(authorAuth, {
      name: `Community Posting Lab ${runId}`,
      description: 'A community created to exercise post creation, tagging, sharing, and ownership rules.',
    });

    await api.joinCommunity(taggedAuth, community.slug);
    await api.joinCommunity(peerAuth, community.slug);
    await Promise.all(extraTagAuths.map((auth) => api.joinCommunity(auth, community.slug)));

    const firstPostContent = `First shared update for AT-010 run ${runId}.`;
    const editedPostContent = `Edited community update for AT-010 run ${runId}.`;
    const mediaPostContent = `Media-backed community update for AT-010 run ${runId}.`;

    await test.step('Member can open the create-post dialog and the empty-content boundary is enforced', async () => {
      await api.loginInBrowser(page, authorAuth);
      await page.goto(`/communities/${community.slug}`);
      await communityDetailPage.expectLoaded(community.slug, community.name);
      await communityDetailPage.expectNewPostVisible();

      await communityDetailPage.openNewPostDialog();
      await communityDetailPage.expectPublishDisabled();
    });

    await test.step('Content length, tagging, and share-to-profile work for the first post', async () => {
      const maxLengthContent = 'x'.repeat(2000);
      await communityDetailPage.fillPostContent(maxLengthContent);
      await communityDetailPage.expectPostCharacterCount(2000);

      await communityDetailPage.fillPostContent(`${maxLengthContent}overflow`);
      await communityDetailPage.expectPostContentLength(2000);
      await communityDetailPage.expectPostCharacterCount(2000);

      await communityDetailPage.fillPostContent(firstPostContent);
      await communityDetailPage.expectPostCharacterCount(firstPostContent.length);
      await communityDetailPage.selectPostType('Social');

      await communityDetailPage.expectTaggableUserVisible(taggedSeed.username);
      await communityDetailPage.expectTaggableUserVisible(peerSeed.username);
      for (const extraSeed of extraTagSeeds) {
        await communityDetailPage.expectTaggableUserVisible(extraSeed.username);
      }

      await communityDetailPage.selectTaggableUser(taggedSeed.username);
      await communityDetailPage.selectTaggableUser(peerSeed.username);
      await communityDetailPage.selectTaggableUser(extraTagSeeds[0].username);
      await communityDetailPage.selectTaggableUser(extraTagSeeds[1].username);
      await communityDetailPage.selectTaggableUser(extraTagSeeds[2].username);
      await communityDetailPage.expectTaggableUserDisabled(extraTagSeeds[3].username);

      await communityDetailPage.toggleShareToProfile();
      await communityDetailPage.publishPost();

      await communityDetailPage.expectPostVisible(firstPostContent);
      await communityDetailPage.expectPostTag(firstPostContent, taggedSeed.username);

      const feed = await api.fetchCommunityPosts(authorAuth, community.id);
      const firstPost = feed.results.find((post) => post.content === firstPostContent);
      expect(firstPost).toBeTruthy();
      expect(firstPost?.show_on_profile).toBeTruthy();
      expect(firstPost?.tagged_users.map((user) => user.username)).toEqual(
        expect.arrayContaining([
          taggedSeed.username,
          peerSeed.username,
          extraTagSeeds[0].username,
          extraTagSeeds[1].username,
          extraTagSeeds[2].username,
        ]),
      );
      expect(firstPost?.last_edited).toBeNull();
      expect(Number.isNaN(Date.parse(firstPost!.created_at))).toBeFalsy();
    });

    await test.step('Shared community post appears on the author profile', async () => {
      await profilePage.goto(authorSeed.username);
      await profilePage.expectBasicLoaded(authorSeed.username, authorSeed.displayName);
      await profilePage.expectPostVisible(firstPostContent);
      await profilePage.expectCommunityOrigin(firstPostContent, community.name);

      const profileFeed = await api.fetchProfilePosts(authorAuth, authorSeed.username);
      expect(profileFeed.results.some((post) => (
        post.content === firstPostContent
        && post.category === 'CoP'
        && post.community_name === community.name
      ))).toBeTruthy();
    });

    await test.step('Member can create a second post with media attached', async () => {
      await page.goto(`/communities/${community.slug}`);
      await communityDetailPage.openNewPostDialog();
      await communityDetailPage.fillPostContent(mediaPostContent);
      await communityDetailPage.selectPostType('Achievement');
      await communityDetailPage.attachMedia(MEDIA_FILE_PATH, MEDIA_FILE_NAME);
      await communityDetailPage.publishPost();

      await communityDetailPage.expectPostVisible(mediaPostContent);

      const feed = await api.fetchCommunityPosts(authorAuth, community.id);
      const mediaPost = feed.results.find((post) => post.content === mediaPostContent);
      expect(mediaPost).toBeTruthy();
      expect(mediaPost?.media_url).toBeTruthy();
      expect(mediaPost?.media_url).toMatch(/post_media\//);
    });

    await test.step('Non-members can open the community but cannot create posts', async () => {
      const outsiderPage = await browser.newPage();
      const outsiderCommunityPage = new CommunityDetailPage(outsiderPage);

      await api.loginInBrowser(outsiderPage, nonMemberAuth);
      await outsiderPage.goto(`/communities/${community.slug}`);
      await outsiderCommunityPage.expectLoaded(community.slug, community.name);
      await outsiderCommunityPage.expectNewPostHidden();

      await outsiderPage.close();
    });

    await test.step('Author can edit their own post, while invalid empty edits stay blocked', async () => {
      await communityDetailPage.expectOwnPostActions(firstPostContent);
      await communityDetailPage.openEditPost(firstPostContent);
      await communityDetailPage.clearEditContent();
      await communityDetailPage.expectSaveChangesDisabled();
      await communityDetailPage.updateEditContent(editedPostContent);
      await communityDetailPage.saveEditedPost();

      await communityDetailPage.expectPostVisible(editedPostContent);
      await communityDetailPage.expectPostHidden(firstPostContent);

      const feed = await api.fetchCommunityPosts(authorAuth, community.id);
      const editedPost = feed.results.find((post) => post.content === editedPostContent);
      expect(editedPost).toBeTruthy();
      expect(editedPost?.last_edited).toBeTruthy();
      expect(Number.isNaN(Date.parse(editedPost!.last_edited!))).toBeFalsy();
    });

    await test.step('Edited shared content is reflected on the profile and non-owners see no edit controls', async () => {
      await profilePage.goto(authorSeed.username);
      await profilePage.expectBasicLoaded(authorSeed.username, authorSeed.displayName);
      await profilePage.expectPostVisible(editedPostContent);
      await profilePage.expectCommunityOrigin(editedPostContent, community.name);

      const peerPage = await browser.newPage();
      const peerCommunityPage = new CommunityDetailPage(peerPage);

      await api.loginInBrowser(peerPage, peerAuth);
      await peerPage.goto(`/communities/${community.slug}`);
      await peerCommunityPage.expectLoaded(community.slug, community.name);
      await peerCommunityPage.expectPostVisible(editedPostContent);
      await peerCommunityPage.expectNoPostActions(editedPostContent);

      await peerPage.close();
    });

    await test.step('Delete cancel keeps the post, and delete confirm removes it from both community and profile views', async () => {
      await page.goto(`/communities/${community.slug}`);
      await communityDetailPage.openDeletePost(editedPostContent);
      await communityDetailPage.cancelDeletePost();
      await communityDetailPage.expectPostVisible(editedPostContent);

      await communityDetailPage.openDeletePost(editedPostContent);
      await communityDetailPage.confirmDeletePost();
      await communityDetailPage.expectPostHidden(editedPostContent);

      await profilePage.goto(authorSeed.username);
      await profilePage.expectBasicLoaded(authorSeed.username, authorSeed.displayName);
      await profilePage.expectPostHidden(editedPostContent);

      const communityFeed = await api.fetchCommunityPosts(authorAuth, community.id);
      expect(communityFeed.results.some((post) => post.content === editedPostContent)).toBeFalsy();

      const profileFeed = await api.fetchProfilePosts(authorAuth, authorSeed.username);
      expect(profileFeed.results.some((post) => post.content === editedPostContent)).toBeFalsy();
    });
  });
});
