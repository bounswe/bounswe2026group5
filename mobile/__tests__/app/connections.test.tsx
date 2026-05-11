import ConnectionsScreen from "@/app/(tabs)/connections";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { TouchableOpacity } from "react-native";

const mockPush = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockRespondMutateAsync = jest.fn();
const mockDeactivateMutateAsync = jest.fn();
const mockSubmitFeedbackMutateAsync = jest.fn();
const mockToastSuccess = jest.fn();

let mockUser = { username: "mentor_user", app_usage_mode: "MENTOR" };
let mockRequests: any[] = [];
let mockMatches: any[] = [];
let mockConversations: any[] = [];
let mockDashboardRequests: any[] = [];
let mockFeedbackData: any[] | undefined = [];
let mockRequestsError: Error | null = null;
let mockMatchesError: Error | null = null;

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));

jest.mock("@/components/ui/ErrorBanner", () => ({
  ErrorBanner: ({ message }: { message: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{message}</Text>;
  },
}));

jest.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({
    success: mockToastSuccess,
  }),
}));

jest.mock("@/components/connections/PendingRequestCard", () => ({
  PendingRequestCard: ({
    name,
    onAccept,
    onDecline,
    onPress,
    onShowProfile,
  }: {
    name: string;
    onAccept?: () => void;
    onDecline?: () => void;
    onPress?: () => void;
    onShowProfile?: () => void;
  }) => {
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View>
        <TouchableOpacity testID={`request-${name}`} onPress={onPress}>
          <Text>{name}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`accept-${name}`} onPress={onAccept}>
          <Text>Accept {name}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`decline-${name}`} onPress={onDecline}>
          <Text>Decline {name}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`profile-${name}`} onPress={onShowProfile}>
          <Text>Profile {name}</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@/components/connections/MenteeCard", () => ({
  MenteeCard: ({
    name,
    onPress,
    onMessage,
    onMore,
  }: {
    name: string;
    onPress?: () => void;
    onMessage?: () => void;
    onMore?: () => void;
  }) => {
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View>
        <Text>{name}</Text>
        <TouchableOpacity testID={`card-profile-${name}`} onPress={onPress}>
          <Text>View {name}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`card-message-${name}`} onPress={onMessage}>
          <Text>Message {name}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`card-more-${name}`} onPress={onMore}>
          <Text>More {name}</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@/components/connections/RequestDetailSheet", () => ({
  RequestDetailSheet: ({
    visible,
    request,
    onAccept,
    onDecline,
    onShowProfile,
    acceptanceWarning,
  }: {
    visible: boolean;
    request: { id?: string; name?: string; username?: string } | null;
    onAccept?: (id: string) => void;
    onDecline?: (id: string) => void;
    onShowProfile?: (username?: string) => void;
    acceptanceWarning?: { message: string };
  }) => {
    if (!visible) return null;
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View testID="request-detail-sheet">
        <Text>{request?.name}</Text>
        {acceptanceWarning ? <Text>{acceptanceWarning.message}</Text> : null}
        <TouchableOpacity
          testID="detail-accept"
          onPress={() => onAccept?.(request?.id ?? "")}
        >
          <Text>Accept detail</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="detail-decline"
          onPress={() => onDecline?.(request?.id ?? "")}
        >
          <Text>Decline detail</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="detail-profile"
          onPress={() => onShowProfile?.(request?.username)}
        >
          <Text>Profile detail</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@/components/connections/DeclineConfirmModal", () => ({
  DeclineConfirmModal: ({
    visible,
    onCancel,
    onConfirm,
  }: {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }) => {
    if (!visible) return null;
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View testID="decline-confirm">
        <TouchableOpacity testID="confirm-decline" onPress={onConfirm}>
          <Text>Confirm decline</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="cancel-decline" onPress={onCancel}>
          <Text>Cancel decline</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@/components/connections/ConnectionActionsSheet", () => ({
  ConnectionActionsSheet: ({
    visible,
    name,
    onViewProfile,
    onViewJourney,
    onRemoveConnection,
    onLeaveReview,
  }: {
    visible: boolean;
    name: string;
    onViewProfile: () => void;
    onViewJourney?: () => void;
    onRemoveConnection: () => void;
    onLeaveReview?: () => void;
  }) => {
    if (!visible) return null;
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View testID="connection-actions">
        <Text>{name}</Text>
        <TouchableOpacity testID="action-profile" onPress={onViewProfile}>
          <Text>Profile action</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="action-journey" onPress={onViewJourney}>
          <Text>Journey action</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="action-remove" onPress={onRemoveConnection}>
          <Text>Remove action</Text>
        </TouchableOpacity>
        {onLeaveReview ? (
          <TouchableOpacity testID="action-review" onPress={onLeaveReview}>
            <Text>Review action</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  },
}));

jest.mock("@/components/connections/FeedbackBottomSheet", () => ({
  FeedbackBottomSheet: ({
    visible,
    otherUserName,
    onSubmit,
    onClose,
  }: {
    visible: boolean;
    otherUserName: string;
    onSubmit: (rating: number, text?: string) => void;
    onClose: () => void;
  }) => {
    if (!visible) return null;
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View testID="feedback-sheet">
        <Text>{otherUserName}</Text>
        <TouchableOpacity
          testID="submit-feedback"
          onPress={() => onSubmit(5, "Great match")}
        >
          <Text>Submit feedback</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="close-feedback" onPress={onClose}>
          <Text>Close feedback</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector?: (state: { user: typeof mockUser }) => unknown) => {
    const state = { user: mockUser };
    return selector ? selector(state) : state;
  },
}));

jest.mock("@/lib/queries/MessagingQueries", () => ({
  useConversations: () => ({ data: mockConversations }),
}));

jest.mock("@/lib/queries/mentorship", () => ({
  mapRequestsToDashboard: () => mockDashboardRequests,
  useMentorshipRequestsQuery: () => ({
    data: mockRequests,
    isLoading: false,
    isError: Boolean(mockRequestsError),
    error: mockRequestsError,
  }),
  useMentorshipMatchesQuery: () => ({
    data: mockMatches,
    isLoading: false,
    isError: Boolean(mockMatchesError),
    error: mockMatchesError,
  }),
  useRespondToMentorshipRequestMutation: () => ({
    mutateAsync: mockRespondMutateAsync,
    isPending: false,
  }),
  useDeactivateMatchMutation: () => ({
    mutateAsync: mockDeactivateMutateAsync,
    isPending: false,
  }),
  useMatchFeedbackQuery: () => ({
    data: mockFeedbackData,
    isLoading: false,
  }),
  useSubmitMatchFeedbackMutation: () => ({
    mutateAsync: mockSubmitFeedbackMutateAsync,
    isPending: false,
  }),
}));

const mentorMatch = {
  id: "match-1",
  is_active: true,
  mentor: {
    username: "mentor_user",
    display_name: "Mentor User",
    title: "Mentor",
    picture_url: "",
  },
  mentee: {
    username: "mentee_ada",
    display_name: "Ada Mentee",
    title: "Learner",
    picture_url: "",
  },
};

const pendingRawRequest = {
  id: "request-1",
  status: "PENDING",
  cover_letter: "Please mentor me.",
  slot_date: "2026-05-01",
  slot_start_time: "09:00",
  slot_end_time: "10:00",
  created_at: new Date().toISOString(),
  mentee: {
    username: "mentee_ada",
    display_name: "Ada Mentee",
    picture_url: "",
  },
};

const outgoingDashboardRequest = {
  id: "dash-1",
  requestId: "request-2",
  status: "PENDING",
  type: "outgoing",
  user: "Mentor User",
  message: "Request pending",
  proposedDate: "May 1",
  mentorUsername: "mentor_user",
  menteeUsername: "mentee_user",
  isReschedule: false,
};

describe("ConnectionsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { username: "mentor_user", app_usage_mode: "MENTOR" };
    mockRequests = [];
    mockMatches = [];
    mockConversations = [];
    mockDashboardRequests = [];
    mockFeedbackData = [];
    mockRequestsError = null;
    mockMatchesError = null;
    mockRespondMutateAsync.mockResolvedValue({});
    mockDeactivateMutateAsync.mockResolvedValue({});
    mockSubmitFeedbackMutateAsync.mockResolvedValue({});
  });

  it("renders mentor empty states and opens messages", () => {
    const { getByText } = render(<ConnectionsScreen />);

    expect(getByText("No pending requests.")).toBeTruthy();
    expect(getByText("No active mentees yet.")).toBeTruthy();
  });

  it("opens the messages list from the header", () => {
    const { UNSAFE_getAllByType } = render(<ConnectionsScreen />);

    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0]);

    expect(mockPush).toHaveBeenCalledWith("/messages");
  });

  it("handles mentor requests, details, decline confirmation, and profile navigation", async () => {
    mockRequests = [pendingRawRequest];

    const { getByTestId } = render(<ConnectionsScreen />);

    fireEvent.press(getByTestId("accept-Ada Mentee"));
    await waitFor(() => {
      expect(mockRespondMutateAsync).toHaveBeenCalledWith({
        requestId: "request-1",
        action: "accept",
      });
    });

    fireEvent.press(getByTestId("decline-Ada Mentee"));
    fireEvent.press(getByTestId("confirm-decline"));

    await waitFor(() => {
      expect(mockRespondMutateAsync).toHaveBeenLastCalledWith({
        requestId: "request-1",
        action: "reject",
      });
    });

    fireEvent.press(getByTestId("request-Ada Mentee"));
    expect(getByTestId("request-detail-sheet")).toBeTruthy();
  });

  it("shows request detail actions and decline cancellation", async () => {
    mockRequests = [pendingRawRequest];

    const { getByTestId, queryByTestId } = render(<ConnectionsScreen />);

    fireEvent.press(getByTestId("request-Ada Mentee"));
    fireEvent.press(getByTestId("detail-accept"));

    await waitFor(() => {
      expect(mockRespondMutateAsync).toHaveBeenCalledWith({
        requestId: "request-1",
        action: "accept",
      });
    });

    fireEvent.press(getByTestId("detail-decline"));
    expect(getByTestId("decline-confirm")).toBeTruthy();

    fireEvent.press(getByTestId("cancel-decline"));
    expect(queryByTestId("decline-confirm")).toBeNull();
  });

  it("asks mentors to confirm before accepting when they already have several mentees", async () => {
    mockRequests = [pendingRawRequest];
    mockMatches = Array.from({ length: 5 }, (_, index) => ({
      ...mentorMatch,
      id: `match-${index + 1}`,
      mentee: {
        username: `mentee_${index + 1}`,
        display_name: `Mentee ${index + 1}`,
        title: "Learner",
        picture_url: "",
      },
    }));

    const { getByTestId, getByText } = render(<ConnectionsScreen />);

    fireEvent.press(getByTestId("accept-Ada Mentee"));

    expect(mockRespondMutateAsync).not.toHaveBeenCalled();
    expect(getByTestId("request-detail-sheet")).toBeTruthy();
    expect(
      getByText(
        "You already have several active mentees. Make sure you have enough time to support another learner before accepting.",
      ),
    ).toBeTruthy();

    fireEvent.press(getByTestId("detail-accept"));

    await waitFor(() => {
      expect(mockRespondMutateAsync).toHaveBeenCalledWith({
        requestId: "request-1",
        action: "accept",
      });
    });
  });

  it("manages mentor connections with message, profile, and removal actions", async () => {
    mockMatches = [
      mentorMatch,
      {
        ...mentorMatch,
        id: "match-2",
      },
    ];
    mockFeedbackData = [
      {
        submitted_by: {
          username: "mentor_user",
        },
      },
    ];
    mockConversations = [
      {
        id: "conv-1",
        mentor: { username: "mentor_user" },
        mentee: { username: "mentee_ada" },
      },
    ];

    const { getByTestId, queryByTestId, queryByText } = render(<ConnectionsScreen />);

    fireEvent.press(getByTestId("card-message-Ada Mentee"));
    expect(mockPush).toHaveBeenCalledWith("/messages/conv-1");

    fireEvent.press(getByTestId("card-profile-Ada Mentee"));
    expect(mockPush).toHaveBeenCalledWith("/user/mentee_ada");

    fireEvent.press(getByTestId("card-more-Ada Mentee"));
    expect(queryByTestId("action-review")).toBeNull();
    expect(mockSubmitFeedbackMutateAsync).not.toHaveBeenCalled();

    fireEvent.press(getByTestId("card-more-Ada Mentee"));
    fireEvent.press(getByTestId("action-remove"));

    await waitFor(() => {
      expect(mockDeactivateMutateAsync).toHaveBeenCalledWith("match-1");
      expect(mockDeactivateMutateAsync).toHaveBeenCalledWith("match-2");
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Ada Mentee has been removed.");
    expect(queryByText("Ada Mentee has been removed.")).toBeNull();
  });

  it("opens a single mentor-side match journey directly", () => {
    mockMatches = [mentorMatch];

    const { getByTestId } = render(<ConnectionsScreen />);

    fireEvent.press(getByTestId("card-more-Ada Mentee"));
    fireEvent.press(getByTestId("action-journey"));

    expect(mockPush).toHaveBeenCalledWith(
      "/(tabs)/connections/timeline/match-1",
    );
  });

  it("shows a journey picker instead of silently opening the first match", () => {
    mockMatches = [
      mentorMatch,
      {
        ...mentorMatch,
        id: "match-2",
      },
    ];

    const { getByTestId } = render(<ConnectionsScreen />);

    fireEvent.press(getByTestId("card-more-Ada Mentee"));
    fireEvent.press(getByTestId("action-journey"));

    expect(mockPush).not.toHaveBeenCalledWith(
      "/(tabs)/connections/timeline/match-1",
    );

    fireEvent.press(getByTestId("journey-match-match-2"));

    expect(mockPush).toHaveBeenCalledWith(
      "/(tabs)/connections/timeline/match-2",
    );
  });

  it("toggles the mentor mentee preview and ignores missing conversations", () => {
    mockMatches = Array.from({ length: 4 }, (_, index) => ({
      ...mentorMatch,
      id: `match-${index + 1}`,
      mentee: {
        username: `mentee_${index + 1}`,
        display_name: `Mentee ${index + 1}`,
        title: "Learner",
        picture_url: "",
      },
    }));

    const { getAllByText, getByText, getByTestId, queryByText } = render(
      <ConnectionsScreen />,
    );

    expect(getByText("View All (4)")).toBeTruthy();
    expect(queryByText("Mentee 4")).toBeNull();

    fireEvent.press(getByText("View All (4)"));
    expect(getByText("Mentee 4")).toBeTruthy();

    fireEvent.press(getByText("Show Less"));
    expect(queryByText("Mentee 4")).toBeNull();

    fireEvent.press(getByTestId("card-message-Mentee 1"));
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringMatching(/^\/messages\//));
  });

  it("shows mentor query and action errors", async () => {
    mockRequestsError = new Error("Could not load requests.");
    mockMatchesError = new Error("Could not load matches.");
    mockMatches = [mentorMatch];
    mockDeactivateMutateAsync.mockRejectedValueOnce(new Error("Remove failed."));

    const { getByText, getByTestId, findByText } = render(<ConnectionsScreen />);

    expect(getByText("Could not load requests.")).toBeTruthy();
    expect(getByText("Could not load matches.")).toBeTruthy();

    fireEvent.press(getByTestId("card-more-Ada Mentee"));
    fireEvent.press(getByTestId("action-remove"));

    expect(await findByText("Remove failed.")).toBeTruthy();
  });

  it("reports mentor request action errors", async () => {
    mockRequests = [pendingRawRequest];
    mockRespondMutateAsync.mockRejectedValueOnce(new Error("Accept failed."));

    const { getByTestId, findByText } = render(<ConnectionsScreen />);

    fireEvent.press(getByTestId("accept-Ada Mentee"));

    expect(await findByText("Accept failed.")).toBeTruthy();
  });

  it("renders mentee request and mentor sections", () => {
    mockUser = { username: "mentee_user", app_usage_mode: "MENTEE" };
    mockMatches = [
      {
        ...mentorMatch,
        mentor: {
          username: "mentor_user",
          display_name: "Mentor User",
          title: "Senior Mentor",
          picture_url: "",
        },
        mentee: {
          username: "mentee_user",
          display_name: "Mentee User",
          title: "",
          picture_url: "",
        },
      },
    ];
    mockDashboardRequests = [
      { ...outgoingDashboardRequest, mentorUsername: "other_mentor" },
    ];

    const { getByText, getByTestId, getAllByText } = render(<ConnectionsScreen />);

    expect(getByText("Mentors")).toBeTruthy();
    expect(getAllByText("Mentor User").length).toBeGreaterThan(0);
    fireEvent.press(getByTestId("card-profile-Mentor User"));
    expect(mockPush).toHaveBeenCalledWith("/user/mentor_user");
  });

  it("opens mentee request details, profiles, messages, and show-all mentors", () => {
    mockUser = { username: "mentee_user", app_usage_mode: "MENTEE" };
    mockMatches = Array.from({ length: 4 }, (_, index) => ({
      ...mentorMatch,
      id: `match-${index + 1}`,
      mentor: {
        username: `mentor_${index + 1}`,
        display_name: `Mentor ${index + 1}`,
        title: "Senior Mentor",
        picture_url: "",
      },
      mentee: {
        username: "mentee_user",
        display_name: "Mentee User",
        title: "",
        picture_url: "",
      },
    }));
    mockConversations = [
      {
        id: "conv-2",
        mentor: { username: "mentor_1" },
        mentee: { username: "mentee_user" },
      },
    ];
    mockDashboardRequests = [
      {
        ...outgoingDashboardRequest,
        user: "Mentor Pending",
        mentorUsername: "mentor_pending",
      },
    ];

    const { getAllByText, getByText, getByTestId, queryByText } = render(
      <ConnectionsScreen />,
    );

    fireEvent.press(getByTestId("request-Mentor Pending"));
    expect(getByTestId("request-detail-sheet")).toBeTruthy();
    fireEvent.press(getByTestId("detail-profile"));
    expect(mockPush).toHaveBeenCalledWith("/user/mentor_pending");

    fireEvent.press(getByTestId("profile-Mentor Pending"));
    expect(mockPush).toHaveBeenCalledWith("/user/mentor_pending");

    fireEvent.press(getByTestId("card-message-Mentor 1"));
    expect(mockPush).toHaveBeenCalledWith("/messages/conv-2");

    expect(getByText("View All (4)")).toBeTruthy();
    expect(queryByText("Mentor 4")).toBeNull();
    fireEvent.press(getByText("View All (4)"));
    expect(getAllByText("Mentor 4").length).toBeGreaterThan(0);
  });

  it("removes mentee-side mentor connections successfully", async () => {
    mockUser = { username: "mentee_user", app_usage_mode: "MENTEE" };
    mockMatches = [
      {
        ...mentorMatch,
        mentee: { username: "mentee_user", display_name: "Mentee User" },
      },
    ];

    const { getByTestId, queryByText } = render(<ConnectionsScreen />);

    fireEvent.press(getByTestId("card-more-Mentor User"));
    fireEvent.press(getByTestId("action-remove"));

    await waitFor(() => {
      expect(mockDeactivateMutateAsync).toHaveBeenCalledWith("match-1");
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Mentor User has been removed.");
    expect(queryByText("Mentor User has been removed.")).toBeNull();
  });

  it("submits and reports mentee feedback failures", async () => {
    mockUser = { username: "mentee_user", app_usage_mode: "MENTEE" };
    mockMatches = [
      {
        ...mentorMatch,
        mentee: { username: "mentee_user", display_name: "Mentee User" },
      },
    ];
    mockSubmitFeedbackMutateAsync.mockRejectedValueOnce(
      new Error("Feedback failed."),
    );

    const { getByTestId, findByText } = render(<ConnectionsScreen />);

    fireEvent.press(getByTestId("card-more-Mentor User"));
    fireEvent.press(getByTestId("action-review"));
    fireEvent.press(getByTestId("submit-feedback"));

    expect(await findByText("Feedback failed.")).toBeTruthy();
  });
});
