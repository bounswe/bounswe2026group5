import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import DiscoverScreen from "@/app/(tabs)/discover";
import {
  fetchDiscoverPopularProfiles,
  fetchDiscoverSkills,
} from "@/lib/discover/client";

const mockPush = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));
jest.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({
    addListener: jest.fn(() => jest.fn()),
  }),
}));

jest.mock("@/lib/discover/client", () => ({
  fetchDiscoverProfiles: jest.fn(),
  fetchDiscoverPopularProfiles: jest.fn(),
  fetchDiscoverRecentlyAddedProfiles: jest.fn(),
  fetchDiscoverSkills: jest.fn(),
}));

jest.mock("@/components/discover/MentorCard", () => ({
  MentorCard: ({ profile, onPress }: any) => {
    const { Text, TouchableOpacity } = jest.requireActual("react-native");

    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => onPress?.(profile)}
        testID={`mentor-card-${profile.username}`}
      >
        <Text>{profile.full_name}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock("@/components/discover/DiscoverFilterModal", () => ({
  DiscoverFilterModal: () => null,
}));

describe("DiscoverScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    (fetchDiscoverPopularProfiles as jest.Mock).mockResolvedValue(
      Array.from({ length: 8 }, (_, index) => ({
        id: `mentor-${index + 1}`,
        username: index === 0 ? "can-ozkan" : `mentor-${index + 1}`,
        full_name: index === 0 ? "Can Ozkan" : `Mentor ${index + 1}`,
        bio: "Supports code review and team planning.",
        hidden: false,
        picture_url: "",
        title: "Mobile Engineer",
        show_initials_only: false,
        skills: ["Docker", "GraphQL"],
        rating: 5,
        total_mentee_count: 12,
      })),
    );
    (fetchDiscoverSkills as jest.Mock).mockResolvedValue([
      { id: "skill-1", name: "Docker" },
      { id: "skill-2", name: "GraphQL" },
    ]);
  });

  it("renders mentors and navigates to the profile route", async () => {
    const { getByText, getByTestId } = render(<DiscoverScreen />);

    expect(getByText("Discover")).toBeTruthy();

    await waitFor(() => {
      expect(fetchDiscoverPopularProfiles).toHaveBeenCalled();
      expect(fetchDiscoverSkills).toHaveBeenCalled();
      expect(getByText("Can Ozkan")).toBeTruthy();
    });

    expect(getByText("Load More")).toBeTruthy();

    fireEvent.press(getByTestId("mentor-card-can-ozkan"));

    expect(mockPush).toHaveBeenCalledWith("/user/can-ozkan");
  });

  it("shows API error message when profile query fails", async () => {
    (fetchDiscoverPopularProfiles as jest.Mock).mockRejectedValueOnce(
      new Error("Failed to load discovery profiles (500)"),
    );

    const { getByText } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(getByText("Failed to load discovery profiles (500)")).toBeTruthy();
    });
  });

  it("shows demo preview message when backend returns empty results", async () => {
    (fetchDiscoverPopularProfiles as jest.Mock).mockResolvedValueOnce([]);

    const { getByText } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(
        getByText(
          "No matches found. Try adjusting your search or filter criteria to find more mentors.",
        ),
      ).toBeTruthy();
    });
  });

  it("requests next page when pressing load more", async () => {
    (fetchDiscoverPopularProfiles as jest.Mock)
      .mockResolvedValueOnce(
        Array.from({ length: 8 }, (_, index) => ({
          id: `mentor-${index + 1}`,
          username: index === 0 ? "can-ozkan" : `mentor-${index + 1}`,
          full_name: index === 0 ? "Can Ozkan" : `Mentor ${index + 1}`,
          bio: "Supports code review and team planning.",
          hidden: false,
          picture_url: "",
          title: "Mobile Engineer",
          show_initials_only: false,
          skills: ["Docker", "GraphQL"],
          rating: 5,
          total_mentee_count: 12,
        })),
      )
      .mockResolvedValueOnce([
        {
          id: "mentor-9",
          username: "elif-yildiz",
          full_name: "Elif Yildiz",
          bio: "Frontend and accessibility mentoring.",
          hidden: false,
          picture_url: "",
          title: "Frontend Engineer",
          show_initials_only: false,
          skills: ["React"],
          rating: 4.8,
          total_mentee_count: 9,
        },
      ]);

    const { getByText } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(getByText("Load More")).toBeTruthy();
    });

    fireEvent.press(getByText("Load More"));

    await waitFor(() => {
      expect(fetchDiscoverPopularProfiles).toHaveBeenLastCalledWith(16);
    });
  });
});
