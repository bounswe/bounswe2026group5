import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE_URL = 'http://localhost:8000/api';
const PASSWORD = 'RequestsPass123!';

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

export type AvailabilitySlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'PENDING' | 'BOOKED';
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
  type: 'mentorship_request_rejected' | 'new_match' | string;
  title: string;
  message: string;
  resource_id: string | null;
};

export class TestDataApi {
  readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async seedUser(seed: UserSeed, appUsageMode: 'MENTEE' | 'MENTOR') {
    const auth = await this.registerOrLogin(seed.email);
    await this.patchWithAuth(auth.access_token, `${API_BASE_URL}/auth/me/role/`, {
      app_usage_mode: appUsageMode,
    });
    await this.patchWithAuth(auth.access_token, `${API_BASE_URL}/profiles/me/`, {
      username: seed.username,
      display_name: seed.displayName,
      bio: seed.bio,
      title: seed.title,
      is_visible: true,
      show_initials_only: false,
      skills: seed.skills,
    });
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

  async createAvailabilitySlot(
    mentorAuth: AuthResponse,
    slot: { date: string; startTime: string; endTime: string },
  ) {
    const response = await this.request.post(`${API_BASE_URL}/profiles/me/availability-slots/`, {
      headers: this.authHeaders(mentorAuth),
      data: slot,
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<AvailabilitySlot>;
  }

  async fetchAvailabilitySlots(mentorUsername: string, auth: AuthResponse) {
    const response = await this.request.get(`${API_BASE_URL}/profiles/${mentorUsername}/availability-slots/`, {
      headers: this.authHeaders(auth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<AvailabilitySlot[]>;
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
    return this.request.post(`${API_BASE_URL}/mentorship/requests/`, {
      headers: this.authHeaders(auth),
      data: body,
    });
  }

  async respondToRequest(auth: AuthResponse, requestId: string, action: 'accept' | 'reject') {
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

  async fetchNotifications(auth: AuthResponse) {
    const response = await this.request.get(`${API_BASE_URL}/notifications/`, {
      headers: this.authHeaders(auth),
    });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<Notification[]>;
  }

  private async registerOrLogin(email: string): Promise<AuthResponse> {
    const payload = { email, password: PASSWORD, confirm_password: PASSWORD };
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

  private async patchWithAuth(token: string, url: string, data: Record<string, unknown>) {
    const response = await this.request.patch(url, {
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
    expect(response.ok()).toBeTruthy();
  }

  private authHeaders(auth: AuthResponse) {
    return { Authorization: `Bearer ${auth.access_token}` };
  }
}
