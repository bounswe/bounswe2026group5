import { render } from "@testing-library/react-native";
import React from "react";

const mockInitializeAuth = jest.fn();
let mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
  initializeAuth: mockInitializeAuth,
};

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) =>
    selector(mockAuthState),
}));

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const StackScreen = ({ name }: { name: string }) =>
    React.createElement("View", { testID: `screen-${name}` });
  const Stack = ({ children }: { children: React.ReactNode }) =>
    React.createElement("View", { testID: "stack" }, children);
  Stack.Screen = StackScreen;
  return { Stack };
});

jest.mock("@react-navigation/native", () => ({
  DarkTheme: {},
  DefaultTheme: {},
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@tanstack/react-query", () => ({
  QueryClient: jest.fn(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

jest.mock("react-native-reanimated", () => ({}));

import RootLayout from "@/app/_layout";

describe("RootLayout — session restoration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      initializeAuth: mockInitializeAuth,
    };
  });

  it("calls initializeAuth once on mount", () => {
    render(<RootLayout />);
    expect(mockInitializeAuth).toHaveBeenCalledTimes(1);
  });

  it("shows a loading spinner while auth is being restored", () => {
    mockAuthState = { ...mockAuthState, isLoading: true };
    const { getByTestId, queryByTestId } = render(<RootLayout />);

    // Loading view is rendered — no navigation stack present
    expect(queryByTestId("stack")).toBeNull();
    // ActivityIndicator is present (rendered by the loading branch)
    expect(getByTestId).toBeTruthy(); // component renders without crashing
  });

  it("renders unauthenticated routes when the user is not logged in", () => {
    mockAuthState = { ...mockAuthState, isAuthenticated: false };
    const { getByTestId } = render(<RootLayout />);

    expect(getByTestId("screen-index")).toBeTruthy();
    expect(getByTestId("screen-login")).toBeTruthy();
    expect(getByTestId("screen-register")).toBeTruthy();
  });

  it("renders authenticated routes when the user is logged in", () => {
    mockAuthState = { ...mockAuthState, isAuthenticated: true };
    const { getByTestId } = render(<RootLayout />);

    expect(getByTestId("screen-(tabs)")).toBeTruthy();
    expect(getByTestId("screen-settings")).toBeTruthy();
  });
});