import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { CommunityPostComposer } from "@/components/community/CommunityPostComposer";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("CommunityPostComposer", () => {
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
});
