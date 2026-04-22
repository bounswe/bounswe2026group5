import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

import { DeclineConfirmModal } from "@/components/connections/DeclineConfirmModal";

describe("DeclineConfirmModal — visibility", () => {
  it("renders nothing when visible is false", () => {
    const { queryByTestId } = render(
      <DeclineConfirmModal visible={false} onCancel={jest.fn()} onConfirm={jest.fn()} />
    );
    expect(queryByTestId("decline-modal-cancel")).toBeNull();
    expect(queryByTestId("decline-modal-confirm")).toBeNull();
  });

  it("renders buttons when visible is true", () => {
    const { getByTestId } = render(
      <DeclineConfirmModal visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} />
    );
    expect(getByTestId("decline-modal-cancel")).toBeTruthy();
    expect(getByTestId("decline-modal-confirm")).toBeTruthy();
  });
});

describe("DeclineConfirmModal — interactions", () => {
  it("calls onCancel when cancel button is pressed", () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <DeclineConfirmModal visible={true} onCancel={onCancel} onConfirm={jest.fn()} />
    );
    fireEvent.press(getByTestId("decline-modal-cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onConfirm when confirm button is pressed", () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <DeclineConfirmModal visible={true} onCancel={jest.fn()} onConfirm={onConfirm} />
    );
    fireEvent.press(getByTestId("decline-modal-confirm"));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe("DeclineConfirmModal — loading state", () => {
  it("disables cancel button when isLoading is true", () => {
    const { getByTestId } = render(
      <DeclineConfirmModal visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} isLoading />
    );
    expect(getByTestId("decline-modal-cancel").props.accessibilityState?.disabled).toBe(true);
  });

  it("disables confirm button when isLoading is true", () => {
    const { getByTestId } = render(
      <DeclineConfirmModal visible={true} onCancel={jest.fn()} onConfirm={jest.fn()} isLoading />
    );
    expect(getByTestId("decline-modal-confirm").props.accessibilityState?.disabled).toBe(true);
  });
});