import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { DiscoverFilterModal } from "@/components/discover/DiscoverFilterModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("DiscoverFilterModal", () => {
  it("filters skills by search text and calls actions", () => {
    const onToggleSkill = jest.fn();
    const onClear = jest.fn();
    const onClose = jest.fn();

    const { getByPlaceholderText, getByText, queryByText } = render(
      <DiscoverFilterModal
        visible
        allSkills={["Docker", "GraphQL", "React Native"]}
        selectedSkills={new Set(["GraphQL"])}
        onToggleSkill={onToggleSkill}
        onClear={onClear}
        onClose={onClose}
      />,
    );

    expect(getByText("Filter Skills")).toBeTruthy();
    expect(getByText("GraphQL")).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText("Search skills..."), "dock");

    expect(getByText("Docker")).toBeTruthy();
    expect(queryByText("GraphQL")).toBeNull();

    fireEvent.press(getByText("Docker"));
    fireEvent.press(getByText("Clear"));
    fireEvent.press(getByText("Apply"));

    expect(onToggleSkill).toHaveBeenCalledWith("Docker");
    expect(onClear).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
