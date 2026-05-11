import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { ConnectionActionsSheet } from "@/components/connections/ConnectionActionsSheet";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("ConnectionActionsSheet", () => {
  it("opens the themed remove confirmation and confirms removal", () => {
    const onRemoveConnection = jest.fn();
    const { getByText } = render(
      <ConnectionActionsSheet
        visible={true}
        name="Jane Doe"
        onClose={jest.fn()}
        onViewProfile={jest.fn()}
        onRemoveConnection={onRemoveConnection}
      />,
    );

    fireEvent.press(getByText("Remove Connection"));

    expect(getByText("Remove Jane Doe?")).toBeTruthy();
    expect(
      getByText("Are you sure you want to end this match?"),
    ).toBeTruthy();

    fireEvent.press(getByText("Remove"));

    expect(onRemoveConnection).toHaveBeenCalledTimes(1);
  });

  it("renders and calls the journey action when provided", () => {
    const onViewJourney = jest.fn();
    const { getByText } = render(
      <ConnectionActionsSheet
        visible={true}
        name="Jane Doe"
        onClose={jest.fn()}
        onViewProfile={jest.fn()}
        onViewJourney={onViewJourney}
        onRemoveConnection={jest.fn()}
      />,
    );

    fireEvent.press(getByText("View Journey"));

    expect(onViewJourney).toHaveBeenCalledTimes(1);
  });
});
