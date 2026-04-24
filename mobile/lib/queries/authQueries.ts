import { ApiValidationError } from "../api/client";
import { API_BASE_URL } from "../api/config";
import { fetchWithTimeout } from "../api/fetchWithTimeout";

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
      body?.username?.[0] ??
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

async function readErrorBody(res: Response): Promise<any> {
  try {
    const readableResponse =
      typeof res.clone === "function" ? res.clone() : res;
    return await readableResponse.json();
  } catch {
    return null;
  }
}

async function extractFieldErrors(
  res: Response,
): Promise<Record<string, string>> {
  const body = await readErrorBody(res);
  return {
    ...(body?.email?.[0] ? { email: body.email[0] } : {}),
    ...(body?.username?.[0] ? { username: body.username[0] } : {}),
    ...(body?.password?.[0] ? { password: body.password[0] } : {}),
    ...(body?.confirm_password?.[0]
      ? { confirm_password: body.confirm_password[0] }
      : {}),
    ...(body?.app_usage_mode?.[0]
      ? { app_usage_mode: body.app_usage_mode[0] }
      : {}),
    ...(body?.display_name?.[0]
      ? { display_name: body.display_name[0] }
      : {}),
    ...(body?.non_field_errors?.[0]
      ? { non_field_errors: body.non_field_errors[0] }
      : {}),
  };
}

// ── Mutation functions ────────────────────────────────────────────────────────

export async function registerFn(credentials: {
  email: string;
  password: string;
  confirm_password: string;
}): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/register/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 400 && typeof body === "object") {
      const fieldErrors: Record<string, string> = {};
      for (const [key, value] of Object.entries(body)) {
        if (Array.isArray(value) && typeof value[0] === "string") {
          fieldErrors[key] = value[0];
        } else if (typeof value === "string") {
          fieldErrors[key] = value;
        }
      }
      const message = fieldErrors.detail || fieldErrors.non_field_errors || "Registration failed.";
      throw new ApiValidationError(res.status, message, fieldErrors);
    }
    const message = body.detail || body.non_field_errors?.[0] || "Registration failed.";
    throw new Error(message);
  }

  return res.json() as Promise<AuthResponse>;
}

export async function fetchSkillsFn(): Promise<Skill[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/profiles/skills/`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch skills.");
  return res.json() as Promise<Skill[]>;
}

export async function updateUsageModeFn(params: {
  app_usage_mode: "MENTOR" | "MENTEE";
  accessToken: string;
}): Promise<User> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me/role/`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({ app_usage_mode: params.app_usage_mode }),
  });

  if (!res.ok) {
    const fieldErrors = await extractFieldErrors(res);
    const message = await extractErrorMessage(res, "Failed to set usage mode.");
    throw new ApiValidationError(res.status, message, fieldErrors);
  }

  return res.json() as Promise<User>;
}

export async function updateProfileFn(params: {
  accessToken: string;
  display_name: string;
  bio?: string;
  skills?: string[];
}): Promise<unknown> {
  const { accessToken, ...payload } = params;

  const res = await fetchWithTimeout(`${API_BASE_URL}/api/profiles/me/`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const fieldErrors = await extractFieldErrors(res);
    const message = await extractErrorMessage(res, "Failed to update profile.");
    throw new ApiValidationError(res.status, message, fieldErrors);
  }

  return res.json();
}

export async function updateUsernameFn(params: {
  accessToken: string;
  username: string;
}): Promise<{ username?: string }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/profiles/me/username/`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({ username: params.username }),
  });

  if (!res.ok) {
    const fieldErrors = await extractFieldErrors(res);
    const message = await extractErrorMessage(res, "Failed to update username.");
    throw new ApiValidationError(res.status, message, fieldErrors);
  }

  return res.json() as Promise<{ username?: string }>;
}
