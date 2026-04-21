import ScheduleScreen from "@/app/(tabs)/schedule";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { act } from "react-test-renderer";

const mockMeetingSessionsQuery = jest.fn();
const mockCancelSessionMutation = jest.fn();
const mockRescheduleSessionMutation = jest.fn();
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
    const { TouchableOpacity, View } = jest.requireActual("react-native");
    if (!visible) {
      return null;
    }

    return (
      <View testID="reschedule-sheet">
        <TouchableOpacity
          onPress={() => onSelectSlot("slot-2")}
          testID="reschedule-slot-option"
        />
      </View>
    );
  },
}));

jest.mock("@/components/dashboard/SessionCard", () => ({
  SessionCard: ({
    user,
    onPress,
  }: {
    user: string;
    onPress: () => void;
  }) => {
    const { TouchableOpacity } = jest.requireActual("react-native");
    return (
      <TouchableOpacity onPress={onPress} testID={`session-card-${user}`} />
    );
  },
}));

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

  it("opens SessionDetailsModal with cancel action when a session card is tapped", () => {
    jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
    const { getByTestId } = render(<ScheduleScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));

    expect(getByTestId("action-cancel")).toBeTruthy();
    expect(getByTestId("action-reschedule")).toBeTruthy();
  });

  it("closes the reschedule sheet after a successful reschedule", async () => {
    jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
    const { getByTestId, findByTestId, queryByTestId } = render(
      <ScheduleScreen />,
    );

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(await findByTestId("action-reschedule"));
    act(() => {
      jest.runAllTimers();
    });

    expect(getByTestId("reschedule-sheet")).toBeTruthy();

    fireEvent.press(getByTestId("reschedule-slot-option"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRescheduleSessionMutation).toHaveBeenCalledWith({
      sessionId: "session-1",
      newSlotId: "slot-2",
    });
    expect(queryByTestId("reschedule-sheet")).toBeNull();
  });

  it("shows alert when reschedule mutation fails", async () => {
    jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
    mockRescheduleSessionMutation.mockRejectedValue(
      new Error("Slot no longer available"),
    );

    const { getByTestId, findByTestId } = render(<ScheduleScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(await findByTestId("action-reschedule"));
    act(() => {
      jest.runAllTimers();
    });

    fireEvent.press(getByTestId("reschedule-slot-option"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Reschedule Failed",
      "Slot no longer available",
    );
  });

  it("shows alert when cancel session mutation fails", async () => {
    jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
    mockCancelSessionMutation.mockRejectedValue(
      new Error("Cancellation not allowed"),
    );

    const { getByTestId, findByTestId } = render(<ScheduleScreen />);

    fireEvent.press(getByTestId("session-card-Ada Lovelace"));
    fireEvent.press(await findByTestId("action-cancel"));

    // The cancel button shows a confirmation dialog — simulate the user confirming
    const alertMock = Alert.alert as jest.Mock;
    const confirmationButtons = alertMock.mock.calls[0][2] as Array<{
      style?: string;
      onPress?: () => void;
    }>;
    const destructiveButton = confirmationButtons.find(
      (b) => b.style === "destructive",
    );
    await act(async () => {
      destructiveButton?.onPress?.();
      await Promise.resolve();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Cancellation Failed",
      "Cancellation not allowed",
    );
  });

  it("shows empty state when no sessions exist for selected date", () => {
    jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
    mockMeetingSessionsQuery.mockReturnValue({ data: [] });

    const { getByTestId } = render(<ScheduleScreen />);

    expect(getByTestId("empty-sessions-state")).toBeTruthy();
  });

  it("renders empty state when sessions data is undefined (loading)", () => {
    jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
    mockMeetingSessionsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getByTestId } = render(<ScheduleScreen />);

    expect(getByTestId("empty-sessions-state")).toBeTruthy();
  });
});