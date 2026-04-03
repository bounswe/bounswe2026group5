import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DiscoverScreen from "@/app/(tabs)/discover";
import {
  fetchDiscoverProfiles,
  fetchDiscoverSkills,
} from "@/lib/discover/client";

const mockPush = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@/lib/discover/client", () => ({
  fetchDiscoverProfiles: jest.fn(),
  fetchDiscoverSkills: jest.fn(),
}));

jest.mock("@/components/discover/MentorCard", () => ({
  MentorCard: ({ profile, onPress }: any) => {
    const { Text, TouchableOpacity } = require("react-native");

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
    (fetchDiscoverProfiles as jest.Mock).mockResolvedValue({
      count: 2,
      page: 1,
      pageSize: 8,
      results: [
        {
          id: "mentor-1",
          username: "can-ozkan",
          full_name: "Can Ozkan",
          bio: "Supports code review and team planning.",
          hidden: false,
          picture_url: "",
          title: "Mobile Engineer",
          show_initials_only: false,
          expertises: ["Docker", "GraphQL"],
          rating: 5,
          total_mentee_count: 12,
        },
      ],
    });
    (fetchDiscoverSkills as jest.Mock).mockResolvedValue([
      { id: "skill-1", name: "Docker" },
      { id: "skill-2", name: "GraphQL" },
    ]);
  });

  it("renders mentors and navigates to the profile route", async () => {
    const { getByText, getByTestId } = render(<DiscoverScreen />);

    expect(getByText("Discover")).toBeTruthy();

    await waitFor(() => {
      expect(fetchDiscoverProfiles).toHaveBeenCalled();
      expect(fetchDiscoverSkills).toHaveBeenCalled();
      expect(getByText("Can Ozkan")).toBeTruthy();
    });

    expect(getByText("Load More")).toBeTruthy();

    fireEvent.press(getByTestId("mentor-card-can-ozkan"));

    expect(mockPush).toHaveBeenCalledWith("/mentor/can-ozkan");
  });
});
