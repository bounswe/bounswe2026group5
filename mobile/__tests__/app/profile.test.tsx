import ProfileScreen from "@/app/(tabs)/profile";
import { render } from "@testing-library/react-native";
import React from "react";

const mockMatchesQuery = jest.fn();
const mockAvailabilityQuery = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/queries/mentorship", () => {
  const actual = jest.requireActual<Record<string, unknown>>(
    "@/lib/queries/mentorship",
  );
  return {
    ...actual,
    useAvailabilitySlotsQuery: () => mockAvailabilityQuery(),
    useMentorshipMatchesQuery: () => mockMatchesQuery(),
  };
});

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: any) => unknown) =>
    selector({
      user: {
        username: "Ali Aydin",
        app_usage_mode: "BOTH",
      },
    }),
}));

jest.mock("@/lib/queries/profile", () => ({
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
    mockAvailabilityQuery.mockReturnValue({ data: undefined });
    mockMatchesQuery.mockReturnValue({ data: [] });
  });

  it("renders the user profile data and section headers", () => {
    const { getByText } = render(<ProfileScreen />);

    // Check page header
    expect(getByText("Profile")).toBeTruthy();

    // Check that the mock user data rendered
    expect(getByText("Ali Aydin")).toBeTruthy();

    // Check that the main sections rendered
    expect(getByText("Expertise")).toBeTruthy();
    expect(getByText("Eager to Learn")).toBeTruthy();
  });

  it("shows mentee count from active unique matches", () => {
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

    expect(getByText("2")).toBeTruthy();
    expect(getByText("Mentees")).toBeTruthy();
  });
});
