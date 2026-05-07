import { expect, test, type APIResponse } from '@playwright/test';
import { TestDataApi, type AuthResponse, type UserSeed } from '../api/TestDataApi';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';

const REVIEW_THRESHOLD = Math.max(1, Number(process.env.RATING_UPDATE_THRESHOLD ?? 5));
const REVIEW_SAMPLES = [
  { label: 'batch_a', rating: 5, text: 'Excellent guidance on practical backend tradeoffs.' },
  { label: 'batch_b', rating: 4, text: 'Helpful examples and steady pacing.' },
  { label: 'batch_c', rating: 5, text: 'Strong explanations and actionable next steps.' },
  { label: 'batch_d', rating: 4, text: 'Useful session with concrete testing advice.' },
  { label: 'batch_e', rating: 5, text: 'Focused review with clear improvement suggestions.' },
  { label: 'batch_f', rating: 4, text: 'Good structure and practical follow-up material.' },
];

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00:00`;
}

function makeMentee(runId: number, label: string): UserSeed {
  return {
    email: `rating.${label}.${runId}@example.com`,
    username: `rating_${label}_${runId}`,
    displayName: `Rating ${label} ${runId}`,
    title: 'Computer Science Mentee',
    bio: 'Learning through structured mentorship sessions and mentor feedback.',
    skills: ['Python/Django', 'Testing'],
  };
}

async function expectForbidden(response: APIResponse) {
  expect(response.status()).toBe(403);
}

test.describe('AT-008: Feedback & Reviews', () => {
  test('mentee rates an accepted mentor, feedback is protected, and public ratings update at threshold', async ({
    page,
    request,
  }) => {
    test.setTimeout(150_000);

    const runId = Date.now();
    const api = new TestDataApi(request);
    const mentor: UserSeed = {
      email: `rating.mentor.${runId}@example.com`,
      username: `rating_mentor_${runId}`,
      displayName: `Rating Mentor ${runId}`,
      title: 'Python Mentorship Lead',
      bio: 'Helps mentees improve backend systems through clear examples and practical review.',
      skills: ['Python/Django', 'System Design', 'Testing'],
    };
    const primaryMentee = makeMentee(runId, 'primary');
    const unrelatedMentee = makeMentee(runId, 'unrelated');
    const visibleReviewText = 'Clear explanations and useful examples.';
    const thresholdReviews = REVIEW_SAMPLES.slice(0, REVIEW_THRESHOLD - 1);
    const thresholdRatings = [4, ...thresholdReviews.map((review) => review.rating)];
    const expectedPublicAverage = (
      thresholdRatings.reduce((total, rating) => total + rating, 0) / thresholdRatings.length
    ).toFixed(2);
    const expectedProfileAverage = Number(expectedPublicAverage).toFixed(1);

    const mentorAuth = await api.seedUser(mentor, 'MENTOR');
    const primaryMenteeAuth = await api.seedUser(primaryMentee, 'MENTEE');
    const unrelatedMenteeAuth = await api.seedUser(unrelatedMentee, 'MENTEE');

    let slotOffset = 1;
    async function createAcceptedMatch(menteeAuth: AuthResponse, mentee: UserSeed) {
      const slotDate = toDateString(new Date(Date.now() + slotOffset * 24 * 60 * 60 * 1000));
      const slot = await api.createAvailabilitySlot(mentorAuth, {
        date: slotDate,
        startTime: hourLabel(9 + (slotOffset % 7)),
        endTime: hourLabel(10 + (slotOffset % 7)),
      });
      slotOffset += 1;

      const mentorshipRequest = await api.sendMentorshipRequest(menteeAuth, {
        mentor_username: mentor.username,
        slot_id: slot.id,
        cover_letter: `I would like to review Python mentorship goals for ${mentee.displayName}.`,
      });
      await api.respondToRequest(mentorAuth, mentorshipRequest.id, 'accept');

      const matches = await api.fetchMyMatches(menteeAuth);
      const match = matches.find((item) => (
        item.mentor.username === mentor.username
        && item.mentee.username === mentee.username
        && item.is_active
      ));
      expect(match).toBeTruthy();
      return match!;
    }

    const primaryMatch = await createAcceptedMatch(primaryMenteeAuth, primaryMentee);

    await test.step('Public rating and public reviews are empty before feedback is submitted', async () => {
      const rating = await api.fetchMentorRating(mentor.username);
      expect(rating.review_count).toBe(0);
      expect(rating.average_rating).toBe('0.00');

      const reviews = await api.fetchMentorReviews(mentor.username);
      expect(reviews.count).toBe(0);
      expect(reviews.results).toHaveLength(0);
    });

    await test.step('Mentee submits mentor rating from the Dashboard', async () => {
      const dashboardPage = new DashboardPage(page);

      await api.loginInBrowser(page, primaryMenteeAuth);
      await dashboardPage.expectRateMentorCard(mentor.displayName);
      await dashboardPage.openRatingModal(mentor.displayName);
      await dashboardPage.expectRatingSubmitDisabled();
      await dashboardPage.selectRating(4, 'Very good');
      await dashboardPage.submitRating(visibleReviewText);
      await dashboardPage.expectMentorNotPendingRating(mentor.displayName);

      const feedback = await api.fetchMatchFeedback(primaryMenteeAuth, primaryMatch.id);
      expect(feedback).toHaveLength(1);
      expect(feedback[0]).toMatchObject({
        match: primaryMatch.id,
        rating: 4,
        text: visibleReviewText,
      });
      expect(feedback[0].submitted_by.username).toBe(primaryMentee.username);
      expect(Number.isNaN(Date.parse(feedback[0].created_at))).toBeFalsy();
    });

    await test.step('Duplicate feedback, invalid ratings, and unrelated access are rejected', async () => {
      const duplicate = await api.trySubmitMatchFeedback(primaryMenteeAuth, primaryMatch.id, {
        rating: 5,
        text: 'Trying to submit a duplicate review.',
      });
      expect(duplicate.status()).toBe(400);
      await expect(duplicate.json()).resolves.toMatchObject({
        detail: 'You have already submitted feedback for this match.',
      });

      await expectForbidden(await api.tryFetchMatchFeedback(unrelatedMenteeAuth, primaryMatch.id));
      await expectForbidden(await api.trySubmitMatchFeedback(unrelatedMenteeAuth, primaryMatch.id, {
        rating: 5,
        text: 'Trying to rate a mentor through someone else\'s match.',
      }));

      const lowerBoundMentee = makeMentee(runId, 'lower_bound');
      const upperBoundMentee = makeMentee(runId, 'upper_bound');
      const lowerBoundAuth = await api.seedUser(lowerBoundMentee, 'MENTEE');
      const upperBoundAuth = await api.seedUser(upperBoundMentee, 'MENTEE');
      const lowerBoundMatch = await createAcceptedMatch(lowerBoundAuth, lowerBoundMentee);
      const upperBoundMatch = await createAcceptedMatch(upperBoundAuth, upperBoundMentee);

      const tooLow = await api.trySubmitMatchFeedback(lowerBoundAuth, lowerBoundMatch.id, {
        rating: 0,
        text: 'Invalid low rating.',
      });
      expect(tooLow.status()).toBe(400);

      const tooHigh = await api.trySubmitMatchFeedback(upperBoundAuth, upperBoundMatch.id, {
        rating: 6,
        text: 'Invalid high rating.',
      });
      expect(tooHigh.status()).toBe(400);
    });

    await test.step('Mentor receives a feedback notification', async () => {
      const notifications = await api.fetchNotifications(mentorAuth);
      expect(notifications.some((item) => (
        item.type === 'new_feedback_available'
        && item.title === 'New Feedback Available'
        && item.message === 'You received new feedback.'
      ))).toBeTruthy();
    });

    await test.step('Public rating and reviews update when the threshold batch is completed', async () => {
      for (const review of thresholdReviews) {
        const mentee = makeMentee(runId, review.label);
        const menteeAuth = await api.seedUser(mentee, 'MENTEE');
        const match = await createAcceptedMatch(menteeAuth, mentee);
        const feedback = await api.submitMatchFeedback(menteeAuth, match.id, {
          rating: review.rating,
          text: review.text,
        });
        expect(feedback.rating).toBe(review.rating);
        expect(feedback.text).toBe(review.text);
        expect(Number.isNaN(Date.parse(feedback.created_at))).toBeFalsy();
      }

      const rating = await api.fetchMentorRating(mentor.username);
      expect(rating.review_count).toBe(REVIEW_THRESHOLD);
      expect(rating.average_rating).toBe(expectedPublicAverage);

      const reviews = await api.fetchMentorReviews(mentor.username);
      expect(reviews.count).toBe(REVIEW_THRESHOLD);
      expect(reviews.results.map((review) => review.text)).toEqual(
        expect.arrayContaining([visibleReviewText, ...thresholdReviews.map((review) => review.text)]),
      );
      expect(reviews.results[0]).not.toHaveProperty('submitted_by');

      const profilePage = new ProfilePage(page);
      await profilePage.goto(mentor.username);
      await profilePage.expectLoaded(mentor.username, mentor.displayName);
      await profilePage.expectAverageRating(expectedProfileAverage);
      await profilePage.expectPublicReview(visibleReviewText);
    });

    if (REVIEW_THRESHOLD > 1) {
      await test.step('A partial batch after the threshold is not publicly visible yet', async () => {
        const extraReviewText = 'This extra review should wait for the next public batch.';
        const extraMentee = makeMentee(runId, 'extra_hidden');
        const extraMenteeAuth = await api.seedUser(extraMentee, 'MENTEE');
        const extraMatch = await createAcceptedMatch(extraMenteeAuth, extraMentee);

        await api.submitMatchFeedback(extraMenteeAuth, extraMatch.id, {
          rating: 5,
          text: extraReviewText,
        });

        const rating = await api.fetchMentorRating(mentor.username);
        expect(rating.review_count).toBe(REVIEW_THRESHOLD + 1);
        expect(rating.average_rating).toBe(expectedPublicAverage);

        const reviews = await api.fetchMentorReviews(mentor.username);
        expect(reviews.count).toBe(REVIEW_THRESHOLD);
        expect(reviews.results.map((review) => review.text)).not.toContain(extraReviewText);
      });
    }
  });
});
