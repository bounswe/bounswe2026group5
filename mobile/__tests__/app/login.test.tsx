import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import LoginScreen from "@/app/login";
import { useLoginMutation } from "@/lib/queries/auth";
import { useGoogleLoginMutation } from "@/lib/queries/googleAuth";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/queries/auth", () => ({
  useLoginMutation: jest.fn(),
}));

jest.mock("@/lib/queries/googleAuth", () => ({
  useGoogleLoginMutation: jest.fn(),
}));

const mockMutateAsync = jest.fn();
const mockGoogleMutateAsync = jest.fn();

describe("LoginScreen", () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    (useLoginMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      data: undefined,
      error: null,
    });
    (useGoogleLoginMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockGoogleMutateAsync,
      isPending: false,
      data: undefined,
      error: null,
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("renders the login form with all required fields", () => {
    const { getByLabelText, getByText } = render(<LoginScreen />);

    expect(getByLabelText("Email or username")).toBeTruthy();
    expect(getByLabelText("Password")).toBeTruthy();
    expect(getByLabelText("Log in")).toBeTruthy();
    expect(getByText("Log In")).toBeTruthy();
    expect(getByLabelText("Sign up")).toBeTruthy();
  });

  it("shows a validation error and does not submit when email is empty", () => {
    const { getByLabelText, getByText } = render(<LoginScreen />);

    fireEvent.press(getByLabelText("Log in"));

    expect(getByText("Please enter your email")).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not submit when password is empty", () => {
    const { getByLabelText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText("Email or username"), "user@example.com");
    fireEvent.press(getByLabelText("Log in"));

    expect(getByText("Please enter your password")).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("displays the error message returned by the API", () => {
    (useLoginMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      data: undefined,
      error: { message: "Invalid credentials" },
    });

    const { getByText } = render(<LoginScreen />);

    expect(getByText("Invalid credentials")).toBeTruthy();
  });

  it("disables the button and shows a spinner while login is in progress", () => {
    (useLoginMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      data: undefined,
      error: null,
    });

    const { getByLabelText, queryByText } = render(<LoginScreen />);

    const button = getByLabelText("Log in");
    expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBeTruthy();
    expect(queryByText("Log In")).toBeNull();
  });

  it("navigates to the dashboard after a successful login submit", async () => {
    mockMutateAsync.mockResolvedValueOnce({});
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText("Email or username"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "secret123");
    fireEvent.press(getByLabelText("Log in"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("calls mutateAsync with trimmed email and password on submit", async () => {
    mockMutateAsync.mockResolvedValueOnce({});
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText("Email or username"), "  user@example.com  ");
    fireEvent.changeText(getByLabelText("Password"), "secret123");
    fireEvent.press(getByLabelText("Log in"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
    });
  });

  it("logs failed login attempts after validation passes", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Invalid credentials"));
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText("Email or username"), "user@example.com");
    fireEvent.changeText(getByLabelText("Password"), "secret123");
    fireEvent.press(getByLabelText("Log in"));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        "Login error:",
        expect.any(Error),
      );
    });
  });

  it("toggles password visibility from the password icon", () => {
    const { getByLabelText } = render(<LoginScreen />);

    expect(getByLabelText("Show password")).toBeTruthy();

    fireEvent.press(getByLabelText("Show password"));

    expect(getByLabelText("Hide password")).toBeTruthy();
  });

  it("logs the current forgot-password placeholder action", () => {
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.press(getByLabelText("Forgot password"));

    expect(logSpy).toHaveBeenCalledWith(
      "TODO: Navigate to forgot-password screen",
    );
  });

  it("navigates to the dashboard after Google login for an onboarded user", async () => {
    mockGoogleMutateAsync.mockResolvedValueOnce({
      user: { app_usage_mode: "mentor" },
    });
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.press(getByLabelText("Log in with Google"));

    await waitFor(() => {
      expect(mockGoogleMutateAsync).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("navigates to register after Google login for a new user", async () => {
    mockGoogleMutateAsync.mockResolvedValueOnce({
      user: { app_usage_mode: null },
    });
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.press(getByLabelText("Log in with Google"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/register");
    });
  });

  it("navigates to the register screen when Sign Up is pressed", () => {
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.press(getByLabelText("Sign up"));

    expect(mockPush).toHaveBeenCalledWith("/register");
  });
});
