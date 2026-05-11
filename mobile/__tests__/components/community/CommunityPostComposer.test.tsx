import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { CommunityPostComposer } from "@/components/community/CommunityPostComposer";
import { uploadPostMedia } from "@/lib/queries/uploads";
import { pickPostImageFile } from "@/lib/uploads/picker";
import type { ReactTestInstance } from "react-test-renderer";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  const MockDateTimePicker = (props: Record<string, unknown>) => {
    return <View {...props} />;
  };
  return {
    __esModule: true,
    default: MockDateTimePicker,
    DateTimePickerAndroid: {
      open: jest.fn(),
    },
  };
});

jest.mock("@/lib/uploads/picker", () => ({
  pickPostImageFile: jest.fn(),
  pickPostDocumentFile: jest.fn(),
}));

jest.mock("@/lib/queries/uploads", () => ({
  uploadPostMedia: jest.fn(),
}));

const mockToastWarning = jest.fn();

jest.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({
    warning: (...args: unknown[]) => mockToastWarning(...args),
  }),
}));

function expandComposer(getByTestId: (testID: string) => ReactTestInstance) {
  fireEvent.press(getByTestId("community-composer-toggle"));
}

describe("CommunityPostComposer", () => {
  const buildWorkshopDateTime = (dateValue: Date, timeValue: Date) => {
    const combined = new Date(dateValue);
    combined.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
    return combined.toISOString();
  };

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
    fireEvent.press(getByTestId("community-composer-mention-suggestion-ayse"));

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
    const { getByPlaceholderText, getByTestId, queryByPlaceholderText } =
      render(<CommunityPostComposer onSubmit={jest.fn()} />);

    expect(
      queryByPlaceholderText("What is happening in this community?"),
    ).toBeNull();

    expandComposer(getByTestId);

    expect(
      getByPlaceholderText("What is happening in this community?"),
    ).toBeTruthy();
  });

  it("submits workshop payloads for mentor-only workshop mode", async () => {
    const onSubmit = jest.fn();
    const onSubmitWorkshop = jest.fn().mockResolvedValue(true);

    const { getByPlaceholderText, getByTestId } = render(
      <CommunityPostComposer
        onSubmit={onSubmit}
        onSubmitWorkshop={onSubmitWorkshop}
        allowWorkshopCreation
      />,
    );

    expandComposer(getByTestId);
    fireEvent.press(getByTestId("community-composer-mode-workshop"));

    fireEvent.changeText(
      getByPlaceholderText("Workshop title"),
      " Mobile Testing Clinic ",
    );
    fireEvent.changeText(
      getByPlaceholderText("Workshop description"),
      " Walkthrough for flaky tests ",
    );
    fireEvent.press(getByTestId("community-composer-workshop-date-trigger"));
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 4, 20, 0, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));
    fireEvent.changeText(getByPlaceholderText("Capacity"), "18");
    fireEvent.press(
      getByTestId("community-composer-workshop-start-time-trigger"),
    );
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 4, 20, 14, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));
    fireEvent.press(
      getByTestId("community-composer-workshop-end-time-trigger"),
    );
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 4, 20, 16, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));

    await act(async () => {
      fireEvent.press(getByTestId("community-composer-submit"));
    });

    const expectedDate = new Date(2026, 4, 20, 0, 0);
    const expectedStart = new Date(2026, 4, 20, 14, 0);
    const expectedEnd = new Date(2026, 4, 20, 16, 0);

    await waitFor(() => {
      expect(onSubmitWorkshop).toHaveBeenCalledWith({
        title: "Mobile Testing Clinic",
        description: "Walkthrough for flaky tests",
        scheduled_at: buildWorkshopDateTime(expectedDate, expectedStart),
        end_at: buildWorkshopDateTime(expectedDate, expectedEnd),
        max_participants: 18,
      });
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("validates workshop end time before submit", async () => {
    const onSubmitWorkshop = jest.fn();

    const { getByPlaceholderText, getByTestId, findByTestId } = render(
      <CommunityPostComposer
        onSubmit={jest.fn()}
        onSubmitWorkshop={onSubmitWorkshop}
        allowWorkshopCreation
      />,
    );

    expandComposer(getByTestId);
    fireEvent.press(getByTestId("community-composer-mode-workshop"));
    fireEvent.changeText(getByPlaceholderText("Workshop title"), "Workshop");
    fireEvent.press(getByTestId("community-composer-workshop-date-trigger"));
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 4, 20, 0, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));
    fireEvent.changeText(getByPlaceholderText("Capacity"), "10");
    fireEvent.press(
      getByTestId("community-composer-workshop-start-time-trigger"),
    );
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 4, 20, 16, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));
    fireEvent.press(
      getByTestId("community-composer-workshop-end-time-trigger"),
    );
    fireEvent(
      getByTestId("community-composer-workshop-picker"),
      "onChange",
      { type: "set" },
      new Date(2026, 4, 20, 15, 0),
    );
    fireEvent.press(getByTestId("community-composer-workshop-picker-confirm"));

    await act(async () => {
      fireEvent.press(getByTestId("community-composer-submit"));
    });

    expect(await findByTestId("community-composer-form-error")).toBeTruthy();
    expect(mockToastWarning).toHaveBeenCalledWith(
      "Workshop end time must be after the start time.",
      { title: "Workshop details" },
    );
    expect(onSubmitWorkshop).not.toHaveBeenCalled();
  });
});
