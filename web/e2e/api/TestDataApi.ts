import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE_URL = 'http://localhost:8000/api';
const PASSWORD = 'E2ePass123!';

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

export class TestDataApi {
  readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async seedUser(seed: UserSeed, appUsageMode: 'MENTEE' | 'MENTOR') {
    const auth = await this.registerOrLogin(seed.email);
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
    return response.json() as Promise<any[]>;
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
    return response.json() as Promise<any[]>;
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
}
