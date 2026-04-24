import { API_BASE_URL } from "@/lib/api/config";
import { useAuthStore } from "@/lib/auth/store";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

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
 * Error type thrown when an API request fails with field-specific validation errors (400 Bad Request).
 */
export class ApiValidationError extends ApiError {
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string>) {
    super(status, message);
    this.fieldErrors = fieldErrors;
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

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
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

/**
 * Perform a typed POST request against the backend API.
 * Uses the access token from auth store.
 *
 * @param path Relative API path (e.g. /api/mentorship/requests/)
 * @param payload Optional JSON payload
 */
export async function apiPost<TResponse, TPayload = unknown>(
  path: string,
  payload?: TPayload,
): Promise<TResponse> {
  const accessToken = useAuthStore.getState().accessToken;

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

/**
 * Perform a typed PATCH request against the backend API.
 * Uses the access token from auth store.
 *
 * @param path Relative API path (e.g. /api/profiles/<username>/)
 * @param payload JSON payload
 */
export async function apiPatch<TResponse, TPayload>(
  path: string,
  payload: TPayload,
): Promise<TResponse> {
  const accessToken = useAuthStore.getState().accessToken;

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as TResponse;
}

/**
 * Perform a typed PUT request against the backend API.
 * Uses the access token from auth store.
 *
 * @param path Relative API path (e.g. /api/notifications/<id>/read/)
 * @param payload Optional JSON payload
 */
export async function apiPut<TResponse, TPayload = unknown>(
  path: string,
  payload?: TPayload,
): Promise<TResponse> {
  const accessToken = useAuthStore.getState().accessToken;

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

/**
 * Perform a typed DELETE request against the backend API.
 * Uses the access token from auth store.
 *
 * @param path Relative API path (e.g. /api/profiles/me/availability-slots/<id>/)
 */
export async function apiDelete<TResponse = void>(
  path: string,
): Promise<TResponse> {
  const accessToken = useAuthStore.getState().accessToken;

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      detail?: string;
      non_field_errors?: string[];
      [key: string]: unknown;
    };

    if (payload.detail) {
      return payload.detail;
    }

    if (
      Array.isArray(payload.non_field_errors) &&
      payload.non_field_errors[0]
    ) {
      return payload.non_field_errors[0];
    }

    for (const value of Object.values(payload)) {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "string"
      ) {
        return value[0];
      }
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }

    return `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
