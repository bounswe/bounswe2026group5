import { render } from "@testing-library/react-native";
import React from "react";

jest.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => {
    const { View } = jest.requireActual("react-native");
    return <View testID={`redirect-${href.replace(/\//g, "-")}`} />;
  },
}));

import Index from "@/app/index";

describe("Index screen", () => {
  it("renders a redirect to /login", () => {
    const { getByTestId } = render(<Index />);
    expect(getByTestId("redirect--login")).toBeTruthy();
  });
});