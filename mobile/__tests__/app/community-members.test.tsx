import CommunityMembersScreen from "@/app/(tabs)/community/[tagId]/members";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockTagId: string | undefined = "tag-1";
let mockFrom: string | undefined = undefined;
const mockDetailQuery = jest.fn();
const mockMembersQuery = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ tagId: mockTagId, from: mockFrom }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("@/lib/queries/communityTags", () => ({
  useCommunityTagDetailQuery: (tagId?: string) => mockDetailQuery(tagId),
  useCommunityTagMembersQuery: (params: unknown, enabled?: boolean) =>
    mockMembersQuery(params, enabled),
}));

describe("CommunityMembersScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTagId = "tag-1";
    mockFrom = undefined;
    mockDetailQuery.mockReturnValue({
      data: {
        id: "tag-1",
        name: "Backend Guild",
        slug: "backend-guild",
        description: "",
        member_count: 25,
        created_by_username: "ada",
        is_member: true,
        created_at: "2026-04-20T00:00:00Z",
      },
    });
    mockMembersQuery.mockReturnValue({
      isLoading: false,
      isFetching: false,
      isError: false,
      data: {
        count: 25,
        page: 1,
        pageSize: 20,
        results: [
          {
            id: "profile-1",
            username: "ada",
            full_name: "Ada Lovelace",
            bio: "",
            hidden: false,
            picture_url: "",
            title: "Backend Mentor",
            show_initials_only: false,
            skills: ["Django", "API"],
            average_rating: "5.00",
            total_mentee_count: 3,
          },
        ],
      },
    });
  });

  it("loads community members for the route tag id and opens profiles", () => {
    const { getByTestId, getByText } = render(<CommunityMembersScreen />);

    expect(mockDetailQuery).toHaveBeenCalledWith("tag-1");
    expect(mockMembersQuery).toHaveBeenCalledWith(
      { tagId: "tag-1", page: 1, pageSize: 20 },
      true,
    );
    expect(getByText("Backend Guild")).toBeTruthy();
    expect(getByText("25 members")).toBeTruthy();
    expect(getByText("Ada Lovelace")).toBeTruthy();
    expect(getByText("Django")).toBeTruthy();
    expect(getByText("API")).toBeTruthy();

    fireEvent.press(getByTestId("community-member-ada"));
    expect(mockPush).toHaveBeenCalledWith("/user/ada");
  });

  it("keeps source when returning to community detail", () => {
    mockFrom = "discover";
    const { getByTestId } = render(<CommunityMembersScreen />);

    fireEvent.press(getByTestId("community-members-back-button"));

    expect(mockReplace).toHaveBeenCalledWith(
      "/(tabs)/community/tag-1?from=discover",
    );
  });

  it("requests a larger cumulative page size when loading more members", () => {
    const { getByTestId } = render(<CommunityMembersScreen />);

    fireEvent.press(getByTestId("community-members-load-more"));

    expect(mockMembersQuery).toHaveBeenLastCalledWith(
      { tagId: "tag-1", page: 1, pageSize: 40 },
      true,
    );
  });

  it("shows an empty state when there are no visible members", () => {
    mockMembersQuery.mockReturnValue({
      isLoading: false,
      isFetching: false,
      isError: false,
      data: {
        count: 0,
        page: 1,
        pageSize: 20,
        results: [],
      },
    });

    const { getByTestId, getByText } = render(<CommunityMembersScreen />);

    expect(getByTestId("community-members-empty")).toBeTruthy();
    expect(getByText("No visible members yet.")).toBeTruthy();
  });
});
