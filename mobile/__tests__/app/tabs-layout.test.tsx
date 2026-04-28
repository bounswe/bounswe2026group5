import { render } from "@testing-library/react-native";
import React from "react";

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/components/haptic-tab", () => ({
  HapticTab: "View",
}));

jest.mock("@/components/ui/icon-symbol", () => ({
  IconSymbol: ({ name }: { name: string }) => {
    const React = require("react");
    return React.createElement("View", { testID: `icon-${name}` });
  },
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const TabsScreen = ({
    name,
    options,
  }: {
    name: string;
    options?: {
      title?: string;
      href?: string | null;
      tabBarIcon?: (props: { color: string }) => React.ReactNode;
    };
  }) => {
    const visibleMarker =
      options?.href === null
        ? null
        : React.createElement("View", { testID: `visible-tab-${name}` });
    const icon = options?.tabBarIcon?.({ color: "#111827" });
    return React.createElement(
      "View",
      {
        testID: `tab-screen-${name}`,
        accessibilityLabel: options?.title ?? name,
      },
      visibleMarker,
      icon,
    );
  };
  const Tabs = ({ children }: { children: React.ReactNode }) =>
    React.createElement("View", { testID: "tabs-root" }, children);
  Tabs.Screen = TabsScreen;
  return { Tabs };
});

import TabLayout from "@/app/(tabs)/_layout";

describe("TabLayout", () => {
  it("shows Community in the bottom tabs and keeps Schedule as a hidden tab route", () => {
    const { getByTestId, queryByTestId } = render(<TabLayout />);

    expect(getByTestId("tab-screen-community")).toBeTruthy();
    expect(getByTestId("tab-screen-schedule")).toBeTruthy();
    expect(queryByTestId("visible-tab-schedule")).toBeNull();
  });

  it("uses a forum-style Community icon instead of another people/group icon", () => {
    const { getByTestId, queryByTestId } = render(<TabLayout />);

    expect(getByTestId("icon-bubble.left.and.bubble.right.fill")).toBeTruthy();
    expect(queryByTestId("icon-person.3.fill")).toBeNull();
  });

  it("keeps profile detail as a hidden tab route", () => {
    const { getByTestId, queryByTestId } = render(<TabLayout />);

    expect(getByTestId("tab-screen-user/[username]")).toBeTruthy();
    expect(getByTestId("tab-screen-community/[tagId]")).toBeTruthy();
    expect(getByTestId("tab-screen-community/[tagId]/members")).toBeTruthy();
    expect(queryByTestId("visible-tab-community/[tagId]")).toBeNull();
    expect(queryByTestId("visible-tab-community/[tagId]/members")).toBeNull();
  });
});
