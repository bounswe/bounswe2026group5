import React from "react";
import { render } from "@testing-library/react-native";

import { RegistrationProfileSetupSheet } from "@/components/profile/RegistrationProfileSetupSheet";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("RegistrationProfileSetupSheet", () => {
  it("shows generated username as read-only onboarding context", () => {
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
        "Your username is generated during registration. It is shown here for reference and cannot be edited in the current backend flow.",
      ),
    ).toBeTruthy();
  });
});
