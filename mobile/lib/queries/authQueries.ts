import { API_BASE_URL } from "../api/config";

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  auth_provider: string;
  app_usage_mode: "MENTOR" | "MENTEE" | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Skill {
  id: string;
  name: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function extractErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = await res.json();
    return (
      body?.email?.[0] ??
      body?.password?.[0] ??
      body?.confirm_password?.[0] ??
      body?.app_usage_mode?.[0] ??
      body?.display_name?.[0] ??
      body?.non_field_errors?.[0] ??
      body?.detail ??
      fallback
    );
  } catch {
    return fallback;
  }
}

// ── Mutation functions ────────────────────────────────────────────────────────

export async function registerFn(credentials: {
  email: string;
  password: string;
  confirm_password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const message = await extractErrorMessage(res, "Registration failed.");
    throw new Error(message);
  }

  return res.json() as Promise<AuthResponse>;
}

export async function fetchSkillsFn(): Promise<Skill[]> {
  const res = await fetch(`${API_BASE_URL}/api/profiles/skills/`);
  if (!res.ok) throw new Error("Failed to fetch skills.");
  return res.json() as Promise<Skill[]>;
}

export async function updateUsageModeFn(params: {
  app_usage_mode: "MENTOR" | "MENTEE";
  accessToken: string;
}): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me/role/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({ app_usage_mode: params.app_usage_mode }),
  });

  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to set usage mode.");
    throw new Error(message);
  }

  return res.json() as Promise<User>;
}

export async function updateProfileFn(params: {
  accessToken: string;
  display_name: string;
  bio?: string;
  expertises?: string[];
  eager_to_learn?: string[];
}): Promise<unknown> {
  const { accessToken, ...payload } = params;

  const res = await fetch(`${API_BASE_URL}/api/profiles/me/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to update profile.");
    throw new Error(message);
  }

  return res.json();
}
