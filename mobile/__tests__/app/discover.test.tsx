import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import DiscoverScreen from "@/app/(tabs)/discover";
import {
  fetchDiscoverProfiles,
  fetchDiscoverPopularProfiles,
  fetchDiscoverRecentlyAddedProfiles,
  fetchDiscoverSkills,
} from "@/lib/discover/client";
import {
  fetchCommunityTags,
  fetchPopularCommunityTags,
} from "@/lib/queries/communityTags";

const mockPush = jest.fn();
const mockAddListener: jest.Mock = jest.fn(() => jest.fn());

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
    addListener: mockAddListener,
  }),
}));

jest.mock("@/lib/discover/client", () => ({
  fetchDiscoverProfiles: jest.fn(),
  fetchDiscoverPopularProfiles: jest.fn(),
  fetchDiscoverRecentlyAddedProfiles: jest.fn(),
  fetchDiscoverSkills: jest.fn(),
}));

jest.mock("@/lib/queries/communityTags", () => ({
  fetchCommunityTags: jest.fn(),
  fetchPopularCommunityTags: jest.fn(),
}));

jest.mock("@/components/discover/MentorCard", () => ({
  MentorCard: ({ profile, onPress }: any) => {
    const { TouchableOpacity } = jest.requireActual("react-native");

    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => onPress?.(profile)}
        testID={`mentor-card-${profile.username}`}
      />
    );
  },
}));

jest.mock("@/components/discover/DiscoverFilterModal", () => ({
  DiscoverFilterModal: ({
    visible,
    communityTags,
    selectedCommunityTags,
    selectedDistanceKm,
    onToggleCommunityTag,
    onSelectDistanceKm,
    onClear,
    onApply,
  }: any) => {
    const React = require("react");
    const { Text, TouchableOpacity, View } = jest.requireActual("react-native");

    if (!visible) {
      return null;
    }

    return (
      <View testID="discover-filter-modal">
        {communityTags.map((tag: any) => (
          <TouchableOpacity
            key={tag.id}
            testID={`community-filter-${tag.slug}`}
            onPress={() => onToggleCommunityTag(tag.slug)}
          >
            <Text>
              {selectedCommunityTags.has(tag.slug) ? "Selected " : ""}
              {tag.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          testID="distance-filter-15"
          onPress={() => onSelectDistanceKm(15)}
        >
          <Text>{selectedDistanceKm === 15 ? "Selected 15 km" : "15 km"}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="filter-clear-button" onPress={onClear} />
        <TouchableOpacity testID="filter-apply-button" onPress={onApply} />
      </View>
    );
  },
}));

describe("DiscoverScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue(jest.fn());
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
        average_rating: "5.00",
        total_mentee_count: 12,
      })),
    );
    (fetchDiscoverRecentlyAddedProfiles as jest.Mock).mockResolvedValue([]);
    (fetchDiscoverProfiles as jest.Mock).mockResolvedValue({
      count: 1,
      page: 1,
      pageSize: 8,
      results: [
        {
          id: "mentor-filtered",
          username: "filtered-mentor",
          full_name: "Filtered Mentor",
          bio: "Supports backend communities.",
          hidden: false,
          picture_url: "",
          title: "Backend Mentor",
          show_initials_only: false,
          skills: ["Django"],
          average_rating: "5.00",
          total_mentee_count: 4,
        },
      ],
    });
    (fetchCommunityTags as jest.Mock).mockResolvedValue({
      count: 1,
      page: 1,
      pageSize: 8,
      results: [
        {
          id: "tag-1",
          name: "Backend Guild",
          slug: "backend-guild",
          description: "API design and Django patterns",
          member_count: 0,
          created_at: "2026-04-20T00:00:00Z",
        },
      ],
    });
    (fetchPopularCommunityTags as jest.Mock).mockResolvedValue([
      {
        id: "tag-1",
        name: "Backend Guild",
        slug: "backend-guild",
        description: "API design and Django patterns",
        member_count: 12,
        created_at: "2026-04-20T00:00:00Z",
      },
    ]);
    (fetchDiscoverSkills as jest.Mock).mockResolvedValue([
      { id: "skill-1", name: "Docker" },
      { id: "skill-2", name: "GraphQL" },
    ]);
  });

  it("renders mentors and navigates to the profile route on press", async () => {
    const { getByTestId } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(fetchDiscoverPopularProfiles).toHaveBeenCalled();
      expect(getByTestId("mentor-card-can-ozkan")).toBeTruthy();
    });

    expect(getByTestId("load-more-button")).toBeTruthy();

    fireEvent.press(getByTestId("mentor-card-can-ozkan"));
    expect(mockPush).toHaveBeenCalledWith("/user/can-ozkan");
  });

  it("switches mentor sort through the sort bottom sheet and can clear it", async () => {
    const { getByTestId, queryByText } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(fetchDiscoverPopularProfiles).toHaveBeenCalledWith(8);
    });

    fireEvent.press(getByTestId("sort-button"));
    expect(queryByText("Search Mode")).toBeNull();
    expect(getByTestId("sort-option-recent")).toBeTruthy();
    fireEvent.press(getByTestId("sort-option-recent"));
    expect(fetchDiscoverRecentlyAddedProfiles).not.toHaveBeenCalled();
    fireEvent.press(getByTestId("sort-apply-button"));

    await waitFor(() => {
      expect(fetchDiscoverRecentlyAddedProfiles).toHaveBeenCalledWith(8);
    });

    fireEvent.press(getByTestId("sort-button"));
    fireEvent.press(getByTestId("sort-clear-button"));
    fireEvent.press(getByTestId("sort-apply-button"));

    await waitFor(() => {
      expect(fetchDiscoverPopularProfiles).toHaveBeenLastCalledWith(8);
    });
  });

  it("filters mentors by selected community tags", async () => {
    const { getByTestId } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(fetchDiscoverPopularProfiles).toHaveBeenCalledWith(8);
    });

    fireEvent.press(getByTestId("filter-button"));

    await waitFor(() => {
      expect(fetchPopularCommunityTags).toHaveBeenCalledWith({ limit: 20 });
      expect(getByTestId("community-filter-backend-guild")).toBeTruthy();
    });

    fireEvent.press(getByTestId("community-filter-backend-guild"));
    expect(fetchDiscoverProfiles).not.toHaveBeenCalled();
    fireEvent.press(getByTestId("filter-apply-button"));

    await waitFor(() => {
      expect(fetchDiscoverProfiles).toHaveBeenCalledWith({
        page: 1,
        pageSize: 8,
        query: "",
        skills: [],
        tags: ["backend-guild"],
      });
      expect(getByTestId("mentor-card-filtered-mentor")).toBeTruthy();
    });

    fireEvent.press(getByTestId("filter-button"));
    fireEvent.press(getByTestId("filter-clear-button"));
    expect(fetchDiscoverPopularProfiles).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId("filter-apply-button"));

    await waitFor(() => {
      expect(fetchDiscoverPopularProfiles).toHaveBeenLastCalledWith(8);
    });
  });

  it("filters mentors by selected distance radius", async () => {
    const { getByTestId } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(fetchDiscoverPopularProfiles).toHaveBeenCalledWith(8);
    });

    fireEvent.press(getByTestId("filter-button"));
    fireEvent.press(getByTestId("distance-filter-15"));
    fireEvent.press(getByTestId("filter-apply-button"));

    await waitFor(() => {
      expect(fetchDiscoverProfiles).toHaveBeenCalledWith({
        page: 1,
        pageSize: 8,
        query: "",
        skills: [],
        tags: [],
        distanceKm: 15,
      });
    });
  });

  it("loads community results from the Communities tab", async () => {
    const { getByTestId } = render(<DiscoverScreen />);

    fireEvent.press(getByTestId("communities-tab"));

    await waitFor(() => {
      expect(fetchCommunityTags).toHaveBeenCalledWith({
        page: 1,
        pageSize: 8,
        query: "",
      });
      expect(getByTestId("community-result-backend-guild")).toBeTruthy();
    });

    expect(getByTestId("filter-button").props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(getByTestId("sort-button"));
    expect(getByTestId("sort-option-all")).toBeTruthy();

    fireEvent.press(getByTestId("community-result-backend-guild"));
    expect(mockPush).toHaveBeenCalledWith(
      "/(tabs)/community/tag-1?from=discover",
    );
  });

  it("only loads popular communities after applying the Popular community sort", async () => {
    const { getByTestId } = render(<DiscoverScreen />);

    fireEvent.press(getByTestId("communities-tab"));

    await waitFor(() => {
      expect(fetchCommunityTags).toHaveBeenCalled();
    });
    expect(fetchPopularCommunityTags).not.toHaveBeenCalled();

    fireEvent.press(getByTestId("sort-button"));
    fireEvent.press(getByTestId("sort-option-popular"));
    fireEvent.press(getByTestId("sort-apply-button"));

    await waitFor(() => {
      expect(fetchPopularCommunityTags).toHaveBeenCalledWith({ limit: 8 });
    });
  });

  it("refetches communities when returning to Discover while Communities tab is active", async () => {
    let tabPressHandler: (() => void) | undefined;
    mockAddListener.mockImplementation((_event: string, handler: () => void) => {
      tabPressHandler = handler;
      return jest.fn();
    });

    const { getByTestId } = render(<DiscoverScreen />);

    fireEvent.press(getByTestId("communities-tab"));

    await waitFor(() => {
      expect(fetchCommunityTags).toHaveBeenCalledTimes(1);
    });

    act(() => {
      tabPressHandler?.();
    });

    await waitFor(() => {
      expect(fetchCommunityTags).toHaveBeenCalledTimes(2);
    });
  });

  it("shows error state when profile query fails", async () => {
    (fetchDiscoverPopularProfiles as jest.Mock).mockRejectedValueOnce(
      new Error("Failed to load discovery profiles (500)"),
    );

    const { getByTestId } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(getByTestId("error-state")).toBeTruthy();
    });
  });

  it("shows empty state when backend returns no results", async () => {
    (fetchDiscoverPopularProfiles as jest.Mock).mockResolvedValueOnce([]);

    const { getByTestId } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(getByTestId("empty-state")).toBeTruthy();
    });
  });

  it("requests next page when pressing load more", async () => {
    (fetchDiscoverPopularProfiles as jest.Mock)
      .mockResolvedValueOnce(
        Array.from({ length: 8 }, (_, index) => ({
          id: `mentor-${index + 1}`,
          username: `mentor-${index + 1}`,
          full_name: `Mentor ${index + 1}`,
          bio: "Supports code review and team planning.",
          hidden: false,
          picture_url: "",
          title: "Mobile Engineer",
          show_initials_only: false,
          skills: ["Docker", "GraphQL"],
          average_rating: "5.00",
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
          average_rating: "4.80",
          total_mentee_count: 9,
        },
      ]);

    const { getByTestId } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(getByTestId("load-more-button")).toBeTruthy();
    });

    fireEvent.press(getByTestId("load-more-button"));

    await waitFor(() => {
      expect(fetchDiscoverPopularProfiles).toHaveBeenLastCalledWith(16);
    });
  });
});
