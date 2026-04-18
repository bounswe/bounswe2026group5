import ScheduleScreen from "@/app/(tabs)/schedule";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";
import { act } from "react-test-renderer";

const mockMeetingSessionsQuery = jest.fn();
const mockCancelSessionMutation = jest.fn();
const mockRescheduleSessionMutation = jest.fn();
const mockSubmitFeedbackMutation = jest.fn();
const mockAvailabilitySlotsQuery = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));
jest.mock("react-native-calendars", () => ({ Calendar: "View" }));
jest.mock("@/components/dashboard/RescheduleBottomSheet", () => ({
  RescheduleBottomSheet: ({
    visible,
    onSelectSlot,
  }: {
    visible: boolean;
    onSelectSlot: (slotId: string) => void;
  }) => {
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");
    if (!visible) {
      return null;
    }

    return (
      <View>
        <Text>Reschedule Session</Text>
        <TouchableOpacity
          onPress={() => onSelectSlot("slot-2")}
          testID="reschedule-slot-option"
        >
          <Text>Select alternate slot</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

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
    useMentorshipMeetingSessionsQuery: () => mockMeetingSessionsQuery(),
    useAvailabilitySlotsQuery: () => mockAvailabilitySlotsQuery(),
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
    mockAvailabilitySlotsQuery.mockReturnValue({
      data: [
        {
          id: "slot-2",
          date: today,
          startTime: "11:00:00",
          endTime: "12:00:00",
          is_booked: false,
        },
      ],
      isLoading: false,
    });
    mockRescheduleSessionMutation.mockResolvedValue({});
    mockMeetingSessionsQuery.mockReturnValue({
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
          scheduled_start_at: `${today}T09:00:00`,
          scheduled_end_at: `${today}T10:00:00`,
          status: "SCHEDULED",
          display_status: "SCHEDULED",
          my_role: "MENTEE",
          allowed_actions: ["cancel", "reschedule"],
          canceled_by_role: null,
          cancel_reason: "",
          created_at: `${today}T08:00:00`,
          updated_at: `${today}T08:00:00`,
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
    jest.setSystemTime(new Date(2026, 3, 17, 12, 0, 0));
    mockMeetingSessionsQuery.mockReturnValue({
      data: [
        {
          session_id: "session-past",
          match_id: "match-past",
          source_slot_id: "slot-past",
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
          scheduled_start_at: `${today}T09:00:00`,
          scheduled_end_at: `${today}T10:00:00`,
          status: "COMPLETED",
          display_status: "COMPLETED",
          my_role: "MENTEE",
          allowed_actions: [],
          canceled_by_role: null,
          cancel_reason: "",
          created_at: `${today}T08:00:00`,
          updated_at: `${today}T08:00:00`,
        },
      ],
    });

    const { getByTestId, findByText, queryByText } = render(<ScheduleScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(await findByText("Leave Feedback"));
    act(() => {
      jest.runAllTimers();
    });

    // Session details modal should close after selecting feedback.
    expect(queryByText("Leave Feedback")).toBeNull();
  });

  it("closes the reschedule sheet after a successful reschedule", async () => {
    jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
    const { getByTestId, findByText, queryByText } = render(<ScheduleScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(await findByText("Reschedule"));
    act(() => {
      jest.runAllTimers();
    });

    expect(queryByText("Reschedule Session")).toBeTruthy();

    fireEvent.press(getByTestId("reschedule-slot-option"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRescheduleSessionMutation).toHaveBeenCalledWith({
      sessionId: "session-1",
      newSlotId: "slot-2",
    });
    expect(queryByText("Reschedule Session")).toBeNull();
  });
});
