import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { ApiValidationError } from "@/lib/api/client";
import {
  registerFn,
  updateProfileFn,
  updateUsageModeFn,
  updateUsernameFn,
} from "@/lib/queries/authQueries";

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: (...args: unknown[]) => mockBack(...args),
  },
  Stack: {
    Screen: () => null,
  },
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

const mockSetAuthenticated = jest.fn();

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (
    selector: (state: { setAuthenticated: jest.Mock }) => unknown,
  ) => selector({ setAuthenticated: mockSetAuthenticated }),
}));

jest.mock("@/lib/queries/authQueries", () => ({
  registerFn: jest.fn(),
  fetchSkillsFn: jest.fn().mockResolvedValue([
    { id: 1, name: "React" },
    { id: 2, name: "TypeScript" },
  ]),
  updateProfileFn: jest.fn(),
  updateUsageModeFn: jest.fn(),
  updateUsernameFn: jest.fn(),
}));

jest.mock("@/lib/queries/googleAuth", () => ({
  useGoogleLoginMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
    data: null,
    error: null,
  })),
}));

jest.mock("@/components/profile/RegistrationProfileSetupSheet", () => ({
  RegistrationProfileSetupSheet: ({
    visible,
    onSubmit,
    submitError,
    usernameError,
  }: {
    visible: boolean;
    submitError?: string;
    usernameError?: string;
    onSubmit: (values: {
      role: "mentor" | "mentee";
      username: string;
      displayName: string;
      bio: string;
      selectedSkills: string[];
    }) => void;
  }) => {
    const { Text, TouchableOpacity, View } = require("react-native");
    if (!visible) return null;
    return (
      <View>
        <Text accessibilityLabel="profile-setup-sheet">
          Profile Setup Sheet
        </Text>
        {submitError ? <Text>{submitError}</Text> : null}
        {usernameError ? <Text>{usernameError}</Text> : null}
        <TouchableOpacity
          accessibilityLabel="submit-profile-setup"
          onPress={() =>
            onSubmit({
              role: "mentor",
              username: "testuser",
              displayName: "Test User",
              bio: "",
              selectedSkills: [],
            })
          }
        />
        <TouchableOpacity
          accessibilityLabel="submit-profile-setup-mentee"
          onPress={() =>
            onSubmit({
              role: "mentee",
              username: "testuser",
              displayName: "Test User",
              bio: "",
              selectedSkills: [],
            })
          }
        />
      </View>
    );
  },
}));

import RegisterScreen from "@/app/register";

function renderRegister() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
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
    (updateUsageModeFn as jest.Mock).mockResolvedValue({});
    (updateProfileFn as jest.Mock).mockResolvedValue({});
    (updateUsernameFn as jest.Mock).mockResolvedValue({
      username: "custom_user",
    });
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

    const { getByLabelText, findAllByText, findByLabelText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "Password1");
    fireEvent.changeText(getByLabelText("Confirm password"), "Password1");
    fireEvent.press(
      getByLabelText("I agree to the Terms of Service and Privacy Policy"),
    );
    fireEvent.press(getByLabelText("Complete registration"));

    // Profile setup sheet appears — submit it to trigger the registration mutation
    fireEvent.press(await findByLabelText("submit-profile-setup"));

    expect((await findAllByText("Email already taken")).length).toBeGreaterThan(
      0,
    );
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

  it("completes registration with role, username, profile, auth storage, and dashboard redirect", async () => {
    (registerFn as jest.Mock).mockResolvedValueOnce({
      access_token: "acc",
      refresh_token: "ref",
      user: { username: "server_user", app_usage_mode: "" },
    });

    const { getByLabelText, findByLabelText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), " user@example.com ");
    fireEvent.changeText(getByLabelText("Password"), "Password1");
    fireEvent.changeText(getByLabelText("Confirm password"), "Password1");
    fireEvent.press(
      getByLabelText("I agree to the Terms of Service and Privacy Policy"),
    );
    fireEvent.press(getByLabelText("Complete registration"));
    fireEvent.press(await findByLabelText("submit-profile-setup-mentee"));

    await waitFor(() => {
      expect(registerFn).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Password1",
        confirm_password: "Password1",
      });
      expect(updateUsageModeFn).toHaveBeenCalledWith({
        app_usage_mode: "MENTEE",
        accessToken: "acc",
      });
      expect(updateUsernameFn).toHaveBeenCalledWith({
        accessToken: "acc",
        username: "testuser",
      });
      expect(updateProfileFn).toHaveBeenCalledWith({
        accessToken: "acc",
        display_name: "Test User",
        bio: undefined,
        skills: [],
      });
      expect(mockSetAuthenticated).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "custom_user",
          app_usage_mode: "MENTEE",
        }),
        {
          access_token: "acc",
          refresh_token: "ref",
        },
      );
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("surfaces username validation errors from profile setup", async () => {
    (registerFn as jest.Mock).mockResolvedValueOnce({
      access_token: "acc",
      refresh_token: "ref",
      user: { username: "server_user", app_usage_mode: "" },
    });
    (updateUsernameFn as jest.Mock).mockRejectedValueOnce(
      new ApiValidationError(400, "Username is taken.", {
        username: "Username is taken.",
      }),
    );

    const { getByLabelText, findByLabelText, findByText } = renderRegister();

    fireEvent.changeText(getByLabelText("Email"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "Password1");
    fireEvent.changeText(getByLabelText("Confirm password"), "Password1");
    fireEvent.press(
      getByLabelText("I agree to the Terms of Service and Privacy Policy"),
    );
    fireEvent.press(getByLabelText("Complete registration"));
    fireEvent.press(await findByLabelText("submit-profile-setup"));

    expect(await findByText("Username is taken.")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalledWith("/(tabs)");
  });

  it("toggles password fields and navigates back to login", () => {
    const { getByLabelText } = renderRegister();

    fireEvent.press(getByLabelText("Show password"));
    expect(getByLabelText("Hide password")).toBeTruthy();

    fireEvent.press(getByLabelText("Show confirm password"));
    expect(getByLabelText("Hide confirm password")).toBeTruthy();

    fireEvent.press(getByLabelText("Already have an account? Log In"));
    expect(mockReplace).toHaveBeenCalledWith("/login");
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
      expect(
        btn.props.accessibilityState?.disabled ?? btn.props.disabled,
      ).toBeTruthy();
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
