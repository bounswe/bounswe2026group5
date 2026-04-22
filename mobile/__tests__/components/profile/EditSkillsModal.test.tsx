import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { EditSkillsModal } from "@/components/profile/EditSkillsModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("EditSkillsModal", () => {
  it("adds a skill from suggestions and saves", () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = render(
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

    fireEvent.changeText(getByTestId("search-input"), "type");
    expect(getByTestId("skill-suggestion-TypeScript")).toBeTruthy();

    fireEvent.press(getByTestId("skill-suggestion-TypeScript"));

    fireEvent.press(getByTestId("save-changes-button"));
    expect(onSave).toHaveBeenCalledWith(["React", "TypeScript"]);
    expect(onClose).toHaveBeenCalled();
  });

  it("removes a skill using the remove button", () => {
    const onSave = jest.fn();

    const { getByTestId } = render(
      <EditSkillsModal
        visible
        onClose={jest.fn()}
        title="Expertise"
        initialSkills={["React", "TypeScript"]}
        variant="mentor"
        availableSkills={["React", "TypeScript", "GraphQL"]}
        onSave={onSave}
      />,
    );

    fireEvent.press(getByTestId("remove-skill-React"));

    fireEvent.press(getByTestId("save-changes-button"));
    expect(onSave).toHaveBeenCalledWith(["TypeScript"]);
  });

  it("shows no-results state when search yields no matches", () => {
    const { getByTestId } = render(
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

    fireEvent.changeText(getByTestId("search-input"), "rust");
    expect(getByTestId("no-results-state")).toBeTruthy();
  });

  it("hides no-results state when there are matching suggestions", () => {
    const { getByTestId, queryByTestId } = render(
      <EditSkillsModal
        visible
        onClose={jest.fn()}
        title="Expertise"
        initialSkills={[]}
        variant="mentor"
        availableSkills={["React", "TypeScript"]}
        onSave={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId("search-input"), "react");
    expect(getByTestId("skill-suggestion-React")).toBeTruthy();
    expect(queryByTestId("no-results-state")).toBeNull();
  });
});