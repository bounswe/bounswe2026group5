import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const API_BASE_URL = 'http://localhost:8000/api';
const PASSWORD = 'E2ePass123!';
const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../../..');

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    app_usage_mode: 'MENTEE' | 'MENTOR';
  };
};

export type UserSeed = {
  email: string;
  username: string;
  displayName: string;
  title: string;
  bio: string;
  skills: string[];
};

export type PublicMentorProfile = {
  username: string;
  full_name: string;
  bio: string;
  skills: string[];
  rating?: number;
  average_rating?: string | number;
  total_mentee_count: number;
};

export type AvailabilitySlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'PENDING' | 'BOOKED';
};

export type MeetingSession = {
  session_id: string;
  mentor: { username: string; display_name: string };
  mentee: { username: string; display_name: string };
  source_slot_id: string | null;
  scheduled_start_at: string;
  scheduled_end_at: string;
  display_status: 'SCHEDULED' | 'RESCHEDULED' | 'CANCELED' | 'COMPLETED';
  allowed_actions: string[];
};

export type MentorshipRequest = {
  id: string;
  mentor: { username: string; display_name: string };
  mentee: { username: string; display_name: string };
  slot_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  cover_letter: string;
};

export type Match = {
  id: string;
  mentor: { username: string; display_name: string };
  mentee: { username: string; display_name: string };
  is_active: boolean;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  resource_id: string | null;
  is_read?: boolean;
};

export type ConversationSummary = {
  id: string;
  match_id: string;
  mentor: {
    id: string;
    username: string;
    display_name: string;
    picture_url: string | null;
    title: string | null;
  };
  mentee: {
    id: string;
    username: string;
    display_name: string;
    picture_url: string | null;
    title: string | null;
  };
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type MessageItem = {
  id: string;
  conversation_id: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    picture_url: string | null;
    title: string | null;
  };
  body: string;
  attachment_url: string | null;
  created_at: string;
  read_receipts?: Record<string, string>;
  status_for_me?: 'sent' | 'delivered' | 'read';
};

export type Feedback = {
  id: string;
  match: string;
  submitted_by: {
    id: string;
    username: string;
    display_name: string;
  };
  rating: number;
  text: string;
  created_at: string;
};

export type MentorRating = {
  username: string;
  average_rating: string;
  review_count: number;
};

export type PublicReview = {
  rating: number;
  text: string;
  created_at: string;
};

export type PublicReviewsResponse = {
  count: number;
  page: number;
  pageSize: number;
  results: PublicReview[];
};

export type CommunityTag = {
  id: string;
  name: string;
  slug: string;
  description: string;
  member_count: number;
  created_at: string;
};

export type CommunityTagDetail = CommunityTag & {
  created_by_username: string | null;
  is_member: boolean;
};

export type CommunityMembershipResponse = {
  tag_id: string;
  tag_name: string;
  tag_slug: string;
  joined: boolean;
};

export type CommunityListResponse = {
  count: number;
  page: number;
  pageSize: number;
  results: CommunityTag[];
};

export type CommunityPost = {
  id: string;
  source_id: string;
  category: 'CoP';
  event_type: 'achievement' | 'social' | 'progress';
  content: string;
  media_url: string | null;
  timestamp: string;
  created_at: string;
  last_edited: string | null;
  show_on_profile: boolean;
  community_id: string;
  community_slug: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    picture_url: string | null;
    title: string;
  };
  tagged_users: { user_id: string; username: string }[];
};

export type CommunityPostFeed = {
  count: number;
  offset: number;
  limit: number;
  results: CommunityPost[];
};

export type ProfilePost = {
  id: string;
  category: 'PrP' | 'MCTE' | 'CoP';
  event_type: 'achievement' | 'social' | 'progress';
  content: string;
  media_url: string | null;
  timestamp: string;
  created_at: string;
  last_edited: string | null;
  show_on_profile: boolean;
  mentorship_partner: string | null;
  community_id: string | null;
  community_name: string | null;
  community_slug: string | null;
  tagged_users: { user_id: string; username: string }[] | null;
  author: {
    id: string;
    username: string;
    display_name: string;
    picture_url: string | null;
    title: string;
  };
};

export type ProfilePostFeed = {
  count: number;
  offset: number;
  limit: number;
  results: ProfilePost[];
};

export type JourneyEvent = {
  id: string;
  source_id: string;
  type: string;
  category: 'AGTE' | 'MCTE';
  timestamp: string;
  created_at: string;
  last_edited: string | null;
  actor_role: string;
  payload: Record<string, unknown> | null;
  content: string;
  media_url: string | null;
  show_on_profile: boolean;
  author: {
    id: string;
    username: string;
    display_name: string;
    picture_url: string | null;
  } | null;
  is_editable: boolean;
};

export type JourneyFeed = {
  ordering: string;
  count: number;
  offset: number;
  limit: number;
  results: JourneyEvent[];
};

export type WorkshopAuthor = {
  id: string;
  username: string;
  display_name: string;
  picture_url: string | null;
  title: string | null;
};

export type WorkshopParticipant = {
  id: string;
  participant: WorkshopAuthor;
  joined_at: string;
  show_on_profile: boolean;
};

export type CommunityWorkshop = {
  id: string;
  community_id: string;
  community_name: string;
  author: WorkshopAuthor;
  title: string;
  description: string;
  scheduled_at: string;
  end_at: string;
  max_participants: number;
  participant_count: number;
  is_full: boolean;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  current_user_enrolled: boolean;
  created_at: string;
  updated_at: string;
};

export type CommunityWorkshopDetail = CommunityWorkshop & {
  participants: WorkshopParticipant[];
};

export type WorkshopListResponse = {
  count: number;
  offset: number;
  limit: number;
  results: CommunityWorkshop[];
};

export class TestDataApi {
  readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async seedUser(seed: UserSeed, appUsageMode: 'MENTEE' | 'MENTOR') {
    const auth = await this.registerOrLogin(seed.email);
    this.markEmailVerified(seed.email);
    await this.setUsageMode(auth.access_token, appUsageMode);
    await this.updateProfile(auth.access_token, seed);
    return auth;
  }

  async loginInBrowser(page: Page, auth: AuthResponse) {
    const tokens = {
      accessToken: auth.access_token,
      refreshToken: auth.refresh_token,
      userId: auth.user.id,
    };

    await page.context().addInitScript((storedTokens) => {
      localStorage.setItem('access_token', storedTokens.accessToken);
      localStorage.setItem('refresh_token', storedTokens.refreshToken);
      localStorage.setItem('id', storedTokens.userId);
    }, tokens);
    await page.goto('/dashboard');
  }

  async fetchMentors(query = '') {
    const response = await this.request.get(`${API_BASE_URL}/profiles/${query}`);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<{ results: PublicMentorProfile[] }>;
  }

  async fetchPopularMentors(limit = 6) {
    const response = await this.request.get(`${API_BASE_URL}/profiles/popular/?limit=${limit}`);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<{ results: PublicMentorProfile[] }>;
  }

  async fetchRecentlyAddedMentors(limit = 6) {
    const response = await this.request.get(`${API_BASE_URL}/profiles/recently-added/?limit=${limit}`);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<{ results: PublicMentorProfile[] }>;
  }

  async createAvailabilitySlot(
    mentorAuth: AuthResponse,
    slot: { date: string; startTime: string; endTime: string },
  ) {
    const response = await this.tryCreateAvailabilitySlot(mentorAuth, slot);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<AvailabilitySlot>;
  }

  async tryCreateAvailabilitySlot(
    mentorAuth: AuthResponse,
    slot: { date: string; startTime: string; endTime: string },
  ) {
    return this.request.post(`${API_BASE_URL}/profiles/me/availability-slots/`, {
      headers: this.authHeaders(mentorAuth),
      data: slot,
    });
  }

  async fetchAvailabilitySlots(mentorUsername: string, auth?: AuthResponse) {
    const response = await this.request.get(`${API_BASE_URL}/profiles/${mentorUsername}/availability-slots/`, {
      headers: auth ? this.authHeaders(auth) : undefined,
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<AvailabilitySlot[]>;
  }

  async bookAvailabilitySlot(menteeAuth: AuthResponse, mentorUsername: string, slotId: string) {
    const response = await this.request.post(`${API_BASE_URL}/profiles/${mentorUsername}/availability-slots/${slotId}/book/`, {
      headers: this.authHeaders(menteeAuth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<AvailabilitySlot>;
  }

  async fetchMyRequests(auth: AuthResponse) {
    const response = await this.request.get(`${API_BASE_URL}/mentorship/requests/me/`, {
      headers: this.authHeaders(auth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<MentorshipRequest[]>;
  }

  async sendMentorshipRequest(
    auth: AuthResponse,
    body: { mentor_username: string; slot_id: string; cover_letter: string },
  ) {
    const response = await this.trySendMentorshipRequest(auth, body);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<MentorshipRequest>;
  }

  async trySendMentorshipRequest(
    auth: AuthResponse,
    body: { mentor_username: string; slot_id: string; cover_letter: string },
  ) {
    return this.request.post(`${API_BASE_URL}/mentorship/requests/`, {
      headers: this.authHeaders(auth),
      data: body,
    });
  }

  async respondToRequest(auth: AuthResponse, requestId: string, action: 'accept' | 'reject') {
    const response = await this.tryRespondToRequest(auth, requestId, action);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<MentorshipRequest>;
  }

  async tryRespondToRequest(auth: AuthResponse, requestId: string, action: 'accept' | 'reject') {
    return this.request.post(`${API_BASE_URL}/mentorship/requests/${requestId}/respond/`, {
      headers: this.authHeaders(auth),
      data: { action },
    });
  }

  async fetchMyMatches(auth: AuthResponse) {
    const response = await this.request.get(`${API_BASE_URL}/mentorship/matches/me/`, {
      headers: this.authHeaders(auth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<Match[]>;
  }

  async fetchMySessions(auth: AuthResponse, query = '?role=mentee&status=upcoming') {
    const response = await this.request.get(`${API_BASE_URL}/mentorship/meeting-sessions/me/${query}`, {
      headers: this.authHeaders(auth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<MeetingSession[]>;
  }

  async fetchNotifications(auth: AuthResponse) {
    const response = await this.request.get(`${API_BASE_URL}/notifications/`, {
      headers: this.authHeaders(auth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<Notification[]>;
  }

  async fetchConversations(auth: AuthResponse) {
    const response = await this.request.get(`${API_BASE_URL}/messages/conversations/`, {
      headers: this.authHeaders(auth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<ConversationSummary[]>;
  }

  async sendMessage(auth: AuthResponse, conversationId: string, body: string) {
    const response = await this.request.post(`${API_BASE_URL}/messages/conversations/${conversationId}/`, {
      headers: this.authHeaders(auth),
      data: { body },
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async fetchMessages(auth: AuthResponse, conversationId: string) {
    const response = await this.request.get(`${API_BASE_URL}/messages/conversations/${conversationId}/`, {
      headers: this.authHeaders(auth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<MessageItem[]>;
  }

  async tryFetchMessages(auth: AuthResponse, conversationId: string) {
    return this.request.get(`${API_BASE_URL}/messages/conversations/${conversationId}/`, {
      headers: this.authHeaders(auth),
    });
  }

  async reportMessage(auth: AuthResponse, messageId: string, data: { reason: string; description?: string }) {
    const response = await this.request.post(`${API_BASE_URL}/messages/${messageId}/report/`, {
      headers: this.authHeaders(auth),
      data,
    });
    return response;
  }

  async fetchMatchFeedback(auth: AuthResponse, matchId: string) {
    const response = await this.request.get(`${API_BASE_URL}/mentorship/matches/${matchId}/feedback/`, {
      headers: this.authHeaders(auth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<Feedback[]>;
  }

  async submitMatchFeedback(
    auth: AuthResponse,
    matchId: string,
    data: { rating: number; text?: string },
  ) {
    const response = await this.trySubmitMatchFeedback(auth, matchId, data);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<Feedback>;
  }

  async trySubmitMatchFeedback(
    auth: AuthResponse,
    matchId: string,
    data: { rating: number; text?: string },
  ) {
    return this.request.post(`${API_BASE_URL}/mentorship/matches/${matchId}/feedback/`, {
      headers: this.authHeaders(auth),
      data,
    });
  }

  async tryFetchMatchFeedback(auth: AuthResponse, matchId: string) {
    return this.request.get(`${API_BASE_URL}/mentorship/matches/${matchId}/feedback/`, {
      headers: this.authHeaders(auth),
    });
  }

  async fetchMentorRating(mentorUsername: string) {
    const response = await this.request.get(`${API_BASE_URL}/profiles/${mentorUsername}/rating/`);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<MentorRating>;
  }

  async fetchMentorReviews(mentorUsername: string, page = 1, pageSize = 10) {
    const response = await this.request.get(
      `${API_BASE_URL}/profiles/${mentorUsername}/reviews/?page=${page}&pageSize=${pageSize}`,
    );
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<PublicReviewsResponse>;
  }

  async fetchCommunities(query = '', page = 1, pageSize = 50) {
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (query) {
      searchParams.set('q', query);
    }

    const response = await this.request.get(`${API_BASE_URL}/profiles/tags/?${searchParams.toString()}`);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<CommunityListResponse>;
  }

  async fetchCommunityDetail(communityIdOrSlug: string, auth?: AuthResponse) {
    const response = await this.request.get(`${API_BASE_URL}/profiles/tags/${communityIdOrSlug}/`, {
      headers: auth ? this.authHeaders(auth) : undefined,
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<CommunityTagDetail>;
  }

  async createCommunity(
    auth: AuthResponse,
    payload: { name: string; description?: string },
  ) {
    const response = await this.tryCreateCommunity(auth, payload);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<CommunityTagDetail>;
  }

  async tryCreateCommunity(
    auth: AuthResponse,
    payload: { name: string; description?: string },
  ) {
    return this.request.post(`${API_BASE_URL}/profiles/tags/`, {
      headers: {
        ...this.authHeaders(auth),
        'Content-Type': 'application/json',
      },
      data: payload,
    });
  }

  async joinCommunity(auth: AuthResponse, communityIdOrSlug: string) {
    const response = await this.tryJoinCommunity(auth, communityIdOrSlug);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<CommunityMembershipResponse>;
  }

  async tryJoinCommunity(auth: AuthResponse, communityIdOrSlug: string) {
    return this.request.post(`${API_BASE_URL}/profiles/tags/${communityIdOrSlug}/join/`, {
      headers: this.authHeaders(auth),
    });
  }

  async leaveCommunity(auth: AuthResponse, communityIdOrSlug: string) {
    const response = await this.tryLeaveCommunity(auth, communityIdOrSlug);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<CommunityMembershipResponse>;
  }

  async tryLeaveCommunity(auth: AuthResponse, communityIdOrSlug: string) {
    return this.request.delete(`${API_BASE_URL}/profiles/tags/${communityIdOrSlug}/leave/`, {
      headers: this.authHeaders(auth),
    });
  }

  async fetchCommunityPosts(auth: AuthResponse, communityIdOrSlug: string, offset = 0, limit = 20) {
    const response = await this.request.get(
      `${API_BASE_URL}/profiles/tags/${communityIdOrSlug}/posts/?offset=${offset}&limit=${limit}`,
      {
        headers: this.authHeaders(auth),
      },
    );
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<CommunityPostFeed>;
  }

  async fetchProfilePosts(auth: AuthResponse, username: string, offset = 0, limit = 20) {
    const response = await this.request.get(
      `${API_BASE_URL}/profiles/${username}/posts/?offset=${offset}&limit=${limit}`,
      {
        headers: this.authHeaders(auth),
      },
    );
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<ProfilePostFeed>;
  }

  async fetchJourney(auth: AuthResponse, matchId: string, offset = 0, limit = 50) {
    const response = await this.request.get(
      `${API_BASE_URL}/mentorship/matches/${matchId}/journey/?offset=${offset}&limit=${limit}`,
      {
        headers: this.authHeaders(auth),
      },
    );
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<JourneyFeed>;
  }

  async tryFetchJourney(auth: AuthResponse, matchId: string, offset = 0, limit = 50) {
    return this.request.get(
      `${API_BASE_URL}/mentorship/matches/${matchId}/journey/?offset=${offset}&limit=${limit}`,
      {
        headers: this.authHeaders(auth),
      },
    );
  }

  clearJourneyEvents(matchId: string) {
    const python = [
      'from timeline.models import TimelineEvent',
      `TimelineEvent.objects.filter(mentorship_id=${JSON.stringify(matchId)}).delete()`,
    ].join('; ');

    execFileSync(
      'docker',
      ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', python],
      { cwd: REPO_ROOT, stdio: 'pipe' },
    );
  }

  async fetchCommunityWorkshops(auth: AuthResponse, communityIdOrSlug: string) {
    const response = await this.request.get(
      `${API_BASE_URL}/profiles/tags/${communityIdOrSlug}/workshops/`,
      {
        headers: this.authHeaders(auth),
      },
    );
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<WorkshopListResponse>;
  }

  async fetchWorkshopDetail(auth: AuthResponse, communityIdOrSlug: string, workshopId: string) {
    const response = await this.request.get(
      `${API_BASE_URL}/profiles/tags/${communityIdOrSlug}/workshops/${workshopId}/`,
      {
        headers: this.authHeaders(auth),
      },
    );
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<CommunityWorkshopDetail>;
  }

  async joinWorkshop(auth: AuthResponse, communityIdOrSlug: string, workshopId: string) {
    const response = await this.tryJoinWorkshop(auth, communityIdOrSlug, workshopId);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<WorkshopParticipant>;
  }

  async tryJoinWorkshop(auth: AuthResponse, communityIdOrSlug: string, workshopId: string) {
    return this.request.post(
      `${API_BASE_URL}/profiles/tags/${communityIdOrSlug}/workshops/${workshopId}/join/`,
      {
        headers: this.authHeaders(auth),
      },
    );
  }

  async leaveWorkshop(auth: AuthResponse, communityIdOrSlug: string, workshopId: string) {
    const response = await this.tryLeaveWorkshop(auth, communityIdOrSlug, workshopId);
    expect(response.ok()).toBeTruthy();
    return response;
  }

  async tryLeaveWorkshop(auth: AuthResponse, communityIdOrSlug: string, workshopId: string) {
    return this.request.post(
      `${API_BASE_URL}/profiles/tags/${communityIdOrSlug}/workshops/${workshopId}/leave/`,
      {
        headers: this.authHeaders(auth),
      },
    );
  }

  private async registerOrLogin(email: string): Promise<AuthResponse> {
    const payload = {
      email,
      password: PASSWORD,
      confirm_password: PASSWORD,
    };

    const register = await this.request.post(`${API_BASE_URL}/auth/register/`, { data: payload });
    if (register.ok()) {
      return register.json();
    }

    const login = await this.request.post(`${API_BASE_URL}/auth/login/`, {
      data: { email, password: PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    return login.json();
  }

  private async patchWithAuth(
    token: string,
    url: string,
    data: Record<string, unknown>,
  ) {
    const response = await this.request.patch(url, {
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
    expect(response.ok()).toBeTruthy();
    return response.json().catch(() => null);
  }

  private async setUsageMode(token: string, appUsageMode: 'MENTEE' | 'MENTOR') {
    await this.patchWithAuth(token, `${API_BASE_URL}/auth/me/role/`, {
      app_usage_mode: appUsageMode,
    });
  }

  private async updateProfile(token: string, profile: UserSeed) {
    await this.patchWithAuth(token, `${API_BASE_URL}/profiles/me/`, {
      username: profile.username,
      display_name: profile.displayName,
      bio: profile.bio,
      title: profile.title,
      show_initials_only: false,
      skills: profile.skills,
    });
  }

  private authHeaders(auth: AuthResponse) {
    return { Authorization: `Bearer ${auth.access_token}` };
  }

  private markEmailVerified(email: string) {
    const python = [
      'from django.contrib.auth import get_user_model',
      'from django.utils import timezone',
      'User = get_user_model()',
      `user = User.objects.get(email=${JSON.stringify(email.toLowerCase())})`,
      'user.is_email_verified = True',
      'user.email_verified_at = timezone.now()',
      "user.save(update_fields=['is_email_verified', 'email_verified_at', 'updated_at'])",
    ].join('; ');

    execFileSync(
      'docker',
      ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', python],
      { cwd: REPO_ROOT, stdio: 'pipe' },
    );
  }
}
