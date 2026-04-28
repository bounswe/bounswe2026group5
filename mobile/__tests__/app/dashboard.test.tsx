import DashboardScreen from "@/app/(tabs)/index";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

const mockPush = jest.fn();
const mockRequestsRefetch = jest.fn();
const mockSessionsRefetch = jest.fn();
const mockResendMutateAsync = jest.fn();
let mockIsEmailVerified: boolean | undefined = true;

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));

jest.mock("@/components/connections/PendingRequestCard", () => ({
  PendingRequestCard: () => null,
}));

jest.mock("@/components/connections/RequestDetailSheet", () => ({
  RequestDetailSheet: () => null,
}));

jest.mock("@/components/dashboard/RescheduleBottomSheet", () => ({
  RescheduleBottomSheet: () => null,
}));

jest.mock("@/components/dashboard/SessionDetailsModal", () => ({
  SessionDetailsModal: () => null,
}));

jest.mock("@/components/dashboard/SessionCard", () => ({
  SessionCard: ({ user }: { user: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{user}</Text>;
  },
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
    useMentorshipRequestsQuery: () => ({
      data: [],
      isError: false,
      refetch: mockRequestsRefetch,
    }),
    useMentorshipMeetingSessionsQuery: () => ({
      data: [
        {
          session_id: "session-1",
          match_id: "match-1",
          source_slot_id: "slot-1",
          mentor: {
            id: "mentor-1",
            username: "mentor_ada",
            display_name: "Ada Lovelace",
          },
          mentee: {
            id: "mentee-1",
            username: "student",
            display_name: "Student",
          },
          scheduled_start_at: "2026-04-20T09:00:00Z",
          scheduled_end_at: "2026-04-20T10:00:00Z",
          status: "SCHEDULED",
          display_status: "SCHEDULED",
          my_role: "MENTEE",
          allowed_actions: ["cancel", "reschedule"],
          canceled_by_role: null,
          cancel_reason: "",
          created_at: "2026-04-19T09:00:00Z",
          updated_at: "2026-04-19T09:00:00Z",
        },
      ],
      isError: false,
      refetch: mockSessionsRefetch,
    }),
    useRespondToMentorshipRequestMutation: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
    }),
    useCancelSessionMutation: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
    }),
    useRescheduleSessionMutation: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
    }),
    useAvailabilitySlotsQuery: () => ({
      data: [],
      isLoading: false,
    }),
  };
});

describe("DashboardScreen session navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEmailVerified = true;
    mockResendMutateAsync.mockResolvedValue({
      detail: "If your email is unverified, a new verification link has been sent.",
    });
  });

  it("opens the hidden schedule tab route from Your Sessions View All", () => {
    const { getByText } = render(<DashboardScreen />);

    fireEvent.press(getByText("View All (1)"));

    expect(mockPush).toHaveBeenCalledWith("/(tabs)/schedule");
  });

  it("warns unverified users and resends verification email on request", async () => {
    mockIsEmailVerified = false;
    const { findByText, getByTestId } = render(<DashboardScreen />);

    expect(await findByText("Verify your email")).toBeTruthy();

    fireEvent.press(getByTestId("resend-verification-button"));

    expect(mockResendMutateAsync).toHaveBeenCalledTimes(1);
    expect(
      await findByText(
        "If your email is unverified, a new verification link has been sent.",
      ),
    ).toBeTruthy();
  });
});
