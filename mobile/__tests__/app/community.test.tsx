import CommunityScreen from "@/app/(tabs)/community";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

const mockPush = jest.fn();
const mockMyCommunitiesQuery = jest.fn();
const mockCommunityFeedQuery = jest.fn();
let mockUsername: string | undefined = "student";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));

jest.mock("@/components/profile/ProfilePostCard", () => ({
  ProfilePostCard: ({
    communityLabel,
    post,
  }: {
    communityLabel?: string | null;
    post: { id: string; content: string };
  }) => {
    const { Text, View } = require("react-native");
    return (
      <View testID={`community-feed-post-${post.id}`}>
        <Text>{post.content}</Text>
        {communityLabel ? <Text>{communityLabel}</Text> : null}
      </View>
    );
  },
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      user: mockUsername ? { username: mockUsername } : null,
    }),
}));

jest.mock("@/lib/queries/communityTags", () => ({
  useMyCommunityTagsQuery: (username?: string) =>
    mockMyCommunitiesQuery(username),
}));

jest.mock("@/lib/queries/communityPosts", () => ({
  useMyCommunityPostsFeedQuery: (...args: unknown[]) =>
    mockCommunityFeedQuery(...args),
}));

describe("CommunityScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsername = "student";
    mockMyCommunitiesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockCommunityFeedQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it("requests joined communities for the authenticated username", () => {
    render(<CommunityScreen />);

    expect(mockMyCommunitiesQuery).toHaveBeenCalledWith("student");
  });

  it("shows a loading state while joined communities are loading", () => {
    mockMyCommunitiesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { getByTestId, getByText } = render(<CommunityScreen />);

    expect(getByTestId("community-loading-state")).toBeTruthy();
    expect(getByText("Loading your communities...")).toBeTruthy();
  });

  it("shows the existing error banner copy when the query fails", () => {
    mockMyCommunitiesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    const { getByText } = render(<CommunityScreen />);

    expect(getByText("Could not load communities")).toBeTruthy();
    expect(getByText("Please try again in a moment.")).toBeTruthy();
  });

  it("opens Discover from the header action so users can find communities", () => {
    const { getByTestId, getByText } = render(<CommunityScreen />);

    expect(getByText("You have not joined any communities yet. Explore and join communities to see them here!")).toBeTruthy();
    fireEvent.press(getByTestId("discover-communities-link"));

    expect(mockPush).toHaveBeenCalledWith("/(tabs)/discover");
  });

  it("opens the create community page from the community prompt", () => {
    const { getByTestId, getByText } = render(<CommunityScreen />);

    expect(getByText("Create your own community")).toBeTruthy();
    fireEvent.press(getByTestId("create-community-link"));

    expect(mockPush).toHaveBeenCalledWith("/(tabs)/community/create");
  });

  it("renders joined community cards before the create prompt and switches the feed placeholder copy", () => {
    mockMyCommunitiesQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: "tag-1",
          name: "Backend Guild",
          slug: "backend-guild",
          description: "API design and Django patterns",
          member_count: 12,
          created_at: "2026-04-20T00:00:00Z",
        },
        {
          id: "tag-2",
          name: "One Person Lab",
          slug: "one-person-lab",
          description: "",
          member_count: 1,
          created_at: "2026-04-21T00:00:00Z",
        },
      ],
    });

    const { getByTestId, getByText, queryByTestId, toJSON } = render(
      <CommunityScreen />,
    );
    const treeText = JSON.stringify(toJSON());

    expect(getByTestId("community-card-backend-guild")).toBeTruthy();
    expect(getByTestId("community-card-one-person-lab")).toBeTruthy();
    expect(treeText.indexOf("Backend Guild")).toBeLessThan(
      treeText.indexOf("Create your own community"),
    );
    expect(getByText("Backend Guild")).toBeTruthy();
    expect(getByText("12 members")).toBeTruthy();
    expect(getByText("1 member")).toBeTruthy();
    expect(getByText("No posts in your communities yet")).toBeTruthy();
    expect(queryByTestId("community-empty-state")).toBeNull();

    fireEvent.press(getByTestId("community-card-backend-guild"));
    expect(mockPush).toHaveBeenCalledWith(
      "/(tabs)/community/tag-1?from=community",
    );
  });

  it("fetches and renders posts from all joined communities", () => {
    mockMyCommunitiesQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: "tag-1",
          name: "Backend Guild",
          slug: "backend-guild",
          description: "API design",
          member_count: 12,
          created_at: "2026-04-20T00:00:00Z",
        },
        {
          id: "tag-2",
          name: "AI Lab",
          slug: "ai-lab",
          description: "Machine learning",
          member_count: 6,
          created_at: "2026-04-21T00:00:00Z",
        },
      ],
    });
    mockCommunityFeedQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: "post-1",
          community_id: "tag-1",
          content: "Backend post",
        },
        {
          id: "post-2",
          community_id: "tag-2",
          content: "AI post",
        },
      ],
    });

    const { getAllByText, getByTestId } = render(<CommunityScreen />);

    expect(mockCommunityFeedQuery).toHaveBeenCalledWith(
      ["tag-1", "tag-2"],
      5,
      true,
    );
    expect(getByTestId("community-feed-posts")).toBeTruthy();
    expect(getByTestId("community-feed-post-post-1")).toBeTruthy();
    expect(getByTestId("community-feed-post-post-2")).toBeTruthy();
    expect(getAllByText("Backend Guild").length).toBeGreaterThan(1);
    expect(getAllByText("AI Lab").length).toBeGreaterThan(1);
  });

  it("still renders the empty state when the user is not restored yet", () => {
    mockUsername = undefined;

    const { getByTestId } = render(<CommunityScreen />);

    expect(mockMyCommunitiesQuery).toHaveBeenCalledWith(undefined);
    expect(getByTestId("community-empty-state")).toBeTruthy();
  });
});
