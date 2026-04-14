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
