import React from "react";
import { render } from "@testing-library/react-native";

import { RegistrationProfileSetupSheet } from "@/components/profile/RegistrationProfileSetupSheet";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("RegistrationProfileSetupSheet", () => {
  it("shows username preview as read-only onboarding context", () => {
    const { getByText } = render(
      <RegistrationProfileSetupSheet
        visible={true}
        role="mentor"
        username="new_user"
        skills={[]}
        isLoadingSkills={false}
        isSubmitting={false}
        submitError=""
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(getByText("Username")).toBeTruthy();
    expect(getByText("@new_user")).toBeTruthy();
    expect(
      getByText(
        "This is the username preview for your account. The backend still assigns the final username during registration, so it may change slightly if that handle is already taken, and it cannot be edited in the current flow.",
      ),
    ).toBeTruthy();
  });
});
