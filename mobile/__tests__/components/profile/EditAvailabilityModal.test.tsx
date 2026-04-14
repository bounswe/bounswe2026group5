import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { EditAvailabilityModal } from "@/components/profile/EditAvailabilityModal";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

describe("EditAvailabilityModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves enabled days with valid slots", () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    const { getByText, getAllByDisplayValue } = render(
      <EditAvailabilityModal
        visible
        onClose={onClose}
        initialSchedule={[{ day: "Monday", times: ["09:00 - 17:00"] }]}
        onSave={onSave}
      />,
    );

    const startTimes = getAllByDisplayValue("09:00");
    const endTimes = getAllByDisplayValue("17:00");

    fireEvent.changeText(startTimes[0], "10:00");
    fireEvent.changeText(endTimes[0], "12:30");

    fireEvent.press(getByText("Save"));

    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          day: "Monday",
          times: ["10:00 - 12:30"],
        }),
      ]),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("alerts when time format is invalid", () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");

    const { getByText, getAllByDisplayValue } = render(
      <EditAvailabilityModal
        visible
        onClose={jest.fn()}
        initialSchedule={[{ day: "Monday", times: ["09:00 - 17:00"] }]}
        onSave={jest.fn()}
      />,
    );

    fireEvent.changeText(getAllByDisplayValue("09:00")[0], "9am");
    fireEvent.press(getByText("Save"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Invalid Format",
      "Please use the 24-hour format (e.g., 09:00, 14:30).",
      [{ text: "Got it" }],
    );
  });

  it("alerts when start time is not before end time", () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");

    const { getByText, getAllByDisplayValue } = render(
      <EditAvailabilityModal
        visible
        onClose={jest.fn()}
        initialSchedule={[{ day: "Monday", times: ["09:00 - 17:00"] }]}
        onSave={jest.fn()}
      />,
    );

    fireEvent.changeText(getAllByDisplayValue("09:00")[0], "18:00");
    fireEvent.changeText(getAllByDisplayValue("17:00")[0], "17:00");
    fireEvent.press(getByText("Save"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Invalid Time Range",
      "The start time must be before the end time.",
      [{ text: "Got it" }],
    );
  });
});
