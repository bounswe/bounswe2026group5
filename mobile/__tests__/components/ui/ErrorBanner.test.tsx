import React from "react";
import { render } from "@testing-library/react-native";

import { ErrorBanner } from "@/components/ui/ErrorBanner";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("ErrorBanner", () => {
  it("renders title and message", () => {
    const { getByText } = render(
      <ErrorBanner
        title="Registration failed"
        message="A user with this email already exists."
      />,
    );

    expect(getByText("Registration failed")).toBeTruthy();
    expect(getByText("A user with this email already exists.")).toBeTruthy();
  });

  it("does not render for an empty message", () => {
    const { queryByText } = render(<ErrorBanner message="   " />);

    expect(queryByText("Something went wrong")).toBeNull();
  });
});
