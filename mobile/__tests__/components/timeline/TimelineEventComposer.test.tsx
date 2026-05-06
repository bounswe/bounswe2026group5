import { fireEvent, render, waitFor, act } from "@testing-library/react-native";
import React from "react";

import { TimelineEventComposer } from "@/components/timeline/TimelineEventComposer";
import { pickPostMediaFile } from "@/lib/uploads/picker";
import { uploadPostMedia } from "@/lib/queries/uploads";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/uploads/picker", () => ({
  pickPostMediaFile: jest.fn(),
}));

jest.mock("@/lib/queries/uploads", () => ({
  uploadPostMedia: jest.fn(),
}));

describe("TimelineEventComposer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pickPostMediaFile as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/milestone.webp",
      name: "milestone.webp",
      type: "image/webp",
    });
    (uploadPostMedia as jest.Mock).mockResolvedValue({
      url: "https://cdn.example.com/milestone.jpg",
    });
  });

  it("submits trimmed milestone content and profile visibility", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const onClose = jest.fn();

    const { getByTestId, getByPlaceholderText } = render(
      <TimelineEventComposer
        visible
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.changeText(
      getByPlaceholderText("What happened on this journey?"),
      "  Finished the first sprint  ",
    );
    fireEvent.press(getByTestId("timeline-composer-type-progress"));
    fireEvent(getByTestId("timeline-composer-profile-toggle"), "valueChange", true);
    
    await act(async () => {
      fireEvent.press(getByTestId("timeline-composer-submit"));
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "progress",
        content: "Finished the first sprint",
        show_on_profile: true,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("uploads selected media before submitting milestones", async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);

    const { getByTestId, getByPlaceholderText } = render(
      <TimelineEventComposer visible onClose={jest.fn()} onSubmit={onSubmit} />,
    );

    await act(async () => {
      fireEvent.press(getByTestId("timeline-composer-media-button"));
    });
    
    await waitFor(() => {
      expect(getByTestId("timeline-composer-media-preview")).toBeTruthy();
    });

    fireEvent.changeText(
      getByPlaceholderText("What happened on this journey?"),
      "  Added a diagram  ",
    );
    
    await act(async () => {
      fireEvent.press(getByTestId("timeline-composer-submit"));
    });

    await waitFor(() => {
      expect(uploadPostMedia).toHaveBeenCalledWith({
        uri: "file:///tmp/milestone.webp",
        name: "milestone.webp",
        type: "image/webp",
      });
      expect(onSubmit).toHaveBeenCalledWith({
        event_type: "achievement",
        content: "Added a diagram",
        media_url: "https://cdn.example.com/milestone.jpg",
        show_on_profile: false,
      });
    });
  });
});
