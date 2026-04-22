import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { EditProfileModal } from "@/components/profile/EditProfileModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("EditProfileModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.alert = jest.fn();
  });

  it("saves trimmed profile values via save button", () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = render(
      <EditProfileModal
        visible
        onClose={onClose}
        initialData={{ name: "Ali", bio: "Initial bio" }}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(getByTestId("name-input"), "  Ali Aydin  ");
    fireEvent.changeText(getByTestId("bio-input"), "  Loves mentoring on React Native.  ");

    fireEvent.press(getByTestId("save-button"));

    expect(onSave).toHaveBeenCalledWith({
      name: "Ali Aydin",
      bio: "Loves mentoring on React Native.",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("blocks save and alerts when name is empty", () => {
    const onSave = jest.fn();

    const { getByTestId } = render(
      <EditProfileModal
        visible
        onClose={jest.fn()}
        initialData={{ name: "Ali", bio: "Initial bio" }}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(getByTestId("name-input"), "   ");
    fireEvent.press(getByTestId("save-button"));

    expect(globalThis.alert).toHaveBeenCalledWith("Name cannot be empty!");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <EditProfileModal
        visible
        onClose={onClose}
        initialData={{ name: "Ali", bio: "Initial bio" }}
        onSave={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("close-button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});