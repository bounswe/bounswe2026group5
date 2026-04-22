import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import LoginScreen from "@/app/login";
import { useLoginMutation } from "@/lib/queries/auth";

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

const mockMutateAsync = jest.fn();

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLoginMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      data: undefined,
      error: null,
    });
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

  it("navigates to the dashboard when login succeeds", async () => {
    (useLoginMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      data: { access_token: "tok" },
      error: null,
    });

    render(<LoginScreen />);

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

  it("navigates to the register screen when Sign Up is pressed", () => {
    const { getByLabelText } = render(<LoginScreen />);

    fireEvent.press(getByLabelText("Sign up"));

    expect(mockPush).toHaveBeenCalledWith("/register");
  });
});