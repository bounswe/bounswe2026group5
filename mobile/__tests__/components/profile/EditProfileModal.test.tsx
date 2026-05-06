import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { EditProfileModal } from "@/components/profile/EditProfileModal";

const mockLaunchImageLibraryAsync = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
}));

describe("EditProfileModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.alert = jest.fn();
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/avatar.jpg",
          fileName: "avatar.jpg",
          mimeType: "image/jpeg",
          width: 512,
          height: 512,
        },
      ],
    });
  });

  it("saves trimmed profile values via save button", async () => {
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

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: "Ali Aydin",
        bio: "Loves mentoring on React Native.",
        pictureFile: null,
        pictureUrl: undefined,
        removePicture: false,
      });
      expect(onClose).toHaveBeenCalled();
    });
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

  it("does not render an unsupported cover photo edit button", () => {
    const { queryByText } = render(
      <EditProfileModal
        visible
        onClose={jest.fn()}
        initialData={{ name: "Ali", bio: "Initial bio" }}
        onSave={jest.fn()}
      />,
    );

    expect(queryByText("Edit Cover")).toBeNull();
  });

  it("previews a picked avatar and includes it in save data", async () => {
    const onSave = jest.fn().mockResolvedValue(true);

    const { findByTestId, getByTestId } = render(
      <EditProfileModal
        visible
        onClose={jest.fn()}
        initialData={{
          name: "Ali",
          bio: "Initial bio",
          pictureUrl: "https://cdn.example.com/current.jpg",
        }}
        onSave={onSave}
      />,
    );

    fireEvent.press(getByTestId("avatar-picker-button"));

    expect(await findByTestId("avatar-preview")).toBeTruthy();

    fireEvent.press(getByTestId("save-button"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          pictureFile: {
            uri: "file:///tmp/avatar.jpg",
            name: "avatar.jpg",
            type: "image/jpeg",
          },
          removePicture: false,
        }),
      );
    });
  });

  it("marks the current avatar for removal", async () => {
    const onSave = jest.fn().mockResolvedValue(true);

    const { getByTestId, queryByTestId } = render(
      <EditProfileModal
        visible
        onClose={jest.fn()}
        initialData={{
          name: "Ali",
          bio: "Initial bio",
          pictureUrl: "https://cdn.example.com/current.jpg",
        }}
        onSave={onSave}
      />,
    );

    expect(getByTestId("avatar-preview")).toBeTruthy();
    fireEvent.press(getByTestId("avatar-remove-button"));
    expect(queryByTestId("avatar-preview")).toBeNull();

    fireEvent.press(getByTestId("save-button"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          pictureFile: null,
          removePicture: true,
        }),
      );
    });
  });
});
