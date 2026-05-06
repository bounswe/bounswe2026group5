import { fireEvent, render, waitFor, act } from "@testing-library/react-native";
import React from "react";

import { ProfilePostComposer } from "@/components/profile/ProfilePostComposer";
import { pickPostMediaFile } from "@/lib/uploads/picker";
import { uploadPostMedia } from "@/lib/queries/uploads";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/uploads/picker", () => ({
  pickPostMediaFile: jest.fn(),
}));

jest.mock("@/lib/queries/uploads", () => ({
  uploadPostMedia: jest.fn(),
}));

describe("ProfilePostComposer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pickPostMediaFile as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/profile-photo.jpg",
      name: "profile-photo.jpg",
      type: "image/jpeg",
    });
    (uploadPostMedia as jest.Mock).mockResolvedValue({
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
    
    await act(async () => {
      fireEvent.press(getByTestId("profile-composer-submit"));
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "achievement",
        content: "Hello profile",
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  }, 10000);

  it("uploads selected media before submitting the post", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const onClose = jest.fn();

    const { getByTestId, getByPlaceholderText } = render(
      <ProfilePostComposer visible onClose={onClose} onSubmit={onSubmit} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId("profile-composer-media-button"));
    });

    await waitFor(() => {
      expect(getByTestId("profile-composer-media-preview")).toBeTruthy();
    });

    fireEvent.changeText(
      getByPlaceholderText("What would you like to share?"),
      "  Post with photo  ",
    );
    
    await act(async () => {
      fireEvent.press(getByTestId("profile-composer-submit"));
    });

    await waitFor(() => {
      expect(uploadPostMedia).toHaveBeenCalledWith({
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

    await act(async () => {
      fireEvent.press(getByTestId("profile-composer-media-button"));
    });
    
    await waitFor(() => {
      expect(getByTestId("profile-composer-media-preview")).toBeTruthy();
    });
    
    await act(async () => {
      fireEvent.press(getByTestId("profile-composer-media-remove"));
    });

    expect(queryByTestId("profile-composer-media-preview")).toBeNull();

    fireEvent.changeText(
      getByPlaceholderText("What would you like to share?"),
      "  Text only  ",
    );
    
    await act(async () => {
      fireEvent.press(getByTestId("profile-composer-submit"));
    });

    await waitFor(() => {
      expect(uploadPostMedia).not.toHaveBeenCalled();
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "social",
        content: "Text only",
      });
    });
  });

  it("shows upload errors and does not submit when media upload fails", async () => {
    (uploadPostMedia as jest.Mock).mockRejectedValueOnce(new Error("Upload failed"));
    const onSubmit = jest.fn();

    const { findByTestId, getByTestId, getByPlaceholderText } = render(
      <ProfilePostComposer visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId("profile-composer-media-button"));
    });
    
    await findByTestId("profile-composer-media-preview");

    fireEvent.changeText(
      getByPlaceholderText("What would you like to share?"),
      "  This should wait  ",
    );
    
    await act(async () => {
      fireEvent.press(getByTestId("profile-composer-submit"));
    });

    expect(await findByTestId("profile-composer-media-error")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
