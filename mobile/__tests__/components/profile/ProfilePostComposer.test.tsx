import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { ProfilePostComposer } from "@/components/profile/ProfilePostComposer";

const mockLaunchImageLibraryAsync = jest.fn();
const mockUploadPostMedia = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
}));

jest.mock("@/lib/queries/uploads", () => ({
  uploadPostMedia: (...args: unknown[]) => mockUploadPostMedia(...args),
}));

describe("ProfilePostComposer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/profile-photo.jpg",
          fileName: "profile-photo.jpg",
          mimeType: "image/jpeg",
          width: 1200,
          height: 800,
        },
      ],
    });
    mockUploadPostMedia.mockResolvedValue({
      url: "https://cdn.example.com/profile-photo.jpg",
    });
  });

  it("submits trimmed content and selected event type", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const onClose = jest.fn();

    const { getByTestId, getByPlaceholderText } = render(
      <ProfilePostComposer visible onClose={onClose} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(
      getByPlaceholderText("What would you like to share?"),
      "  Hello profile  ",
    );
    fireEvent.press(getByTestId("profile-composer-type-achievement"));
    fireEvent.press(getByTestId("profile-composer-submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "achievement",
        content: "Hello profile",
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("uploads selected media before submitting the post", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const onClose = jest.fn();

    const { getByTestId, getByPlaceholderText } = render(
      <ProfilePostComposer visible onClose={onClose} onSubmit={onSubmit} />,
    );

    fireEvent.press(getByTestId("profile-composer-media-button"));

    await waitFor(() => {
      expect(getByTestId("profile-composer-media-preview")).toBeTruthy();
    });

    fireEvent.changeText(
      getByPlaceholderText("What would you like to share?"),
      "  Post with photo  ",
    );
    fireEvent.press(getByTestId("profile-composer-submit"));

    await waitFor(() => {
      expect(mockUploadPostMedia).toHaveBeenCalledWith({
        uri: "file:///tmp/profile-photo.jpg",
        name: "profile-photo.jpg",
        type: "image/jpeg",
      });
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "social",
        content: "Post with photo",
        media_url: "https://cdn.example.com/profile-photo.jpg",
      });
    });
  });

  it("removes selected media before submitting", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);

    const { getByTestId, getByPlaceholderText, queryByTestId } = render(
      <ProfilePostComposer visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.press(getByTestId("profile-composer-media-button"));
    await waitFor(() => {
      expect(getByTestId("profile-composer-media-preview")).toBeTruthy();
    });
    fireEvent.press(getByTestId("profile-composer-media-remove"));

    expect(queryByTestId("profile-composer-media-preview")).toBeNull();

    fireEvent.changeText(
      getByPlaceholderText("What would you like to share?"),
      "  Text only  ",
    );
    fireEvent.press(getByTestId("profile-composer-submit"));

    await waitFor(() => {
      expect(mockUploadPostMedia).not.toHaveBeenCalled();
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "social",
        content: "Text only",
      });
    });
  });

  it("shows upload errors and does not submit when media upload fails", async () => {
    mockUploadPostMedia.mockRejectedValueOnce(new Error("Upload failed"));
    const onSubmit = jest.fn();

    const { findByTestId, getByTestId, getByPlaceholderText } = render(
      <ProfilePostComposer visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.press(getByTestId("profile-composer-media-button"));
    await findByTestId("profile-composer-media-preview");

    fireEvent.changeText(
      getByPlaceholderText("What would you like to share?"),
      "  This should wait  ",
    );
    fireEvent.press(getByTestId("profile-composer-submit"));

    expect(await findByTestId("profile-composer-media-error")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
