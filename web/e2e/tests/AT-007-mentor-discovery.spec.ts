import { expect, test } from '@playwright/test';
import { TestDataApi, type UserSeed } from '../api/TestDataApi';
import { DiscoverPage } from '../pages/DiscoverPage';
import { ProfilePage } from '../pages/ProfilePage';

test.describe('AT-007: Mentor Discovery', () => {
  test('mentee finds mentors by skill, popularity, recency, profile drill-down, and case-insensitive search', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const testDataApi = new TestDataApi(request);
    const discoverPage = new DiscoverPage(page);
    const profilePage = new ProfilePage(page);
    const mentors: UserSeed[] = [
      {
        email: `atlas.python.${runId}@example.com`,
        username: `atlas_python_${runId}`,
        displayName: `Atlas Python ${runId}`,
        title: 'Python Systems Mentor',
        bio: 'Helps students learn Python, backend design, and practical debugging habits.',
        skills: ['Python/Django', 'System Design', 'Testing'],
      },
      {
        email: `bianca.data.${runId}@example.com`,
        username: `bianca_data_${runId}`,
        displayName: `Bianca Data ${runId}`,
        title: 'Data Science Mentor',
        bio: 'Guides learners through Python notebooks, statistics, and model evaluation.',
        skills: ['Python/Django', 'Machine Learning', 'Database Design'],
      },
      {
        email: `cem.frontend.${runId}@example.com`,
        username: `cem_frontend_${runId}`,
        displayName: `Cem Frontend ${runId}`,
        title: 'Frontend Mentor',
        bio: 'Focuses on React, accessibility, interface quality, and TypeScript workflows.',
        skills: ['React', 'TypeScript', 'JavaScript'],
      },
      {
        email: `darya.django.${runId}@example.com`,
        username: `darya_django_${runId}`,
        displayName: `Darya Django ${runId}`,
        title: 'Django Mentor',
        bio: 'Works with students on Django APIs, database modeling, and deployment.',
        skills: ['Python/Django', 'DevOps', 'Database Design'],
      },
      {
        email: `ekin.mobile.${runId}@example.com`,
        username: `ekin_mobile_${runId}`,
        displayName: `Ekin Mobile ${runId}`,
        title: 'Mobile Mentor',
        bio: 'Mentors mobile teams on React Native, release hygiene, and product iteration.',
        skills: ['React Native', 'TypeScript', 'System Design'],
      },
      {
        email: `funda.product.${runId}@example.com`,
        username: `funda_product_${runId}`,
        displayName: `Funda Product ${runId}`,
        title: 'Product Mentor',
        bio: 'Supports students with interview practice, public speaking, and career planning.',
        skills: ['Public Speaking', 'Interview Practice', 'Communication'],
      },
    ];

    await Promise.all(mentors.map((mentor) => testDataApi.seedUser(mentor, 'MENTOR')));
    const mentee = await testDataApi.seedUser(
      {
        email: `mira.mentee.${runId}@example.com`,
        username: `mira_mentee_${runId}`,
        displayName: `Mira Mentee ${runId}`,
        title: 'Computer Science Student',
        bio: 'Looking for mentors who can help with Python, Django, and reliable software delivery.',
        skills: ['Python/Django', 'Testing'],
      },
      'MENTEE',
    );

    await testDataApi.loginInBrowser(page, mentee);

    await test.step('Open mentor discovery and verify the default mentor list', async () => {
      await discoverPage.goto();
      await discoverPage.expectLoaded();
      await discoverPage.expectAnyMentorVisible();
    });

    await test.step('Filter by Python/Django and verify only relevant mentors are shown', async () => {
      await discoverPage.openSkillFilter();
      await discoverPage.selectSkill('Python/Django');
      await discoverPage.expectSelectedSkillCount(1);
      await discoverPage.search(mentors[0].displayName);

      await discoverPage.expectMentorVisible(mentors[0].displayName);
      await discoverPage.search(mentors[2].displayName);
      await discoverPage.expectMentorHidden(mentors[2].displayName);
      await discoverPage.search(mentors[0].displayName);

      const filtered = await testDataApi.fetchMentors('?skill=Python%2FDjango&pageSize=50');
      expect(filtered.results.length).toBeGreaterThanOrEqual(2);
      expect(filtered.results.every((mentor) => mentor.skills.includes('Python/Django'))).toBeTruthy();
    });

    await test.step('Add Machine Learning as a second skill and keep active filter context visible', async () => {
      await discoverPage.selectSkill('Machine Learning');
      await discoverPage.expectSelectedSkillCount(2);
      await discoverPage.expectMentorVisible(mentors[0].displayName);

      const filtered = await testDataApi.fetchMentors('?skill=Python%2FDjango&skill=Machine%20Learning&pageSize=50');
      expect(filtered.results.length).toBeGreaterThanOrEqual(3);
      expect(
        filtered.results.every((mentor) =>
          mentor.skills.some((skill) => ['Python/Django', 'Machine Learning'].includes(skill)),
        ),
      ).toBeTruthy();
    });

    await test.step('Clear selected skill filters and return to the broad mentor list', async () => {
      await discoverPage.search('');
      await discoverPage.clearFilters();
      await discoverPage.expectLoaded();
      await discoverPage.expectAnyMentorVisible();
    });

    await test.step('Verify popular mentor ordering from the Popular Mentors section data source', async () => {
      await discoverPage.expectPopularSectionVisible();

      const popular = await testDataApi.fetchPopularMentors(6);
      expect(popular.results.length).toBeGreaterThanOrEqual(2);

      for (let index = 1; index < popular.results.length; index += 1) {
        const previous = popular.results[index - 1];
        const current = popular.results[index];
        const previousRating = Number(previous.average_rating ?? previous.rating ?? 0);
        const currentRating = Number(current.average_rating ?? current.rating ?? 0);
        expect(previousRating).toBeGreaterThanOrEqual(currentRating);
        if (previousRating === currentRating) {
          expect(previous.total_mentee_count).toBeGreaterThanOrEqual(current.total_mentee_count);
        }
      }
    });

    await test.step('Open a recently joined mentor profile and return to discovery', async () => {
      await discoverPage.expectRecentlyJoinedSectionVisible();

      const recent = await testDataApi.fetchRecentlyAddedMentors(6);
      expect(recent.results.length).toBeGreaterThan(0);

      const topRecent = recent.results[0];
      await discoverPage.openMentorProfile(topRecent.full_name);
      await profilePage.expectLoaded(topRecent.username, topRecent.full_name);

      await profilePage.goBackToDiscover();
      await discoverPage.expectRecentlyJoinedSectionVisible();
    });

    await test.step('Search by skill keyword with different casing', async () => {
      await discoverPage.search('pYtHoN');
      await discoverPage.expectMentorHidden(mentors[5].displayName);

      const search = await testDataApi.fetchMentors('?q=pYtHoN&pageSize=50');
      expect(search.results.length).toBeGreaterThanOrEqual(2);
      expect(
        search.results.every((mentor) =>
          mentor.skills.some((skill) => skill.toLowerCase().includes('python')) ||
          mentor.full_name.toLowerCase().includes('python') ||
          mentor.bio.toLowerCase().includes('python'),
        ),
      ).toBeTruthy();
    });
  });
});
