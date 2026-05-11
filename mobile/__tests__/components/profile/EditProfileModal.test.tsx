import { View, Alert } from "react-native";
import { fireEvent, render, waitFor, act } from "@testing-library/react-native";
import React from "react";

import { EditProfileModal } from "@/components/profile/EditProfileModal";

const mockLaunchImageLibraryAsync = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
}));

describe("EditProfileModal", () => {
  const alertSpy = jest.spyOn(Alert, "alert");

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
    const onSave = jest.fn().mockResolvedValue(true);
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

    await act(async () => {
      fireEvent.press(getByTestId("save-button"));
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: "Ali Aydin",
        bio: "Loves mentoring on React Native.",
        pictureFile: null,
        pictureUrl: undefined,
        removePicture: false,
        showInitialsOnly: false,
      });
      expect(onClose).toHaveBeenCalled();
    });
  }, 10000);

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

  it("blocks save and alerts when name contains numbers", () => {
    const onSave = jest.fn();

    const { getByTestId } = render(
      <EditProfileModal
        visible
        onClose={jest.fn()}
        initialData={{ name: "Ali", bio: "Initial bio" }}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(getByTestId("name-input"), "Ali 123");
    fireEvent.press(getByTestId("save-button"));

    expect(globalThis.alert).toHaveBeenCalledWith(
      "Display name cannot contain numbers.",
    );
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

    await act(async () => {
      fireEvent.press(getByTestId("avatar-picker-button"));
    });

    expect(await findByTestId("avatar-preview")).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId("save-button"));
    });

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
    
    await act(async () => {
      fireEvent.press(getByTestId("avatar-remove-button"));
    });

    // Handle Alert.alert
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe("Remove Profile Photo");
    const removeButton = buttons!.find((b: any) => b.text === "Remove");
    
    await act(async () => {
      removeButton!.onPress!();
    });

    expect(queryByTestId("avatar-preview")).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId("save-button"));
    });

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
