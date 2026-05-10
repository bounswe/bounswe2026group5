import CommunityDetailScreen from "@/app/(tabs)/community/[tagId]/index";
import { ApiError } from "@/lib/api/client";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockTagId: string | undefined = "tag-1";
let mockFrom: string | undefined = undefined;
const mockDetailRefetch = jest.fn();
const mockDetailQuery = jest.fn();
const mockTaggableUsersQuery = jest.fn();
const mockJoinMutation = jest.fn();
const mockLeaveMutation = jest.fn();
const mockCommunityPostsQuery = jest.fn();
const mockCreateCommunityPostMutation = jest.fn();
const mockCreateCommunityWorkshopMutation = jest.fn();
const mockUpdateCommunityPostMutation = jest.fn();
const mockDeleteCommunityPostMutation = jest.fn();
const mockToastError = jest.fn();
let focusCleanup: (() => void) | undefined;
let mockAuthUser = {
  username: "student",
  app_usage_mode: "MENTEE",
};

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  const MockDateTimePicker = (props: Record<string, unknown>) => {
    return <View {...props} />;
  };
  return {
    __esModule: true,
    default: MockDateTimePicker,
    DateTimePickerAndroid: {
      open: jest.fn(),
    },
  };
});

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
      user: mockAuthUser,
    }),
}));

jest.mock("@/lib/queries/communityTags", () => ({
  useCommunityTagDetailQuery: (tagId?: string) => mockDetailQuery(tagId),
  useCommunityTaggableUsersQuery: (...args: unknown[]) =>
    mockTaggableUsersQuery(...args),
  useJoinCommunityTagMutation: (username?: string) =>
    mockJoinMutation(username),
  useLeaveCommunityTagMutation: (username?: string) =>
    mockLeaveMutation(username),
}));

jest.mock("@/lib/queries/communityPosts", () => ({
  useCommunityPostsQuery: (...args: unknown[]) =>
    mockCommunityPostsQuery(...args),
  useCreateCommunityPostMutation: (username?: string) =>
    mockCreateCommunityPostMutation(username),
  useUpdateCommunityPostMutation: (username?: string) =>
    mockUpdateCommunityPostMutation(username),
  useDeleteCommunityPostMutation: (username?: string) =>
    mockDeleteCommunityPostMutation(username),
}));

jest.mock("@/lib/queries/workshops", () => ({
  useCreateCommunityWorkshopMutation: (username?: string) =>
    mockCreateCommunityWorkshopMutation(username),
}));

jest.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}));

describe("CommunityDetailScreen", () => {
  const joinMutateAsync = jest.fn();
  const leaveMutateAsync = jest.fn();
  const createWorkshopMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    focusCleanup = undefined;
    mockTagId = "tag-1";
    mockFrom = undefined;
    mockAuthUser = {
      username: "student",
      app_usage_mode: "MENTEE",
    };
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
    mockCommunityPostsQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
    });
    mockTaggableUsersQuery.mockReturnValue({
      data: { count: 0, results: [] },
      isLoading: false,
    });
    mockCreateCommunityPostMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    createWorkshopMutateAsync.mockResolvedValue({
      id: "workshop-1",
      title: "Mentor Clinic",
    });
    mockCreateCommunityWorkshopMutation.mockReturnValue({
      mutateAsync: createWorkshopMutateAsync,
      isPending: false,
    });
    mockUpdateCommunityPostMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    mockDeleteCommunityPostMutation.mockReturnValue({
      mutateAsync: jest.fn(),
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

    expect(
      await findByText("You are already a member of this tag."),
    ).toBeTruthy();
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

  it("lets mentors create workshops from the composer", async () => {
    mockAuthUser = {
      username: "mentor_user",
      app_usage_mode: "MENTOR",
    };
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
        is_member: true,
        created_at: "2026-04-20T00:00:00Z",
      },
    });

    const { getByPlaceholderText, getByTestId, findByText, queryByText } = render(
      <CommunityDetailScreen />,
    );

    fireEvent.press(getByTestId("community-composer-toggle"));
    fireEvent.press(getByTestId("community-composer-mode-workshop"));
    fireEvent.changeText(
      getByPlaceholderText("Workshop title"),
      "Backend Clinic",
    );
    fireEvent.changeText(
      getByPlaceholderText("Workshop description"),
      "Serializer deep dive",
    );
    fireEvent.press(getByTestId("community-composer-workshop-date-trigger"));
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 4, 20, 0, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));
    fireEvent.changeText(getByPlaceholderText("Capacity"), "20");
    fireEvent.press(
      getByTestId("community-composer-workshop-start-time-trigger"),
    );
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 4, 20, 13, 30),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));
    fireEvent.press(getByTestId("community-composer-workshop-end-time-trigger"));
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 4, 20, 15, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));

    await act(async () => {
      fireEvent.press(getByTestId("community-composer-submit"));
    });

    await waitFor(() => {
      expect(createWorkshopMutateAsync).toHaveBeenCalledWith({
        tagId: "tag-1",
        title: "Backend Clinic",
        description: "Serializer deep dive",
        scheduled_at: "2026-05-20T10:30:00.000Z",
        end_at: "2026-05-20T12:00:00.000Z",
        max_participants: 20,
      });
    });
    expect(await findByText("Workshop created in Backend Guild.")).toBeTruthy();
  });

  it("shows a clearer message when workshop creation hits a server 500", async () => {
    mockAuthUser = {
      username: "mentor_user",
      app_usage_mode: "MENTOR",
    };
    mockDetailQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: mockDetailRefetch,
      data: {
        id: "tag-1",
        name: "AI & ML Enthusiasts",
        slug: "ai-ml-enthusiasts",
        description: "Discuss practical machine learning.",
        member_count: 6,
        created_by_username: "ada",
        is_member: true,
        created_at: "2026-04-20T00:00:00Z",
      },
    });
    createWorkshopMutateAsync.mockRejectedValueOnce(
      new ApiError(500, "Request failed with status 500"),
    );

    const { getByPlaceholderText, getByTestId, queryByText } = render(
      <CommunityDetailScreen />,
    );

    fireEvent.press(getByTestId("community-composer-toggle"));
    fireEvent.press(getByTestId("community-composer-mode-workshop"));
    fireEvent.changeText(
      getByPlaceholderText("Workshop title"),
      "Test workshop",
    );
    fireEvent.changeText(
      getByPlaceholderText("Workshop description"),
      "This is a test",
    );
    fireEvent.press(getByTestId("community-composer-workshop-date-trigger"));
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 5, 10, 0, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));
    fireEvent.changeText(getByPlaceholderText("Capacity"), "10");
    fireEvent.press(
      getByTestId("community-composer-workshop-start-time-trigger"),
    );
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 5, 10, 13, 30),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));
    fireEvent.press(getByTestId("community-composer-workshop-end-time-trigger"));
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 5, 10, 15, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));

    await act(async () => {
      fireEvent.press(getByTestId("community-composer-submit"));
    });

    const expectedMessage =
      "Workshop creation failed on the server. The backend may still be missing the workshop migration or deployment update.";
    await waitFor(() => {
      expect(queryByText(expectedMessage)).toBeNull();
    });
    expect(mockToastError).toHaveBeenCalledWith(expectedMessage, {
      title: "Workshop creation failed",
    });
  });
});
