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
