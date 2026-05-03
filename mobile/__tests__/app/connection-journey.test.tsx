import MatchJourneyScreen from "@/app/(tabs)/connections/timeline/[matchId]";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

const mockBack = jest.fn();
const mockSuccessToast = jest.fn();
const mockCreateMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();
const mockDeleteMutateAsync = jest.fn();
let mockMatchId: string | undefined = "match-1";
let mockJourneyQuery: any = {
  data: {
    results: [],
  },
  isLoading: false,
  isError: false,
  error: null,
};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ matchId: mockMatchId }),
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/components/ui/ErrorBanner", () => ({
  ErrorBanner: ({ title, message }: { title?: string; message: string }) => {
    const { Text, View } = jest.requireActual("react-native");
    return (
      <View>
        {title ? <Text>{title}</Text> : null}
        <Text>{message}</Text>
      </View>
    );
  },
}));

jest.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({
    success: mockSuccessToast,
  }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: { user: { username: string } }) => unknown) =>
    selector({ user: { username: "current_user" } }),
}));

jest.mock("@/lib/queries/mentorship", () => ({
  useMatchJourneyQuery: () => mockJourneyQuery,
  useCreateTimelineEventMutation: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateTimelineEventMutation: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useDeleteTimelineEventMutation: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

describe("MatchJourneyScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMutateAsync.mockResolvedValue({});
    mockUpdateMutateAsync.mockResolvedValue({});
    mockDeleteMutateAsync.mockResolvedValue({});
    mockMatchId = "match-1";
    mockJourneyQuery = {
      data: {
        results: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    };
  });

  it("renders AGTE journey events and payload details", () => {
    mockJourneyQuery = {
      data: {
        results: [
          {
            id: "session_scheduled:session-1",
            category: "AGTE",
            event_type: "session_scheduled",
            timestamp: "2026-05-02T10:00:00Z",
            actor_role: "mentor",
            author: null,
            content: undefined,
            payload: {
              session_id: "session-1",
              scheduled_start_at_utc: "2026-05-03T16:00:00+00:00",
            },
            show_on_profile: false,
            is_editable: false,
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    const { getByText, getByTestId, queryByText } = render(<MatchJourneyScreen />);

    expect(getByText("Session scheduled")).toBeTruthy();
    expect(getByText("System")).toBeTruthy();
    expect(getByText("View details")).toBeTruthy();
    expect(queryByText("session_id")).toBeNull();
    expect(queryByText("session-1")).toBeNull();

    fireEvent.press(
      getByTestId("journey-event-toggle-session_scheduled:session-1"),
    );

    expect(getByText("Starts")).toBeTruthy();
    expect(queryByText("scheduled_start_at_utc")).toBeNull();
    expect(getByTestId("journey-event-session_scheduled:session-1")).toBeTruthy();
  });

  it("does not render profile or community posts in the private journey", () => {
    mockJourneyQuery = {
      data: {
        results: [
          {
            id: "post-1",
            category: "PrP",
            event_type: "profile_post",
            timestamp: "2026-05-02T10:00:00Z",
            payload: {},
            content: "Public profile post",
            show_on_profile: true,
            is_editable: false,
          },
          {
            id: "community-1",
            category: "CoP",
            event_type: "community_post",
            timestamp: "2026-05-02T10:00:00Z",
            payload: {},
            content: "Community post",
            show_on_profile: true,
            is_editable: false,
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    const { getByTestId, queryByText } = render(<MatchJourneyScreen />);

    expect(getByTestId("journey-empty")).toBeTruthy();
    expect(queryByText("Public profile post")).toBeNull();
    expect(queryByText("Community post")).toBeNull();
  });

  it("shows empty, error, and back states", () => {
    const { getByTestId, getByText, rerender } = render(<MatchJourneyScreen />);

    expect(getByTestId("journey-empty")).toBeTruthy();

    mockJourneyQuery = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("No access."),
    };
    rerender(<MatchJourneyScreen />);
    expect(getByText("Could not load journey")).toBeTruthy();
    expect(getByText("No access.")).toBeTruthy();

    fireEvent.press(getByTestId("journey-back-button"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
