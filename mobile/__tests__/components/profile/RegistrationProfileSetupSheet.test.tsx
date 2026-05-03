import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { RegistrationProfileSetupSheet } from "@/components/profile/RegistrationProfileSetupSheet";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("RegistrationProfileSetupSheet", () => {
  const baseProps = {
    visible: true,
    initialRole: "mentor" as const,
    username: "new_user",
    skills: ["React Native", "Testing"],
    isLoadingSkills: false,
    isSubmitting: false,
    submitError: "",
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows editable username with onboarding warning", () => {
    const { getByDisplayValue, getByText } = render(
      <RegistrationProfileSetupSheet {...baseProps} />,
    );

    expect(getByDisplayValue("new_user")).toBeTruthy();
    expect(getByText("This will be your username: @new_user")).toBeTruthy();
    expect(getByText("Display Name")).toBeTruthy();
  });

  it("blocks submit when the username is invalid", () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <RegistrationProfileSetupSheet {...baseProps} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText("Username"), "invalid username!");
    fireEvent.press(getByText("React Native"));
    fireEvent.press(getByText("Save and continue"));

    expect(
      getByText("Use only letters, numbers, and underscores."),
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed username and profile values", () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <RegistrationProfileSetupSheet {...baseProps} onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText("Username"), "  custom_user  ");
    fireEvent.changeText(getByLabelText("Display Name"), "  New User  ");
    fireEvent.changeText(getByLabelText("Bio"), "  Loves mentoring.  ");
    fireEvent.press(getByText("Testing"));
    fireEvent.press(getByText("Save and continue"));

    expect(onSubmit).toHaveBeenCalledWith({
      role: "mentor",
      username: "custom_user",
      displayName: "New User",
      bio: "Loves mentoring.",
      selectedSkills: ["Testing"],
    });
  });
});
