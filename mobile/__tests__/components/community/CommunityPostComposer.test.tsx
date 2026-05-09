import { fireEvent, render, waitFor, act } from "@testing-library/react-native";
import React from "react";

import { CommunityPostComposer } from "@/components/community/CommunityPostComposer";
import { pickPostImageFile } from "@/lib/uploads/picker";
import { uploadPostMedia } from "@/lib/queries/uploads";
import type { ReactTestInstance } from "react-test-renderer";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/uploads/picker", () => ({
  pickPostImageFile: jest.fn(),
  pickPostDocumentFile: jest.fn(),
}));

jest.mock("@/lib/queries/uploads", () => ({
  uploadPostMedia: jest.fn(),
}));

function expandComposer(getByTestId: (testID: string) => ReactTestInstance) {
  fireEvent.press(getByTestId("community-composer-toggle"));
}

describe("CommunityPostComposer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pickPostImageFile as jest.Mock).mockResolvedValue({
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

    expandComposer(getByTestId);

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

    expandComposer(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId("community-composer-image-button"));
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

  it("adds inline mentioned usernames to the community post payload", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);

    const { getByPlaceholderText, getByTestId } = render(
      <CommunityPostComposer
        onSubmit={onSubmit}
        taggableUsers={[
          { username: "ayse", display_name: "Ayse Kaya" },
          { username: "mehmet", display_name: "Mehmet Demir" },
        ]}
      />,
    );

    expandComposer(getByTestId);

    fireEvent.changeText(
      getByPlaceholderText("What is happening in this community?"),
      "  Pairing notes @ays",
    );
    fireEvent.press(
      getByTestId("community-composer-mention-suggestion-ayse"),
    );

    await act(async () => {
      fireEvent.press(getByTestId("community-composer-submit"));
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "social",
        content: "Pairing notes @ayse",
        show_on_profile: false,
        tagged_users: ["ayse"],
      });
    });
  });

  it("starts collapsed until the arrow is pressed", () => {
    const { getByPlaceholderText, getByTestId, queryByPlaceholderText } = render(
      <CommunityPostComposer onSubmit={jest.fn()} />,
    );

    expect(
      queryByPlaceholderText("What is happening in this community?"),
    ).toBeNull();

    expandComposer(getByTestId);

    expect(
      getByPlaceholderText("What is happening in this community?"),
    ).toBeTruthy();
  });
});
