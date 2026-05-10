import DashboardScreen from "@/app/(tabs)/index";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { ScrollView } from "react-native";

const mockPush = jest.fn();
const mockRequestsRefetch = jest.fn();
const mockSessionsRefetch = jest.fn();
const mockMatchesRefetch = jest.fn();
const mockResendMutateAsync = jest.fn();
const mockRespondMutateAsync = jest.fn();
const mockCancelMutateAsync = jest.fn();
const mockRescheduleMutateAsync = jest.fn();
const mockToastSuccess = jest.fn();
let mockIsEmailVerified: boolean | undefined = true;
let mockMappedRequests: any[] = [];
let mockMappedSessions: any[] = [];
let mockMappedWorkshops: any[] = [];
let mockMatches: any[] = [];
let mockRequestsIsError = false;
let mockSessionsIsError = false;
let mockWorkshopsIsError = false;

const defaultSession = {
  id: "slot-1",
  sessionId: "session-1",
  user: "Ada Lovelace",
  date: "Apr 20",
  time: "09:00 - 10:00",
  status: "SCHEDULED",
  myRole: "Mentee",
  mentorUsername: "mentor_ada",
};

const defaultRequest = {
  id: "request-1",
  requestId: "request-1",
  type: "incoming",
  user: "Grace Hopper",
  message: "Can we meet?",
  proposedDate: "Apr 21",
  menteeUsername: "grace",
  mentorUsername: "student",
  isReschedule: false,
};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
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
        <TouchableOpacity testID={`request-card-${name}`} onPress={onPress}>
          <Text>{name}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`request-accept-${name}`} onPress={onAccept}>
          <Text>Accept {name}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`request-decline-${name}`} onPress={onDecline}>
          <Text>Decline {name}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`request-profile-${name}`} onPress={onShowProfile}>
          <Text>Profile {name}</Text>
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
  }: {
    visible: boolean;
    request: { username?: string; name?: string } | null;
    onAccept?: () => void;
    onDecline?: () => void;
    onShowProfile?: (username?: string) => void;
  }) => {
    if (!visible) return null;
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View testID="request-detail-sheet">
        <Text>{request?.name}</Text>
        <TouchableOpacity testID="detail-accept" onPress={onAccept}>
          <Text>Accept detail</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="detail-decline" onPress={onDecline}>
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

jest.mock("@/components/dashboard/RescheduleBottomSheet", () => ({
  RescheduleBottomSheet: ({
    visible,
    onClose,
    onSelectSlot,
  }: {
    visible: boolean;
    onClose?: () => void;
    onSelectSlot?: (slotId: string) => void;
  }) => {
    if (!visible) return null;
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View testID="reschedule-sheet">
        <TouchableOpacity
          testID="reschedule-select-slot"
          onPress={() => onSelectSlot?.("slot-2")}
        >
          <Text>Select new slot</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="reschedule-close" onPress={onClose}>
          <Text>Close reschedule</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@/components/dashboard/SessionDetailsModal", () => ({
  SessionDetailsModal: ({
    visible,
    session,
    onCancelSession,
    onReschedule,
  }: {
    visible: boolean;
    session: { user?: string } | null;
    onCancelSession?: () => void;
    onReschedule?: () => void;
  }) => {
    if (!visible) return null;
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    return (
      <View testID="session-details-modal">
        <Text>{session?.user}</Text>
        <TouchableOpacity testID="cancel-session" onPress={onCancelSession}>
          <Text>Cancel session</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="reschedule-session" onPress={onReschedule}>
          <Text>Reschedule session</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@/components/dashboard/SessionCard", () => ({
  SessionCard: ({
    user,
    title,
    subtitle,
    kindLabel,
    onPress,
  }: {
    user: string;
    title?: string;
    subtitle?: string;
    kindLabel?: string;
    onPress?: () => void;
  }) => {
    const { Text, TouchableOpacity } = jest.requireActual("react-native");
    return (
      <TouchableOpacity testID={`session-card-${user}`} onPress={onPress}>
        <Text>{title ?? user}</Text>
        {subtitle ? <Text>{subtitle}</Text> : null}
        {kindLabel ? <Text>{kindLabel}</Text> : null}
      </TouchableOpacity>
    );
  },
}));

jest.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({
    success: mockToastSuccess,
  }),
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      user: {
        username: "student",
        app_usage_mode: "MENTEE",
        is_email_verified: mockIsEmailVerified,
      },
    }),
}));

jest.mock("@/lib/queries/auth", () => ({
  useResendEmailVerificationMutation: () => ({
    mutateAsync: mockResendMutateAsync,
    isPending: false,
  }),
}));

jest.mock("@/lib/queries/mentorship", () => {
  const actual = jest.requireActual<Record<string, unknown>>(
    "@/lib/queries/mentorship",
  );
  return {
    ...actual,
    mapRequestsToDashboard: () => mockMappedRequests,
    mapMeetingSessionsToDashboard: () => mockMappedSessions,
    useMentorshipRequestsQuery: () => ({
      data: mockMappedRequests.length > 0 ? [{}] : [],
      isError: mockRequestsIsError,
      refetch: mockRequestsRefetch,
    }),
    useMentorshipMatchesQuery: () => ({
      data: mockMatches,
      isLoading: false,
      isError: false,
      refetch: mockMatchesRefetch,
    }),
    useMentorshipMeetingSessionsQuery: () => ({
      data: mockMappedSessions,
      isError: mockSessionsIsError,
      refetch: mockSessionsRefetch,
    }),
    useRespondToMentorshipRequestMutation: () => ({
      mutateAsync: mockRespondMutateAsync,
      isPending: false,
    }),
    useCancelSessionMutation: () => ({
      mutateAsync: mockCancelMutateAsync,
      isPending: false,
    }),
    useRescheduleSessionMutation: () => ({
      mutateAsync: mockRescheduleMutateAsync,
      isPending: false,
    }),
    useAvailabilitySlotsQuery: () => ({
      data: [],
      isLoading: false,
    }),
  };
});

jest.mock("@/lib/queries/workshops", () => ({
  mapWorkshopAttendanceToDashboard: () => mockMappedWorkshops,
  useMyWorkshopAttendanceQuery: () => ({
    data: { results: mockMappedWorkshops },
    isError: mockWorkshopsIsError,
    refetch: jest.fn(),
  }),
}));

describe("DashboardScreen session navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEmailVerified = true;
    mockMappedRequests = [];
    mockMappedSessions = [defaultSession];
    mockMappedWorkshops = [];
    mockMatches = [];
    mockRequestsIsError = false;
    mockSessionsIsError = false;
    mockWorkshopsIsError = false;
    mockResendMutateAsync.mockResolvedValue({
      detail: "If your email is unverified, a new verification link has been sent.",
    });
    mockRespondMutateAsync.mockResolvedValue({});
    mockCancelMutateAsync.mockResolvedValue({});
    mockRescheduleMutateAsync.mockResolvedValue({});
  });

  it("opens the hidden schedule tab route from Your Sessions View All", () => {
    const { getByText } = render(<DashboardScreen />);

    fireEvent.press(getByText("View All (1)"));

    expect(mockPush).toHaveBeenCalledWith("/(tabs)/schedule");
  });

  it("warns unverified users and resends verification email on request", async () => {
    mockIsEmailVerified = false;
    const { findByText, getByTestId, queryByText } = render(<DashboardScreen />);

    expect(await findByText("Verify your email")).toBeTruthy();

    fireEvent.press(getByTestId("resend-verification-button"));

    await waitFor(() => {
      expect(mockResendMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "If your email is unverified, a new verification link has been sent.",
      );
    });
    expect(
      queryByText(
        "If your email is unverified, a new verification link has been sent.",
      ),
    ).toBeNull();
  });

  it("shows request query errors", () => {
    mockRequestsIsError = true;

    const { getByText } = render(<DashboardScreen />);

    expect(getByText("Failed to load mentorship requests.")).toBeTruthy();
  });

  it("shows the empty session state when no sessions exist", () => {
    mockMappedSessions = [];

    const { getByText } = render(<DashboardScreen />);

    expect(getByText("No upcoming sessions or workshops yet.")).toBeTruthy();
  });

  it("navigates to connections from pending requests View All", () => {
    const { getByText } = render(<DashboardScreen />);

    fireEvent.press(getByText("View All"));

    expect(mockPush).toHaveBeenCalledWith("/(tabs)/connections");
  });

  it("supports pull to refresh on the dashboard", async () => {
    const { UNSAFE_getAllByType } = render(<DashboardScreen />);

    const [dashboardScrollView] = UNSAFE_getAllByType(ScrollView);
    const refreshControl = dashboardScrollView.props.refreshControl;

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockRequestsRefetch).toHaveBeenCalled();
    expect(mockSessionsRefetch).toHaveBeenCalled();
    expect(mockMatchesRefetch).toHaveBeenCalled();
  });

  it("renders workshops inline with sessions and opens workshop detail", () => {
    mockMappedWorkshops = [
      {
        id: "workshop-1",
        workshopId: "workshop-1",
        communityId: "tag-1",
        communityName: "AI Lab",
        user: "Mentor AI",
        date: "Jun 10",
        rawDate: "2099-06-10",
        time: "13:30 - 15:00",
        status: "Upcoming",
        topic: "Prompt Engineering 101",
        myRole: "Mentee",
        isWorkshop: true,
        workshopStatus: "SCHEDULED",
      },
    ];

    const { getByTestId, getByText } = render(<DashboardScreen />);

    expect(getByText("Prompt Engineering 101")).toBeTruthy();
    expect(getByText("Workshop")).toBeTruthy();

    fireEvent.press(getByTestId("session-card-Mentor AI"));

    expect(mockPush).toHaveBeenCalledWith(
      "/(tabs)/community/tag-1/workshops/workshop-1?from=dashboard",
    );
  });

  it("accepts and rejects pending requests from dashboard cards", async () => {
    mockMappedRequests = [defaultRequest];

    const { getByTestId, queryByText } = render(<DashboardScreen />);

    fireEvent.press(getByTestId("request-accept-Grace Hopper"));

    await waitFor(() => {
      expect(mockRespondMutateAsync).toHaveBeenCalledWith({
        requestId: "request-1",
        action: "accept",
      });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Request accepted successfully.",
    );
    expect(queryByText("Request accepted successfully.")).toBeNull();

    fireEvent.press(getByTestId("request-decline-Grace Hopper"));

    await waitFor(() => {
      expect(mockRespondMutateAsync).toHaveBeenLastCalledWith({
        requestId: "request-1",
        action: "reject",
      });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Request rejected successfully.",
    );
    expect(queryByText("Request rejected successfully.")).toBeNull();
  });

  it("opens request details and navigates to requester profile", async () => {
    mockMappedRequests = [defaultRequest];

    const { getByTestId } = render(<DashboardScreen />);

    fireEvent.press(getByTestId("request-card-Grace Hopper"));
    expect(getByTestId("request-detail-sheet")).toBeTruthy();

    fireEvent.press(getByTestId("detail-profile"));

    expect(mockPush).toHaveBeenCalledWith("/user/grace");
  });

  it("shows request action errors", async () => {
    mockMappedRequests = [defaultRequest];
    mockRespondMutateAsync.mockRejectedValueOnce(new Error("Request failed."));

    const { getByTestId, findByText } = render(<DashboardScreen />);

    fireEvent.press(getByTestId("request-accept-Grace Hopper"));

    expect(await findByText("Request failed.")).toBeTruthy();
  });

  it("cancels selected sessions", async () => {
    const { getByTestId, queryByText } = render(<DashboardScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(getByTestId("cancel-session"));

    await waitFor(() => {
      expect(mockCancelMutateAsync).toHaveBeenCalledWith("session-1");
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("The session was cancelled.");
    expect(queryByText("The session was cancelled.")).toBeNull();
  });

  it("shows cancellation errors", async () => {
    mockCancelMutateAsync.mockRejectedValueOnce(new Error("Cancel failed."));
    const { getByTestId, findByText } = render(<DashboardScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(getByTestId("cancel-session"));

    expect(await findByText("Cancel failed.")).toBeTruthy();
  });

  it("reschedules selected mentee sessions", async () => {
    const { getByTestId, queryByText } = render(<DashboardScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(getByTestId("reschedule-session"));
    fireEvent.press(getByTestId("reschedule-select-slot"));

    await waitFor(() => {
      expect(mockRescheduleMutateAsync).toHaveBeenCalledWith({
        sessionId: "session-1",
        newSlotId: "slot-2",
        mentorUsername: "mentor_ada",
      });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Your session was updated.");
    expect(queryByText("Your session was updated.")).toBeNull();
  });

  it("blocks rescheduling when the selected user is not a mentee", async () => {
    mockMappedSessions = [{ ...defaultSession, myRole: "Mentor" }];
    const { getByTestId, findByText } = render(<DashboardScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(getByTestId("reschedule-session"));

    expect(await findByText("Only mentees can reschedule sessions.")).toBeTruthy();
  });

  it("shows reschedule errors", async () => {
    mockRescheduleMutateAsync.mockRejectedValueOnce(
      new Error("Reschedule failed."),
    );
    const { getByTestId, findByText } = render(<DashboardScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(getByTestId("reschedule-session"));
    fireEvent.press(getByTestId("reschedule-select-slot"));

    expect(await findByText("Reschedule failed.")).toBeTruthy();
  });
});
