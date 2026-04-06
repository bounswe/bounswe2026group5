import React from "react";
import { render } from "@testing-library/react-native";
import ScheduleScreen from "@/app/(tabs)/schedule";

// 1. Mock icons
jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

// 2. Mock the heavy calendar component so Jest doesn't choke on it
jest.mock("react-native-calendars", () => {
  return {
    Calendar: "View", // Replace the complex calendar with a simple empty view for the test
  };
});

jest.mock("@/lib/queries/mentorship", () => {
  const actual = jest.requireActual("@/lib/queries/mentorship");
  return {
    ...actual,
    useMentorshipRequestsQuery: jest.fn(() => ({ data: [] })),
    useMentorshipMatchesQuery: jest.fn(() => ({ data: [] })),
    useMentorshipUpcomingSessionsQuery: jest.fn(() => ({ data: [] })),
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
  it("renders the page headers correctly", () => {
    const { getByText } = render(<ScheduleScreen />);

    // Check that our static page text is rendering safely
    expect(getByText("Schedule")).toBeTruthy();
    expect(getByText("Manage your agenda.")).toBeTruthy();
  });
});
