import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE_URL = 'http://localhost:8000/api';
const PASSWORD = 'DiscoveryPass123!';

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
    await page.goto('/');
    await page.evaluate((tokens) => {
      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
      localStorage.setItem('id', tokens.userId);
    }, {
      accessToken: auth.access_token,
      refreshToken: auth.refresh_token,
      userId: auth.user.id,
    });
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
      is_visible: true,
      show_initials_only: false,
      skills: profile.skills,
    });
  }
}
