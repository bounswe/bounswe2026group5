import { fireEvent, render, waitFor, act } from "@testing-library/react-native";
import React from "react";

import { CommunityPostComposer } from "@/components/community/CommunityPostComposer";
import { pickPostMediaFile } from "@/lib/uploads/picker";
import { uploadPostMedia } from "@/lib/queries/uploads";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/uploads/picker", () => ({
  pickPostMediaFile: jest.fn(),
}));

jest.mock("@/lib/queries/uploads", () => ({
  uploadPostMedia: jest.fn(),
}));

describe("CommunityPostComposer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pickPostMediaFile as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/community-photo.png",
      name: "community-photo.png",
      type: "image/png",
    });
    (uploadPostMedia as jest.Mock).mockResolvedValue({
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
    
    await act(async () => {
      fireEvent.press(getByTestId("community-composer-submit"));
    });

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

    await act(async () => {
      fireEvent.press(getByTestId("community-composer-media-button"));
    });
    
    await waitFor(() => {
      expect(getByTestId("community-composer-media-preview")).toBeTruthy();
    });

    fireEvent.changeText(
      getByPlaceholderText("What is happening in this community?"),
      "  Photo update  ",
    );
    
    await act(async () => {
      fireEvent.press(getByTestId("community-composer-submit"));
    });

    await waitFor(() => {
      expect(uploadPostMedia).toHaveBeenCalledWith({
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
