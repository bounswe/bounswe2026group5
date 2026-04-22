import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import RegisterScreen from "@/app/register";
import { registerFn } from "@/lib/queries/authQueries";

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  router: { replace: mockReplace, back: mockBack },
  Stack: {
    Screen: () => null,
  },
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

const mockSetAuthenticated = jest.fn();

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: { setAuthenticated: jest.Mock }) => unknown) =>
    selector({ setAuthenticated: mockSetAuthenticated }),
}));

jest.mock("@/lib/queries/authQueries", () => ({
  registerFn: jest.fn(),
  fetchSkillsFn: jest.fn().mockResolvedValue([
    { id: 1, name: "React" },
    { id: 2, name: "TypeScript" },
  ]),
  updateProfileFn: jest.fn(),
  updateUsageModeFn: jest.fn(),
}));

jest.mock(
  "@/components/profile/RegistrationProfileSetupSheet",
  () => ({
    RegistrationProfileSetupSheet: ({
      visible,
      onSubmit,
    }: {
      visible: boolean;
      onSubmit: (values: { displayName: string; bio: string; selectedSkills: string[] }) => void;
    }) => {
      const { Text, TouchableOpacity } = require("react-native");
      if (!visible) return null;
      return (
        <>
          <Text accessibilityLabel="profile-setup-sheet">Profile Setup Sheet</Text>
          <TouchableOpacity
            accessibilityLabel="submit-profile-setup"
            onPress={() => onSubmit({ displayName: "Test User", bio: "", selectedSkills: [] })}
          />
        </>
      );
    },
  }),
);

function renderRegister() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <RegisterScreen />
    </QueryClientProvider>,
  );
}

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all required form fields", () => {
    const { getByLabelText, getByText } = renderRegister();

    expect(getByText("Create Account")).toBeTruthy();
    expect(getByLabelText("Email")).toBeTruthy();
    expect(getByLabelText("Password")).toBeTruthy();
    expect(getByLabelText("Confirm password")).toBeTruthy();
    expect(
      getByLabelText("I agree to the Terms of Service and Privacy Policy"),
    ).toBeTruthy();
    expect(getByLabelText("Complete registration")).toBeTruthy();
  });

  it("shows an email validation error when email is empty on submit", () => {
    const { getByLabelText, getByText } = renderRegister();

    fireEvent.press(getByLabelText("Complete registration"));

    expect(getByText("Email is required.")).toBeTruthy();
    expect(registerFn).not.toHaveBeenCalled();
  });

  it("shows an error for an invalid email format", () => {
    const { getByLabelText, getByText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), "not-an-email");
    fireEvent.press(getByLabelText("Complete registration"));

    expect(getByText("Please enter a valid email address.")).toBeTruthy();
    expect(registerFn).not.toHaveBeenCalled();
  });

  it("shows a password length error when password is too short", () => {
    const { getByLabelText, getByText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "short");
    fireEvent.press(getByLabelText("Complete registration"));

    expect(getByText("Password must be at least 8 characters.")).toBeTruthy();
    expect(registerFn).not.toHaveBeenCalled();
  });

  it("shows an error when passwords do not match", () => {
    const { getByLabelText, getByText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "Password1");
    fireEvent.changeText(getByLabelText("Confirm password"), "Different1");
    fireEvent.press(getByLabelText("Complete registration"));

    expect(getByText("Passwords do not match.")).toBeTruthy();
    expect(registerFn).not.toHaveBeenCalled();
  });

  it("shows a terms error when terms are not accepted", () => {
    const { getByLabelText, getByText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "Password1");
    fireEvent.changeText(getByLabelText("Confirm password"), "Password1");
    // terms not checked
    fireEvent.press(getByLabelText("Complete registration"));

    expect(
      getByText("You must agree to the Terms of Service and Privacy Policy."),
    ).toBeTruthy();
    expect(registerFn).not.toHaveBeenCalled();
  });

  it("displays the API error message when registration fails", async () => {
    (registerFn as jest.Mock).mockRejectedValueOnce(
      new Error("Email already taken"),
    );

    const { getByLabelText, findByText, findByLabelText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "Password1");
    fireEvent.changeText(getByLabelText("Confirm password"), "Password1");
    fireEvent.press(
      getByLabelText("I agree to the Terms of Service and Privacy Policy"),
    );
    fireEvent.press(getByLabelText("Complete registration"));

    // Profile setup sheet appears — submit it to trigger the registration mutation
    fireEvent.press(await findByLabelText("submit-profile-setup"));

    expect(await findByText("Email already taken")).toBeTruthy();
  });

  it("shows the profile setup sheet when registration succeeds", async () => {
    (registerFn as jest.Mock).mockResolvedValueOnce({
      access_token: "acc",
      refresh_token: "ref",
      user: { username: "newuser", app_usage_mode: "MENTOR" },
    });

    const { getByLabelText, findByLabelText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "Password1");
    fireEvent.changeText(getByLabelText("Confirm password"), "Password1");
    fireEvent.press(
      getByLabelText("I agree to the Terms of Service and Privacy Policy"),
    );
    fireEvent.press(getByLabelText("Complete registration"));

    expect(await findByLabelText("profile-setup-sheet")).toBeTruthy();
  });

  it("disables the submit button while registration is in progress", async () => {
    let resolveRegister!: (value: unknown) => void;
    (registerFn as jest.Mock).mockReturnValueOnce(
      new Promise((res) => {
        resolveRegister = res;
      }),
    );

    const { getByLabelText, findByLabelText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "Password1");
    fireEvent.changeText(getByLabelText("Confirm password"), "Password1");
    fireEvent.press(
      getByLabelText("I agree to the Terms of Service and Privacy Policy"),
    );
    fireEvent.press(getByLabelText("Complete registration"));

    // Profile setup sheet appears — submit it to trigger the registration mutation
    fireEvent.press(await findByLabelText("submit-profile-setup"));

    await waitFor(() => {
      const btn = getByLabelText("Complete registration");
      expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeTruthy();
    });

    // Resolve the promise inside act so React flushes the resulting state updates.
    await act(async () => {
      resolveRegister({
        access_token: "a",
        refresh_token: "r",
        user: { username: "u", app_usage_mode: "MENTOR" },
      });
    });
  });
});