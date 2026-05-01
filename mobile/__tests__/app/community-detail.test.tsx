import CommunityDetailScreen from "@/app/(tabs)/community/[tagId]/index";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockTagId: string | undefined = "tag-1";
let mockFrom: string | undefined = undefined;
const mockDetailRefetch = jest.fn();
const mockDetailQuery = jest.fn();
const mockJoinMutation = jest.fn();
const mockLeaveMutation = jest.fn();
let focusCleanup: (() => void) | undefined;

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ tagId: mockTagId, from: mockFrom }),
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    focusCleanup = effect() as (() => void) | undefined;
  },
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      user: {
        username: "student",
      },
    }),
}));

jest.mock("@/lib/queries/communityTags", () => ({
  useCommunityTagDetailQuery: (tagId?: string) => mockDetailQuery(tagId),
  useJoinCommunityTagMutation: (username?: string) => mockJoinMutation(username),
  useLeaveCommunityTagMutation: (username?: string) => mockLeaveMutation(username),
}));

describe("CommunityDetailScreen", () => {
  const joinMutateAsync = jest.fn();
  const leaveMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    focusCleanup = undefined;
    mockTagId = "tag-1";
    mockFrom = undefined;
    mockDetailQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: mockDetailRefetch,
      data: {
        id: "tag-1",
        name: "Backend Guild",
        slug: "backend-guild",
        description: "API design and Django patterns",
        member_count: 12,
        created_by_username: "ada",
        is_member: false,
        created_at: "2026-04-20T00:00:00Z",
      },
    });
    joinMutateAsync.mockResolvedValue({
      tag_id: "tag-1",
      tag_name: "Backend Guild",
      tag_slug: "backend-guild",
      joined: true,
    });
    leaveMutateAsync.mockResolvedValue({
      tag_id: "tag-1",
      tag_name: "Backend Guild",
      tag_slug: "backend-guild",
      joined: false,
    });
    mockJoinMutation.mockReturnValue({
      mutateAsync: joinMutateAsync,
      isPending: false,
    });
    mockLeaveMutation.mockReturnValue({
      mutateAsync: leaveMutateAsync,
      isPending: false,
    });
  });

  it("loads detail and links the member count to the member list", () => {
    const { getByText, getByTestId } = render(<CommunityDetailScreen />);

    expect(mockDetailQuery).toHaveBeenCalledWith("tag-1");
    expect(getByText("Backend Guild")).toBeTruthy();
    expect(getByText("12 members")).toBeTruthy();
    fireEvent.press(getByTestId("community-members-link"));
    expect(mockPush).toHaveBeenCalledWith(
      "/(tabs)/community/tag-1/members?from=community",
    );
  });

  it("shows loading state while detail is loading", () => {
    mockDetailQuery.mockReturnValue({
      isLoading: true,
      isError: false,
      refetch: mockDetailRefetch,
      data: undefined,
    });

    const { getByTestId, getByText } = render(<CommunityDetailScreen />);

    expect(getByTestId("community-detail-loading")).toBeTruthy();
    expect(getByText("Loading community...")).toBeTruthy();
  });

  it("preserves discovery origin when opening the member list", () => {
    mockFrom = "discover";
    const { getByTestId } = render(<CommunityDetailScreen />);

    fireEvent.press(getByTestId("community-members-link"));

    expect(mockPush).toHaveBeenCalledWith(
      "/(tabs)/community/tag-1/members?from=discover",
    );
  });

  it("joins a community and refreshes detail", async () => {
    const { getByTestId, findByText } = render(<CommunityDetailScreen />);

    fireEvent.press(getByTestId("community-membership-button"));

    await waitFor(() => {
      expect(joinMutateAsync).toHaveBeenCalledWith("tag-1");
    });
    expect(mockDetailRefetch).toHaveBeenCalled();
    expect(await findByText("You joined Backend Guild.")).toBeTruthy();
  });

  it("clears transient success banners when leaving the detail screen", async () => {
    const { getByTestId, queryByText, findByText } = render(
      <CommunityDetailScreen />,
    );

    fireEvent.press(getByTestId("community-membership-button"));

    expect(await findByText("You joined Backend Guild.")).toBeTruthy();

    act(() => {
      focusCleanup?.();
    });

    await waitFor(() => {
      expect(queryByText("You joined Backend Guild.")).toBeNull();
    });
  });

  it("asks for confirmation before leaving a joined community", async () => {
    mockDetailQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: mockDetailRefetch,
      data: {
        id: "tag-1",
        name: "Backend Guild",
        slug: "backend-guild",
        description: "",
        member_count: 12,
        created_by_username: "ada",
        is_member: true,
        created_at: "2026-04-20T00:00:00Z",
      },
    });

    const { getAllByText, getByTestId, getByText } = render(
      <CommunityDetailScreen />,
    );

    fireEvent.press(getByTestId("community-membership-button"));
    expect(getByText("Leave community?")).toBeTruthy();
    expect(leaveMutateAsync).not.toHaveBeenCalled();

    fireEvent.press(getAllByText("Leave Community")[1]);

    await waitFor(() => {
      expect(leaveMutateAsync).toHaveBeenCalledWith("tag-1");
    });
  });

  it("surfaces precise API errors from join attempts", async () => {
    joinMutateAsync.mockRejectedValueOnce(
      new Error("You are already a member of this tag."),
    );

    const { getByTestId, findByText } = render(<CommunityDetailScreen />);

    fireEvent.press(getByTestId("community-membership-button"));

    expect(await findByText("You are already a member of this tag.")).toBeTruthy();
    expect(mockDetailRefetch).not.toHaveBeenCalled();
  });

  it("returns to Community when no source route is provided", () => {
    const { getByTestId } = render(<CommunityDetailScreen />);

    fireEvent.press(getByTestId("community-detail-back-button"));

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/community");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("returns to Discover when opened from discovery", () => {
    mockFrom = "discover";
    const { getByTestId } = render(<CommunityDetailScreen />);

    fireEvent.press(getByTestId("community-detail-back-button"));

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/discover");
  });
});
