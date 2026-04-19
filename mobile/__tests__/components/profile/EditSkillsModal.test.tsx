import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { EditSkillsModal } from "@/components/profile/EditSkillsModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("EditSkillsModal", () => {
  it("adds and removes skills from available suggestions", () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <EditSkillsModal
        visible
        onClose={onClose}
        title="Expertise"
        initialSkills={["React"]}
        variant="mentor"
        availableSkills={["React", "TypeScript", "GraphQL"]}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(getByPlaceholderText("Search for a skill..."), "type");
    fireEvent.press(getByText("TypeScript"));

    expect(getByText("TypeScript")).toBeTruthy();

    fireEvent.changeText(
      getByPlaceholderText("Search for a skill..."),
      "react",
    );
    expect(getByText("No matching skills found.")).toBeTruthy();

    fireEvent.press(getByText("Save Changes"));

    expect(onSave).toHaveBeenCalledWith(["React", "TypeScript"]);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows no-match state for unknown search", () => {
    const { getByPlaceholderText, getByText } = render(
      <EditSkillsModal
        visible
        onClose={jest.fn()}
        title="Eager to Learn"
        initialSkills={[]}
        variant="mentee"
        availableSkills={["React", "GraphQL"]}
        onSave={jest.fn()}
      />,
    );

    fireEvent.changeText(getByPlaceholderText("Search for a skill..."), "rust");

    expect(getByText("No matching skills found.")).toBeTruthy();
  });
});
