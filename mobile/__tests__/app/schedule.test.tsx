import ScheduleScreen from "@/app/(tabs)/schedule";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

const mockMentorshipRequestsQuery = jest.fn();
const mockMentorshipMatchesQuery = jest.fn();
const mockMentorshipUpcomingSessionsQuery = jest.fn();
const mockCancelSessionMutation = jest.fn();
const mockRescheduleSessionMutation = jest.fn();
const mockSubmitFeedbackMutation = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));
jest.mock("react-native-calendars", () => ({ Calendar: "View" }));

jest.mock("@/components/dashboard/SessionCard", () => ({
  SessionCard: ({
    user,
    time,
    onPress,
  }: {
    user: string;
    time: string;
    onPress: () => void;
  }) => {
    const { Text, TouchableOpacity } = jest.requireActual("react-native");
    return (
      <TouchableOpacity onPress={onPress} testID={`session-card-${user}`}>
        <Text>{user}</Text>
        <Text>{time}</Text>
      </TouchableOpacity>
    );
  },
}));

// ADDED THE MISSING MUTATIONS HERE
jest.mock("@/lib/queries/mentorship", () => {
  const actual = jest.requireActual<Record<string, unknown>>(
    "@/lib/queries/mentorship",
  );
  return {
    ...actual,
    useMentorshipRequestsQuery: () => mockMentorshipRequestsQuery(),
    useMentorshipMatchesQuery: () => mockMentorshipMatchesQuery(),
    useMentorshipUpcomingSessionsQuery: () =>
      mockMentorshipUpcomingSessionsQuery(),
    useAvailabilitySlotsQuery: () => ({ data: [], isLoading: false }), // Added
    useCancelSessionMutation: () => ({
      mutateAsync: mockCancelSessionMutation,
      isPending: false,
    }),
    useRescheduleSessionMutation: () => ({
      mutateAsync: mockRescheduleSessionMutation,
      isPending: false,
    }),
    useSubmitMatchFeedbackMutation: () => ({
      mutateAsync: mockSubmitFeedbackMutation,
      isPending: false,
    }),
    useRespondToMentorshipRequestMutation: () => ({
      // <-- THIS WAS MISSING
      mutateAsync: jest.fn(),
      isPending: false,
    }),
  };
});

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      user: {
        username: "student",
        app_usage_mode: "MENTEE",
      },
    }),
}));

jest.spyOn(Alert, "alert");

describe("ScheduleScreen", () => {
  const today = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockMentorshipRequestsQuery.mockReturnValue({ data: [] });
    mockMentorshipMatchesQuery.mockReturnValue({ data: [] });

    mockMentorshipUpcomingSessionsQuery.mockReturnValue({
      data: [
        {
          slot_id: "slot-1",
          mentor: {
            id: "mentor-1",
            username: "mentor_ada",
            display_name: "Ada Lovelace",
          },
          slot_date: today,
          slot_start_time: "09:00:00",
          slot_end_time: "10:00:00",
          status: "ACCEPTED",
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders page headers correctly", () => {
    jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
    const { getByText } = render(<ScheduleScreen />);
    expect(getByText("Schedule")).toBeTruthy();
    expect(getByText(/Sessions on/i)).toBeTruthy();
  });

  it("opens SessionDetailsModal when a session card is tapped", () => {
    jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
    const { getByTestId, getByText } = render(<ScheduleScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));

    expect(getByText("with Ada Lovelace")).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
  });

  it("handles the Leave Feedback transition from the modal", async () => {
    jest.setSystemTime(new Date(2026, 3, 15, 12, 0, 0));
    mockMentorshipUpcomingSessionsQuery.mockReturnValue({
      data: [
        {
          slot_id: "slot-past",
          mentor: { username: "mentor_ada", display_name: "Ada Lovelace" },
          slot_date: today,
          slot_start_time: "09:00:00",
          slot_end_time: "10:00:00",
          status: "ACCEPTED",
        },
      ],
    });

    const { getByTestId, findByText, queryByText } = render(<ScheduleScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(await findByText("Leave Feedback"));
    jest.runAllTimers();

    // Session details modal should close after selecting feedback.
    expect(queryByText("Leave Feedback")).toBeNull();
  });
});
