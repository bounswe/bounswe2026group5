// jest.setup.js
const { jest } = require("@jest/globals");

// Mock the safe area context so components can render without the physical device wrapper
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children, style }) =>
      React.createElement("View", { style }, children),
    SafeAreaProvider: ({ children }) =>
      React.createElement("View", null, children),
  };
});

// Mock Google Sign-In
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({
      idToken: "fake-id-token",
      user: {
        email: "test@example.com",
        id: "fake-id",
        name: "Test User",
      },
    })),
    signOut: jest.fn(() => Promise.resolve()),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
    signInSilently: jest.fn(() => Promise.resolve({ idToken: "fake-id-token" })),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
  },
}));
