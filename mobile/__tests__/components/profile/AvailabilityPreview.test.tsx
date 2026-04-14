import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { AvailabilityPreview } from "@/components/profile/AvailabilityPreview";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("AvailabilityPreview", () => {
  it("shows empty-day feedback when selected day has no slots", () => {
    const { getByText } = render(
      <AvailabilityPreview
        schedule={[{ day: "Monday", times: ["10:00 - 11:00"] }]}
      />,
    );

    fireEvent.press(getByText("Tue"));

    expect(getByText("No availability on Tuesday")).toBeTruthy();
  });

  it("renders day slots and selects an available slot", () => {
    const onSelectSlot = jest.fn();

    const { getByText } = render(
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

    fireEvent.press(getByText("Mon"));

    expect(getByText("09:00 - 10:00")).toBeTruthy();
    expect(getByText("10:00 - 11:00")).toBeTruthy();
    expect(getByText("Booked")).toBeTruthy();

    fireEvent.press(getByText("09:00 - 10:00"));

    expect(onSelectSlot).toHaveBeenCalledWith({
      day: "Monday",
      time: "09:00 - 10:00",
      slotId: "slot-1",
    });
  });
});
