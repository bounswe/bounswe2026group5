import MessagesLayout from "@/app/messages/_layout";
import { render } from "@testing-library/react-native";
import React from "react";

const mockStack = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  const Stack = (props: Record<string, unknown>) => {
    mockStack(props);
    return React.createElement("View", { testID: "messages-stack" });
  };

  return { Stack };
});

describe("MessagesLayout", () => {
  beforeEach(() => {
    mockStack.mockClear();
  });

  it("hides headers for nested message routes", () => {
    const { getByTestId } = render(<MessagesLayout />);

    expect(getByTestId("messages-stack")).toBeTruthy();
    expect(mockStack).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOptions: { headerShown: false },
      }),
    );
  });
});
