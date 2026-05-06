import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { ProfilePostComposer } from "@/components/profile/ProfilePostComposer";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("ProfilePostComposer", () => {
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
});
