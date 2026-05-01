import { fetchDiscoverProfiles } from "@/lib/discover/client";

const mockFetch = jest.fn();

describe("discover profile API helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });
});
