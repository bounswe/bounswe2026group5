import { render } from "@testing-library/react-native";
import React from "react";

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ name }: { name: string }) =>
      React.createElement("View", { testID: `material-icon-${name}` }),
  };
});

import { IconSymbol } from "@/components/ui/icon-symbol.tsx";

describe("IconSymbol", () => {
  it("maps the community tab symbol for Android/web", () => {
    const { getByTestId } = render(
      <IconSymbol name="person.3.fill" color="#111827" />,
    );

    expect(getByTestId("material-icon-groups")).toBeTruthy();
  });

  it("maps the connections tab symbol for Android/web", () => {
    const { getByTestId } = render(
      <IconSymbol
        name="point.3.connected.trianglepath.dotted"
        color="#111827"
      />,
    );

    expect(getByTestId("material-icon-device-hub")).toBeTruthy();
  });
});
