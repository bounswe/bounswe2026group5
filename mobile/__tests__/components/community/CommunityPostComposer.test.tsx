import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { CommunityPostComposer } from "@/components/community/CommunityPostComposer";

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

describe("CommunityPostComposer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/community-photo.png",
          fileName: "community-photo.png",
          mimeType: "image/png",
          width: 800,
          height: 800,
        },
      ],
    });
    mockUploadPostMedia.mockResolvedValue({
      url: "https://cdn.example.com/community-photo.jpg",
    });
  });

  it("submits trimmed content, selected type, and profile visibility", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);

    const { getByTestId, getByPlaceholderText } = render(
      <CommunityPostComposer onSubmit={onSubmit} />,
    );

    fireEvent.changeText(
      getByPlaceholderText("What is happening in this community?"),
      "  Community update  ",
    );
    fireEvent.press(getByTestId("community-composer-type-progress"));
    fireEvent(
      getByTestId("community-composer-profile-toggle"),
      "valueChange",
      true,
    );
    fireEvent.press(getByTestId("community-composer-submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "progress",
        content: "Community update",
        show_on_profile: true,
      });
    });
  });

  it("uploads selected media before submitting community posts", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);

    const { getByTestId, getByPlaceholderText } = render(
      <CommunityPostComposer onSubmit={onSubmit} />,
    );

    fireEvent.press(getByTestId("community-composer-media-button"));
    await waitFor(() => {
      expect(getByTestId("community-composer-media-preview")).toBeTruthy();
    });

    fireEvent.changeText(
      getByPlaceholderText("What is happening in this community?"),
      "  Photo update  ",
    );
    fireEvent.press(getByTestId("community-composer-submit"));

    await waitFor(() => {
      expect(mockUploadPostMedia).toHaveBeenCalledWith({
        uri: "file:///tmp/community-photo.png",
        name: "community-photo.png",
        type: "image/png",
      });
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "social",
        content: "Photo update",
        media_url: "https://cdn.example.com/community-photo.jpg",
        show_on_profile: false,
      });
    });
  });
});
