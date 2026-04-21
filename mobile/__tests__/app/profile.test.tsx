import ProfileScreen from "@/app/(tabs)/profile";
import { render, waitFor } from "@testing-library/react-native";
import React from "react";

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

// We must mock expo-router because the Settings icon uses router.push()
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe("ProfileScreen Layout", () => {
  beforeEach(() => {
    mockAuthUser = {
      username: "Ali Aydin",
      app_usage_mode: "MENTOR",
    };
    mockAvailabilityQuery.mockReturnValue({ data: undefined });
    mockMatchesQuery.mockReturnValue({ data: [] });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        full_name: "Ali Aydin",
        bio: "Profile bio",
        skills: ["React", "Testing"],
      }),
    }) as unknown as typeof fetch;

    (globalThis.fetch as jest.Mock)
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

  it("renders the user profile data and section headers", async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Profile")).toBeTruthy();
      expect(getByText("Ali Aydin")).toBeTruthy();
    });
  });

  it("shows mentee count from active unique matches", async () => {
    mockMatchesQuery.mockReturnValue({
      data: [
        {
          id: "m-1",
          is_active: true,
          mentee: { username: "mentee-1" },
        },
        {
          id: "m-2",
          is_active: true,
          mentee: { username: "mentee-1" },
        },
        {
          id: "m-3",
          is_active: true,
          mentee: { username: "mentee-2" },
        },
        {
          id: "m-4",
          is_active: false,
          mentee: { username: "mentee-3" },
        },
      ],
    });

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("2")).toBeTruthy();
      expect(getByText("Mentees")).toBeTruthy();
    });
  });

  it("renders mentor-only profile sections for mentor accounts", async () => {
    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Ali Aydin")).toBeTruthy();
      expect(getByText("Availability")).toBeTruthy();
      expect(getByText("Mentees")).toBeTruthy();
    });
  });

  it("hides mentor-only profile sections for mentee accounts", async () => {
    mockAuthUser = {
      username: "Ece Yilmaz",
      app_usage_mode: "MENTEE",
    };

    const { getByText, queryByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Ece Yilmaz")).toBeTruthy();
      expect(queryByText("Availability")).toBeNull();
      expect(queryByText("Mentees")).toBeNull();
    });
  });
});
