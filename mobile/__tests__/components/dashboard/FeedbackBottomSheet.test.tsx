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

  it("renders correctly when visible", () => {
    const { getByText } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    expect(getByText("Submit Review")).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
  });

  it("shows an error if submitting without a rating", async () => {
    const { getByText, findByText } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    fireEvent.press(getByText("Submit Review"));

    // Validation error should appear
    expect(await findByText("Please select a rating")).toBeTruthy();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("calls onClose when Cancel is pressed", () => {
    const { getByText } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    fireEvent.press(getByText("Cancel"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when visible is false", () => {
    const { queryByText } = render(
      <FeedbackBottomSheet
        visible={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    expect(queryByText("Submit Review")).toBeNull();
  });

  it("successfully submits feedback with text and rating", async () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <FeedbackBottomSheet
        visible={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        otherUserName="Jane Doe"
      />
    );

    const textInput = getByPlaceholderText(/Share your thoughts/i);
    fireEvent.changeText(textInput, "Jane was an amazing mentor! Very helpful.");

    const fiveStarButton = getByTestId("star-5");
    fireEvent.press(fiveStarButton);

    fireEvent.press(getByText("Submit Review"));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        5, 
        "Jane was an amazing mentor! Very helpful."
      );
    });
  });
});
