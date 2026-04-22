import ProfileScreen from "@/app/(tabs)/profile";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

const mockMatchesQuery = jest.fn();
const mockAvailabilityQuery = jest.fn();
let mockAuthUser = {
  username: "Ali Aydin",
  app_usage_mode: "MENTOR",
};

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));
jest.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));

jest.mock("@/lib/queries/mentorship", () => {
  const actual = jest.requireActual<Record<string, unknown>>(
    "@/lib/queries/mentorship",
  );
  return {
    ...actual,
    useAvailabilitySlotsQuery: () => mockAvailabilityQuery(),
    useMentorshipMatchesQuery: () => mockMatchesQuery(),
    useMentorshipRequestsQuery: () => ({ data: [] }),
    useCreateAvailabilitySlotMutation: () => ({
      mutateAsync: jest.fn(),
      isPending: false,
    }),
    useDeleteAvailabilitySlotMutation: () => ({
      mutateAsync: jest.fn(),
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
      user: mockAuthUser,
    }),
}));

jest.mock("@/lib/queries/profile", () => ({
  useProfileRatingQuery: () => ({
    data: {
      average_rating: "4.9",
      review_count: 18,
    },
  }),
  useUpdateOwnProfileMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.spyOn(Alert, "alert");

describe("ProfileScreen Layout", () => {
  beforeEach(() => {
    mockAuthUser = {
      username: "Ali Aydin",
      app_usage_mode: "MENTOR",
    };
    mockAvailabilityQuery.mockReturnValue({ data: undefined });
    mockMatchesQuery.mockReturnValue({ data: [] });
    mockRouterPush.mockClear();
    (Alert.alert as jest.Mock).mockClear?.();

    (globalThis.fetch as jest.Mock) = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          full_name: "Ali Aydin",
          bio: "Profile bio",
          skills: ["React", "Testing"],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: "React" }, { name: "Testing" }],
      });
  });

  it("renders the user profile name", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("profile-name")).toBeTruthy();
    });
  });

  it("shows mentees section for mentor with active unique matches", async () => {
    mockMatchesQuery.mockReturnValue({
      data: [
        { id: "m-1", is_active: true, mentee: { username: "mentee-1" } },
        { id: "m-2", is_active: true, mentee: { username: "mentee-1" } },
        { id: "m-3", is_active: true, mentee: { username: "mentee-2" } },
        { id: "m-4", is_active: false, mentee: { username: "mentee-3" } },
      ],
    });

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("mentees-section")).toBeTruthy();
      expect(getByTestId("mentees-count").props.children).toBe(2);
    });
  });

  it("renders mentor-only sections for mentor accounts", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("mentees-section")).toBeTruthy();
      expect(getByTestId("edit-availability-button")).toBeTruthy();
    });
  });

  it("hides mentor-only sections for mentee accounts", async () => {
    mockAuthUser = {
      username: "Ece Yilmaz",
      app_usage_mode: "MENTEE",
    };

    const { queryByTestId, getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Ece Yilmaz")).toBeTruthy();
      expect(queryByTestId("mentees-section")).toBeNull();
      expect(queryByText("Mentees")).toBeNull();
      expect(queryByTestId("edit-availability-button")).toBeNull();
      expect(queryByText("Availability")).toBeNull();
    });
  });

  it("navigates to settings screen when the settings icon is pressed", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("settings-button")).toBeTruthy();
    });

    fireEvent.press(getByTestId("settings-button"));
    expect(mockRouterPush).toHaveBeenCalledWith("/settings");
  });

  it("does not crash when profile fetch fails", async () => {
    (globalThis.fetch as jest.Mock) = jest.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: "React" }],
      });

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("profile-name")).toBeTruthy();
    });
  });

  it("shows zero mentees count when matches data is empty", async () => {
    mockMatchesQuery.mockReturnValue({ data: [] });

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("mentees-count").props.children).toBe(0);
    });
  });

  it("counts only active matches for unique mentees", async () => {
    mockMatchesQuery.mockReturnValue({
      data: [
        { id: "m-1", is_active: true, mentee: { username: "mentee-a" } },
        { id: "m-2", is_active: false, mentee: { username: "mentee-b" } },
        { id: "m-3", is_active: true, mentee: { username: "mentee-a" } },
      ],
    });

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("mentees-count").props.children).toBe(1);
    });
  });
});