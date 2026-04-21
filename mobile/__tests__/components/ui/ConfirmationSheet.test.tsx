import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { ConfirmationSheet } from "@/components/ui/ConfirmationSheet";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("ConfirmationSheet", () => {
  it("renders title, message, and action labels", () => {
    const { getByText } = render(
      <ConfirmationSheet
        visible={true}
        title="Remove connection?"
        message="This will end the mentorship connection."
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(getByText("Remove connection?")).toBeTruthy();
    expect(getByText("This will end the mentorship connection.")).toBeTruthy();
    expect(getByText("Remove")).toBeTruthy();
    expect(getByText("Keep")).toBeTruthy();
  });

  it("calls handlers for confirm and cancel", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { getByText } = render(
      <ConfirmationSheet
        visible={true}
        title="Discard changes?"
        message="Your unsaved changes will be lost."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(getByText("Confirm"));
    fireEvent.press(getByText("Cancel"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
