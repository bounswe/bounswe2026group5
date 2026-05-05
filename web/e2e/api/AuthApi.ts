import { APIRequestContext, expect } from '@playwright/test';

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
   * Helper to ban a user as an admin.
   * Note: This assumes 'admin:change-me' is valid and creates a fresh context for admin.
   */
  async banUser(email: string) {
    // 1. Get admin token
    const loginRes = await this.request.post(`${this.baseURL}/api/auth/jwt/create/`, {
      data: {
        email: 'admin',
        password: 'change-me'
      }
    });
    
    // In Django Rest Framework SimpleJWT, it returns { access, refresh }
    const { access } = await loginRes.json();

    // 2. We need to find the user ID to ban them.
    // If the API supports banning by email, we can do that. Assuming it's PUT /api/auth/admin/users/{id}/
    // First, let's get the list of users
    const usersRes = await this.request.get(`${this.baseURL}/api/auth/admin/users/`, {
      headers: { Authorization: `Bearer ${access}` }
    });
    const users = await usersRes.json();
    const targetUser = users.find((u: any) => u.email === email);
    
    if (!targetUser) throw new Error(`User ${email} not found for banning.`);

    // 3. Ban the user
    const banRes = await this.request.put(`${this.baseURL}/api/auth/admin/users/${targetUser.id}/`, {
      headers: { Authorization: `Bearer ${access}` },
      data: { is_banned: true }
    });

    return banRes;
  }
}
