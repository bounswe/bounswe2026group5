import { fetchDiscoverProfiles } from "@/lib/discover/client";

const mockFetch = jest.fn();
let mockAccessToken: string | null = "token-1";

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: {
    getState: () => ({ accessToken: mockAccessToken }),
  },
}));

describe("discover profile API helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccessToken = "token-1";
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 0,
        page: 1,
        pageSize: 8,
        results: [],
      }),
    });
  });

  it("sends selected skills and community tags as repeated query params", async () => {
    await fetchDiscoverProfiles({
      page: 1,
      pageSize: 8,
      query: "  backend  ",
      skills: ["Django", "  "],
      tags: ["backend-guild", "ai-ml"],
    });

    const [url] = mockFetch.mock.calls[0];
    const parsed = new URL(url);

    expect(parsed.pathname).toBe("/api/profiles/");
    expect(parsed.searchParams.get("q")).toBe("backend");
    expect(parsed.searchParams.getAll("skill")).toEqual(["Django"]);
    expect(parsed.searchParams.getAll("tag")).toEqual([
      "backend-guild",
      "ai-ml",
    ]);
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer token-1",
    );
  });

  it("sends location radius parameters for mentor search", async () => {
    await fetchDiscoverProfiles({
      page: 2,
      pageSize: 8,
      latitude: 41.0082,
      longitude: 28.9784,
      distanceKm: 15,
    });

    const [url] = mockFetch.mock.calls[0];
    const parsed = new URL(url);

    expect(parsed.searchParams.get("page")).toBe("2");
    expect(parsed.searchParams.get("lat")).toBe("41.0082");
    expect(parsed.searchParams.get("lng")).toBe("28.9784");
    expect(parsed.searchParams.get("distanceKm")).toBe("15");
  });
});
