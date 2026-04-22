import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { AvailabilityPreview } from "@/components/profile/AvailabilityPreview";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("AvailabilityPreview", () => {
  it("shows empty-day state when selected day has no slots", () => {
    const { getByTestId } = render(
      <AvailabilityPreview
        schedule={[{ day: "Monday", times: ["10:00 - 11:00"] }]}
      />,
    );

    fireEvent.press(getByTestId("day-Tuesday"));
    expect(getByTestId("empty-day-state")).toBeTruthy();
  });

  it("renders available slot and fires onSelectSlot", () => {
    const onSelectSlot = jest.fn();

    const { getByTestId } = render(
      <AvailabilityPreview
        schedule={[
          {
            day: "Monday",
            times: [
              { id: "slot-1", label: "09:00 - 10:00", isBooked: false },
              { id: "slot-2", label: "10:00 - 11:00", isBooked: true },
            ],
          },
        ]}
        onSelectSlot={onSelectSlot}
      />,
    );

    fireEvent.press(getByTestId("day-Monday"));
    expect(getByTestId("slot-slot-1")).toBeTruthy();
    expect(getByTestId("slot-slot-2")).toBeTruthy();

    fireEvent.press(getByTestId("slot-slot-1"));
    expect(onSelectSlot).toHaveBeenCalledWith({
      day: "Monday",
      time: "09:00 - 10:00",
      slotId: "slot-1",
    });
  });

  it("renders edit availability button when onEdit is provided", () => {
    const onEdit = jest.fn();
    const { getByTestId } = render(
      <AvailabilityPreview
        schedule={[]}
        onEdit={onEdit}
      />,
    );

    fireEvent.press(getByTestId("edit-availability-button"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("shows empty-day state when a day with no slots is expanded", () => {
    const { getByTestId } = render(
      <AvailabilityPreview schedule={[]} />,
    );

    // Tap Monday to expand it — no schedule, so empty-day-state should appear
    fireEvent.press(getByTestId("day-Monday"));
    expect(getByTestId("empty-day-state")).toBeTruthy();
  });
});