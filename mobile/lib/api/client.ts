import { API_BASE_URL } from "@/lib/api/config";
import { useAuthStore } from "@/lib/auth/store";

/**
 * Error type thrown when an API request fails.
 */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Perform a typed GET request against the backend API.
 * Uses the access token from auth store.
 *
 * @param path Relative API path (e.g. /api/mentorship/requests/me/)
 */
export async function apiGet<T>(path: string): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
