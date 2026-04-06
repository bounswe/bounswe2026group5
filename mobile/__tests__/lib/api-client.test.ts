import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api/client";

const mockGetState = jest.fn();

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: {
    getState: () => mockGetState(),
  },
}));

describe("api client", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    mockGetState.mockReturnValue({ accessToken: "token-123" });
  });

  it("sends GET request with auth header and returns parsed JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: 42 }),
    });

    const result = await apiGet<{ value: number }>("/api/test/");

    expect(result).toEqual({ value: 42 });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/test/", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer token-123",
      },
    });
  });

  it("omits auth header when there is no access token", async () => {
    mockGetState.mockReturnValue({ accessToken: null });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await apiGet<{ ok: boolean }>("/api/no-auth/");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/no-auth/",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );
  });

  it("throws ApiError and prefers detail message", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: "Bad request" }),
    });

    await expect(apiGet("/api/error/")).rejects.toEqual(
      new ApiError(400, "Bad request"),
    );
  });

  it("extracts message from non_field_errors and generic field arrays", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ non_field_errors: ["Top-level error"] }),
    });
    await expect(apiGet("/api/nfe/")).rejects.toEqual(
      new ApiError(422, "Top-level error"),
    );

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ title: ["Title required"] }),
    });
    await expect(apiGet("/api/field-array/")).rejects.toEqual(
      new ApiError(422, "Title required"),
    );
  });

  it("falls back to string field or status message when parsing cannot find one", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ reason: "Forbidden" }),
    });
    await expect(apiGet("/api/string-field/")).rejects.toEqual(
      new ApiError(403, "Forbidden"),
    );

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("invalid json");
      },
    });
    await expect(apiGet("/api/fallback/")).rejects.toEqual(
      new ApiError(500, "Request failed with status 500"),
    );
  });

  it("handles POST success and 204 responses", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "1" }),
    });

    const created = await apiPost<{ id: string }, { title: string }>(
      "/api/items/",
      {
        title: "My Item",
      },
    );

    expect(created).toEqual({ id: "1" });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:8000/api/items/",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Bearer token-123",
        },
        body: JSON.stringify({ title: "My Item" }),
      },
    );

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });
    const noContent = await apiPost<void>("/api/items/1/archive/");
    expect(noContent).toBeUndefined();
  });

  it("supports PATCH and bubbles parsed API error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const patched = await apiPatch<{ ok: boolean }, { value: number }>(
      "/api/patch/",
      {
        value: 1,
      },
    );
    expect(patched).toEqual({ ok: true });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Not found" }),
    });

    await expect(apiPatch("/api/patch/404/", { value: 2 })).rejects.toEqual(
      new ApiError(404, "Not found"),
    );
  });
});
