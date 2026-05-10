import WorkshopDetailScreen from "@/app/(tabs)/community/[tagId]/workshops/[workshopId]";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockReplace = jest.fn();
const mockDetailQuery = jest.fn();
const mockJoinMutation = jest.fn();
const mockLeaveMutation = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
let mockTagId: string | undefined = "tag-1";
let mockWorkshopId: string | undefined = "workshop-1";
let mockFrom: string | undefined = "community";
let mockAuthUser = {
  username: "student",
};

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    tagId: mockTagId,
    workshopId: mockWorkshopId,
    from: mockFrom,
  }),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      user: mockAuthUser,
    }),
}));

jest.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}));

jest.mock("@/lib/queries/workshops", () => {
  const actual = jest.requireActual<Record<string, unknown>>(
    "@/lib/queries/workshops",
  );
  return {
    ...actual,
    useCommunityWorkshopDetailQuery: (...args: unknown[]) =>
      mockDetailQuery(...args),
    useJoinCommunityWorkshopMutation: (username?: string) =>
      mockJoinMutation(username),
    useLeaveCommunityWorkshopMutation: (username?: string) =>
      mockLeaveMutation(username),
  };
});

describe("WorkshopDetailScreen", () => {
  const joinMutateAsync = jest.fn();
  const leaveMutateAsync = jest.fn();
  const refetch = jest.fn();
  const baseWorkshop = {
    id: "workshop-1",
    community_id: "tag-1",
    community_name: "AI & ML Enthusiasts",
    author: {
      id: "mentor-1",
      username: "mentor_user",
      display_name: "Mentor User",
      picture_url: "",
      title: "Mentor",
    },
    title: "Prompt Engineering 101",
    description: "Hands-on workshop",
    scheduled_at: "2099-06-10T13:30:00.000Z",
    end_at: "2099-06-10T15:00:00.000Z",
    max_participants: 10,
    participant_count: 4,
    is_full: false,
    participants: [
      {
        id: "participant-1",
        participant: {
          id: "mentor-1",
          username: "mentor_user",
          display_name: "Mentor User",
          picture_url: "",
          title: "Mentor",
        },
        joined_at: "2099-05-01T00:00:00.000Z",
        show_on_profile: false,
      },
    ],
    status: "SCHEDULED",
    current_user_enrolled: false,
    created_at: "2099-05-01T00:00:00.000Z",
    updated_at: "2099-05-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTagId = "tag-1";
    mockWorkshopId = "workshop-1";
    mockFrom = "community";
    mockAuthUser = {
      username: "student",
    };
    refetch.mockResolvedValue(undefined);
    mockDetailQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch,
      data: baseWorkshop,
    });
    joinMutateAsync.mockResolvedValue({});
    leaveMutateAsync.mockResolvedValue({});
    mockJoinMutation.mockReturnValue({
      mutateAsync: joinMutateAsync,
      isPending: false,
    });
    mockLeaveMutation.mockReturnValue({
      mutateAsync: leaveMutateAsync,
      isPending: false,
    });
  });

  it("renders workshop detail and joins when the user is eligible", async () => {
    const { getByTestId, getByText } = render(<WorkshopDetailScreen />);

    expect(mockDetailQuery).toHaveBeenCalledWith("tag-1", "workshop-1");
    expect(getByText("Prompt Engineering 101")).toBeTruthy();
    expect(getByTestId("workshop-detail-join-button")).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId("workshop-detail-join-button"));
    });

    await waitFor(() => {
      expect(joinMutateAsync).toHaveBeenCalledWith({
        tagId: "tag-1",
        workshopId: "workshop-1",
      });
      expect(refetch).toHaveBeenCalled();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "You joined Prompt Engineering 101.",
    );
  });

  it("renders leave action for already enrolled non-authors", async () => {
    mockDetailQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch,
      data: {
        ...baseWorkshop,
        current_user_enrolled: true,
      },
    });

    const { getByTestId } = render(<WorkshopDetailScreen />);

    await act(async () => {
      fireEvent.press(getByTestId("workshop-detail-leave-button"));
    });

    await waitFor(() => {
      expect(leaveMutateAsync).toHaveBeenCalledWith({
        tagId: "tag-1",
        workshopId: "workshop-1",
      });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "You left Prompt Engineering 101.",
    );
  });

  it("renders author hosting state instead of join actions", () => {
    mockAuthUser = {
      username: "mentor_user",
    };

    const { getByTestId, queryByTestId } = render(<WorkshopDetailScreen />);

    expect(getByTestId("workshop-detail-author-state")).toBeTruthy();
    expect(queryByTestId("workshop-detail-join-button")).toBeNull();
    expect(queryByTestId("workshop-detail-leave-button")).toBeNull();
  });

  it("returns to the community tab from the back button", () => {
    const { getByTestId } = render(<WorkshopDetailScreen />);

    fireEvent.press(getByTestId("workshop-detail-back-button"));

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)/community");
  });
});
