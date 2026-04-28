import CommunityScreen from "@/app/(tabs)/community";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

const mockPush = jest.fn();
const mockMyCommunitiesQuery = jest.fn();
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

describe("CommunityScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsername = "student";
    mockMyCommunitiesQuery.mockReturnValue({
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

  it("renders joined community cards and switches the feed placeholder copy", () => {
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

    const { getByTestId, getByText, queryByTestId } = render(
      <CommunityScreen />,
    );

    expect(getByTestId("community-card-backend-guild")).toBeTruthy();
    expect(getByTestId("community-card-one-person-lab")).toBeTruthy();
    expect(getByText("Backend Guild")).toBeTruthy();
    expect(getByText("12 members")).toBeTruthy();
    expect(getByText("1 member")).toBeTruthy();
    expect(
      getByText("Posts from your communities will appear here"),
    ).toBeTruthy();
    expect(queryByTestId("community-empty-state")).toBeNull();
  });

  it("still renders the empty state when the user is not restored yet", () => {
    mockUsername = undefined;

    const { getByTestId } = render(<CommunityScreen />);

    expect(mockMyCommunitiesQuery).toHaveBeenCalledWith(undefined);
    expect(getByTestId("community-empty-state")).toBeTruthy();
  });
});
