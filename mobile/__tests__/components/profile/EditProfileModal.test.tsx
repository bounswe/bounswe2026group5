import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { EditProfileModal } from "@/components/profile/EditProfileModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("EditProfileModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.alert = jest.fn();
  });

  it("saves trimmed profile values", () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <EditProfileModal
        visible
        onClose={onClose}
        initialData={{ name: "Ali", bio: "Initial bio" }}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(
      getByPlaceholderText("Enter your name"),
      "  Ali Aydin  ",
    );
    fireEvent.changeText(
      getByPlaceholderText("Tell mentees about yourself..."),
      "  Loves mentoring on React Native.  ",
    );

    fireEvent.press(getByText("Save"));

    expect(onSave).toHaveBeenCalledWith({
      name: "Ali Aydin",
      bio: "Loves mentoring on React Native.",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("blocks save and alerts when name is empty", () => {
    const onSave = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <EditProfileModal
        visible
        onClose={jest.fn()}
        initialData={{ name: "Ali", bio: "Initial bio" }}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(getByPlaceholderText("Enter your name"), "   ");
    fireEvent.press(getByText("Save"));

    expect(globalThis.alert).toHaveBeenCalledWith("Name cannot be empty!");
    expect(onSave).not.toHaveBeenCalled();
  });
});
