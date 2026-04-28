import { ApiError } from "@/lib/api/client";
import {
  createCommunityTag,
  deleteCommunityTag,
  fetchCommunityTagDetail,
  fetchCommunityTagMembers,
  fetchCommunityTags,
  fetchMyCommunityTags,
  fetchPopularCommunityTags,
  joinCommunityTag,
  leaveCommunityTag,
  updateCommunityTagDescription,
} from "@/lib/queries/communityTags";

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiPatch = jest.fn();
const mockApiDelete = jest.fn();

jest.mock("@/lib/api/client", () => ({
  ApiError: jest.requireActual("@/lib/api/client").ApiError,
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPatch: (...args: unknown[]) => mockApiPatch(...args),
  apiDelete: (...args: unknown[]) => mockApiDelete(...args),
}));

describe("community tag API helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists community tags with trimmed search and pagination params", async () => {
    mockApiGet.mockResolvedValueOnce({
      count: 1,
      page: 2,
      pageSize: 12,
      results: [],
    });

    const result = await fetchCommunityTags({
      query: "  react native  ",
      page: 2,
      pageSize: 12,
    });

    expect(result.page).toBe(2);
    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/profiles/tags/?page=2&pageSize=12&q=react+native",
    );
  });

  it("omits empty search query instead of sending q with whitespace", async () => {
    mockApiGet.mockResolvedValueOnce({
      count: 0,
      page: 1,
      pageSize: 20,
      results: [],
    });

    await fetchCommunityTags({ query: "   " });

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/profiles/tags/?page=1&pageSize=20",
    );
  });

  it("fetches popular tags with default and explicit popularity windows", async () => {
    mockApiGet.mockResolvedValueOnce([]);
    await fetchPopularCommunityTags();

    expect(mockApiGet).toHaveBeenLastCalledWith(
      "/api/profiles/tags/popular/?limit=10&window=all",
    );

    mockApiGet.mockResolvedValueOnce([]);
    await fetchPopularCommunityTags({ limit: 3, window: "7d" });

    expect(mockApiGet).toHaveBeenLastCalledWith(
      "/api/profiles/tags/popular/?limit=3&window=7d",
    );
  });

  it("uses the self-scoped endpoint for joined communities", async () => {
    mockApiGet.mockResolvedValueOnce([]);

    await fetchMyCommunityTags();

    expect(mockApiGet).toHaveBeenCalledWith("/api/profiles/me/tags/");
  });

  it("encodes tag ids when fetching detail and members", async () => {
    mockApiGet.mockResolvedValueOnce({
      id: "tag/id",
      name: "Backend",
      slug: "backend",
      description: "",
      member_count: 1,
      created_by_username: "ada",
      is_member: false,
      created_at: "2026-04-20T00:00:00Z",
    });

    await fetchCommunityTagDetail("tag/id");

    expect(mockApiGet).toHaveBeenLastCalledWith(
      "/api/profiles/tags/tag%2Fid/",
    );

    mockApiGet.mockResolvedValueOnce({
      count: 0,
      page: 3,
      pageSize: 5,
      results: [],
    });

    await fetchCommunityTagMembers({
      tagId: "tag/id",
      page: 3,
      pageSize: 5,
    });

    expect(mockApiGet).toHaveBeenLastCalledWith(
      "/api/profiles/tags/tag%2Fid/members/?page=3&pageSize=5",
    );
  });

  it("trims create and update payloads before sending them", async () => {
    mockApiPost.mockResolvedValueOnce({ id: "tag-1" });

    await createCommunityTag({
      name: "  Backend Guild  ",
      description: "  API design  ",
    });

    expect(mockApiPost).toHaveBeenCalledWith("/api/profiles/tags/", {
      name: "Backend Guild",
      description: "API design",
    });

    mockApiPatch.mockResolvedValueOnce({ id: "tag-1" });

    await updateCommunityTagDescription({
      tagId: "tag-1",
      description: "  Updated description  ",
    });

    expect(mockApiPatch).toHaveBeenCalledWith("/api/profiles/tags/tag-1/", {
      description: "Updated description",
    });
  });

  it("calls the correct membership endpoints for join and leave", async () => {
    mockApiPost.mockResolvedValueOnce({
      tag_id: "tag-1",
      tag_name: "Backend",
      tag_slug: "backend",
      joined: true,
    });

    await joinCommunityTag("tag-1");

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/profiles/tags/tag-1/join/",
    );

    mockApiDelete.mockResolvedValueOnce({
      tag_id: "tag-1",
      tag_name: "Backend",
      tag_slug: "backend",
      joined: false,
    });

    await leaveCommunityTag("tag-1");

    expect(mockApiDelete).toHaveBeenCalledWith(
      "/api/profiles/tags/tag-1/leave/",
    );
  });

  it("bubbles API errors from membership calls so screens can show precise warnings", async () => {
    mockApiPost.mockRejectedValueOnce(
      new ApiError(400, "You are already a member of this tag."),
    );

    await expect(joinCommunityTag("tag-1")).rejects.toMatchObject({
      status: 400,
      message: "You are already a member of this tag.",
    });
  });

  it("deletes a community tag through the detail endpoint", async () => {
    mockApiDelete.mockResolvedValueOnce(undefined);

    await deleteCommunityTag("tag-1");

    expect(mockApiDelete).toHaveBeenCalledWith("/api/profiles/tags/tag-1/");
  });
});
