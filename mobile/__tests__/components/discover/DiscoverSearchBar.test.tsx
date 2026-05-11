import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { DiscoverSearchBar } from "@/components/discover/DiscoverSearchBar";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));
jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

describe("DiscoverSearchBar", () => {
  it("renders the default placeholder when none is provided", () => {
    const { getByPlaceholderText } = render(
      <DiscoverSearchBar
        value=""
        onChangeText={jest.fn()}
        testID="search-input"
      />,
    );

    expect(
      getByPlaceholderText("Search mentors, skills, topics..."),
    ).toBeTruthy();
  });

  it("renders a custom placeholder when the prop is set", () => {
    const { getByPlaceholderText } = render(
      <DiscoverSearchBar
        value=""
        onChangeText={jest.fn()}
        placeholder="Find a mentor..."
        testID="search-input"
      />,
    );

    expect(getByPlaceholderText("Find a mentor...")).toBeTruthy();
  });

  it("forwards typed text to onChangeText", () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <DiscoverSearchBar
        value=""
        onChangeText={onChangeText}
        testID="search-input"
      />,
    );

    fireEvent.changeText(getByTestId("search-input"), "React Native");

    expect(onChangeText).toHaveBeenCalledWith("React Native");
  });

  it("reflects the controlled value prop in the input", () => {
    const { getByDisplayValue } = render(
      <DiscoverSearchBar
        value="GraphQL"
        onChangeText={jest.fn()}
        testID="search-input"
      />,
    );

    expect(getByDisplayValue("GraphQL")).toBeTruthy();
  });
});
