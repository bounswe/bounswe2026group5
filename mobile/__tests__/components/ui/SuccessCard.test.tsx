import React from "react";
import { render } from "@testing-library/react-native";

import { SuccessCard } from "@/components/ui/SuccessCard";
import { ToastProvider } from "@/components/ui/ToastProvider";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("SuccessCard", () => {
  it("renders the default success title and message", () => {
    const { getByText } = render(
      <SuccessCard message="Your session was updated." />,
    );

    expect(getByText("Success")).toBeTruthy();
    expect(getByText("Your session was updated.")).toBeTruthy();
  });

  it("can publish success messages through the toast provider", () => {
    const { getByText, queryByText } = render(
      <ToastProvider>
        <SuccessCard
          message="Your session was updated."
          presentation="toast"
        />
      </ToastProvider>,
    );

    expect(queryByText("Done")).toBeNull();
    expect(getByText("Success")).toBeTruthy();
    expect(getByText("Your session was updated.")).toBeTruthy();
  });
});
