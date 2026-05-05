import { APIRequestContext, Page } from '@playwright/test';

export class AuthApi {
  readonly request: APIRequestContext;
  readonly baseURL: string;
  page?: Page;

  constructor(request: APIRequestContext, baseURL = 'http://localhost:8000') {
    this.request = request;
    this.baseURL = baseURL;
  }

  withPage(page: Page) {
    this.page = page;
    return this;
  }

  private async getHeaders() {
    if (!this.page) return {};
    const token = await this.page.evaluate(() => window.localStorage.getItem('access_token'));
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getMe() {
    return this.request.get(`${this.baseURL}/api/auth/me/`, {
      headers: await this.getHeaders()
    });
  }

  async updateRole(role: 'MENTEE' | 'MENTOR') {
    return this.request.patch(`${this.baseURL}/api/auth/me/role/`, {
      headers: await this.getHeaders(),
      data: { app_usage_mode: role },
    });
  }

  async refreshToken() {
    const refresh = this.page ? await this.page.evaluate(() => window.localStorage.getItem('refresh_token')) : null;
    return this.request.post(`${this.baseURL}/api/auth/token/refresh/`, {
      data: refresh ? { refresh } : undefined
    });
  }

  /**
   * Ban a user by email using an admin account.
   * The admin is seeded in docker-compose startup.
   */
  async banUser(email: string) {
    // 1. Login as admin via the correct endpoint
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';

    const loginRes = await this.request.post(`${this.baseURL}/api/auth/login/`, {
      data: {
        email: adminEmail,
        password: adminPassword
      }
    });

    if (!loginRes.ok()) {
      throw new Error(`Admin login failed: ${loginRes.status()} ${await loginRes.text()}`);
    }

    const loginData = await loginRes.json();
    const adminToken = loginData.access_token;

    // 2. Get the list of users to find the target by email
    const usersRes = await this.request.get(`${this.baseURL}/api/auth/admin/users/`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (!usersRes.ok()) {
      throw new Error(`Failed to list users: ${usersRes.status()}`);
    }

    const usersData = await usersRes.json();
    const users = usersData.results || usersData;
    const targetUser = users.find((u: { email: string }) => u.email === email);

    if (!targetUser) throw new Error(`User ${email} not found for banning.`);

    // 3. Ban the user via PUT (backward compat) or PATCH
    const banRes = await this.request.put(`${this.baseURL}/api/auth/admin/users/${targetUser.id}/`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { is_banned: true }
    });

    return banRes;
  }
}
