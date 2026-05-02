/**
 * @fileoverview Authentication type definitions.
 * Defines all auth-related types including tokens, user info, and API responses.
 */

/**
 * User profile information returned from auth endpoints.
 */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  picture_url?: string;
  role: string;
  app_usage_mode?: "MENTOR" | "MENTEE" | "";
  auth_provider: string;
  is_active: boolean;
  is_email_verified?: boolean;
  created_at: string;
}

/**
 * Auth tokens returned from login/register endpoints.
 */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/**
 * Complete auth response from backend including user and tokens.
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

/**
 * Auth state stored in the app.
 */
export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

/**
 * Login credentials for authentication.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration credentials for new accounts.
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  confirm_password: string;
}
