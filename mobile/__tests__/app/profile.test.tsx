import React from "react";
import { render } from "@testing-library/react-native";
import ProfileScreen from "@/app/(tabs)/profile";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/queries/mentorship", () => {
  const actual = jest.requireActual("@/lib/queries/mentorship");
  return {
    ...actual,
    useAvailabilitySlotsQuery: jest.fn(() => ({ data: undefined })),
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
});
