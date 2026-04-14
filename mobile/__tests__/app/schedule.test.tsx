import ScheduleScreen from "@/app/(tabs)/schedule";
import { render } from "@testing-library/react-native";
import React from "react";

const mockMentorshipRequestsQuery = jest.fn();
const mockMentorshipMatchesQuery = jest.fn();
const mockMentorshipUpcomingSessionsQuery = jest.fn();

// 1. Mock icons
jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

// 2. Mock the heavy calendar component so Jest doesn't choke on it
jest.mock("react-native-calendars", () => {
  return {
    Calendar: "View", // Replace the complex calendar with a simple empty view for the test
  };
});

jest.mock("@/components/dashboard/SessionCard", () => ({
  SessionCard: ({ user, time }: { user: string; time: string }) => {
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>{user}</Text>
        <Text>{time}</Text>
      </View>
    );
  },
}));

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
    useRespondToMentorshipRequestMutation: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
    }),
    useAvailabilitySlotsQuery: () => ({ data: [] }),
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

describe("ScheduleScreen Layout", () => {
  beforeEach(() => {
    mockMentorshipRequestsQuery.mockReturnValue({ data: [] });
    mockMentorshipMatchesQuery.mockReturnValue({ data: [] });
    mockMentorshipUpcomingSessionsQuery.mockReturnValue({ data: [] });
  });

  it("renders the page headers correctly", () => {
    const { getByText } = render(<ScheduleScreen />);

    // Check that our static page text is rendering safely
    expect(getByText("Schedule")).toBeTruthy();
    expect(getByText("Manage your agenda.")).toBeTruthy();
  });

  it("shows empty-state message when no sessions exist for selected day", () => {
    const { getByText } = render(<ScheduleScreen />);

    expect(getByText("No sessions scheduled for this day.")).toBeTruthy();
  });

  it("renders mapped upcoming sessions for mentee mode", () => {
    const today = new Date().toISOString().slice(0, 10);

    mockMentorshipUpcomingSessionsQuery.mockReturnValue({
      data: [
        {
          slot_id: "slot-1",
          mentor: {
            id: "mentor-1",
            username: "mentor_ada",
            display_name: "Ada Lovelace",
            picture_url: "",
            title: "Mentor",
          },
          slot_date: today,
          slot_start_time: "09:00:00",
          slot_end_time: "10:00:00",
          status: "ACCEPTED",
          booked_at: "2026-04-05T12:00:00Z",
        },
      ],
    });

    const { getByText } = render(<ScheduleScreen />);

    expect(getByText("Ada Lovelace")).toBeTruthy();
    expect(getByText("09:00 - 10:00")).toBeTruthy();
  });
});
