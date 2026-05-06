import { useAutoClearMessage } from "@/hooks/use-auto-clear-message";
import { act, render } from "@testing-library/react-native";
import React, { useState } from "react";
import { Text } from "react-native";

function MessageHarness() {
  const [message, setMessage] = useState("Saved.");
  useAutoClearMessage(message, setMessage, 250);

  return <Text>{message ?? "cleared"}</Text>;
}

describe("useAutoClearMessage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("clears transient messages after the configured delay", () => {
    const { getByText } = render(<MessageHarness />);

    expect(getByText("Saved.")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(getByText("cleared")).toBeTruthy();
  });
});
