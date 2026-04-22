import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { FeedbackBottomSheet } from "@/components/connections/FeedbackBottomSheet";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("FeedbackBottomSheet", () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders submit and cancel buttons when visible", () => {
    const { getByTestId } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    expect(getByTestId("submit-review-button")).toBeTruthy();
    expect(getByTestId("cancel-button")).toBeTruthy();
  });

  it("displays the correct role badge", () => {
    const { getByTestId } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    expect(getByTestId("role-badge-mentor")).toBeTruthy();
  });

  it("shows error message when submitting without a rating", async () => {
    const { getByTestId } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    fireEvent.press(getByTestId("submit-review-button"));

    await waitFor(() => {
      expect(getByTestId("error-message")).toBeTruthy();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("calls onClose when Cancel button is pressed", () => {
    const { getByTestId } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    fireEvent.press(getByTestId("cancel-button"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("does not render buttons when visible is false", () => {
    const { queryByTestId } = render(
      <FeedbackBottomSheet
        visible={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    expect(queryByTestId("submit-review-button")).toBeNull();
    expect(queryByTestId("cancel-button")).toBeNull();
  });

  it("successfully submits feedback after selecting a rating", async () => {
    const { getByTestId } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    fireEvent.press(getByTestId("star-5"));
    fireEvent.press(getByTestId("submit-review-button"));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(5, undefined);
    });
  });

  it("does not show error message before any submission attempt", () => {
    const { queryByTestId } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    expect(queryByTestId("error-message")).toBeNull();
  });
});
