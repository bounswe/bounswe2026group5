import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { DiscoverFilterModal } from "@/components/discover/DiscoverFilterModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("DiscoverFilterModal", () => {
  it("filters skills by search text and calls onToggleSkill", () => {
    const onToggleSkill = jest.fn();
    const onClear = jest.fn();
    const onClose = jest.fn();

    const { getByTestId, queryByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker", "GraphQL", "React Native"]}
        selectedSkills={new Set(["GraphQL"])}
        onToggleSkill={onToggleSkill}
        onClear={onClear}
        onClose={onClose}
      />,
    );

    // Docker is visible before filtering
    expect(getByTestId("skill-Docker")).toBeTruthy();

    // Filter to only Docker
    fireEvent.changeText(getByTestId("skill-search-input"), "dock");

    expect(getByTestId("skill-Docker")).toBeTruthy();
    expect(queryByTestId("skill-GraphQL")).toBeNull();

    // Toggle Docker skill
    fireEvent.press(getByTestId("skill-Docker"));
    expect(onToggleSkill).toHaveBeenCalledWith("Docker");
  });

  it("calls onClear when clear button is pressed", () => {
    const onClear = jest.fn();

    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker"]}
        selectedSkills={new Set()}
        onToggleSkill={jest.fn()}
        onClear={onClear}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId("clear-button"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when apply button is pressed", () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker"]}
        selectedSkills={new Set()}
        onToggleSkill={jest.fn()}
        onClear={jest.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId("apply-button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows no-results state when search yields no matches", () => {
    const { getByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker", "GraphQL"]}
        selectedSkills={new Set()}
        onToggleSkill={jest.fn()}
        onClear={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId("skill-search-input"), "rust");
    expect(getByTestId("no-results-state")).toBeTruthy();
  });

  it("hides no-results state when there are matching skills", () => {
    const { getByTestId, queryByTestId } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker", "GraphQL"]}
        selectedSkills={new Set()}
        onToggleSkill={jest.fn()}
        onClear={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(getByTestId("skill-search-input"), "docker");
    expect(getByTestId("skill-Docker")).toBeTruthy();
    expect(queryByTestId("no-results-state")).toBeNull();
  });
});