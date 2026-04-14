const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Wrapper around fetch that aborts requests after a timeout.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Request timed out after ${Math.floor(timeoutMs / 1000)} seconds. Check API base URL and backend availability.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
