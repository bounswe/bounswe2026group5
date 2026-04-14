import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { act } from "react-test-renderer";
import React from "react";
import { Alert } from "react-native";

import { EditAvailabilityModal } from "@/components/profile/EditAvailabilityModal";

const mockCreateAvailabilitySlotMutation = jest.fn();
const mockDeleteAvailabilitySlotMutation = jest.fn();
const mockRespondToMentorshipRequestMutation = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/queries/mentorship", () => ({
  useCreateAvailabilitySlotMutation: () => mockCreateAvailabilitySlotMutation(),
  useDeleteAvailabilitySlotMutation: () => mockDeleteAvailabilitySlotMutation(),
  useRespondToMentorshipRequestMutation: () =>
    mockRespondToMentorshipRequestMutation(),
}));

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

describe("EditAvailabilityModal", () => {
  const createMutateAsync = jest.fn();
  const deleteMutateAsync = jest.fn();
  const respondMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createMutateAsync.mockResolvedValue(undefined);
    deleteMutateAsync.mockResolvedValue(undefined);
    respondMutateAsync.mockResolvedValue(undefined);
    mockCreateAvailabilitySlotMutation.mockReturnValue({
      mutateAsync: createMutateAsync,
      isPending: false,
    });
    mockDeleteAvailabilitySlotMutation.mockReturnValue({
      mutateAsync: deleteMutateAsync,
      isPending: false,
    });
    mockRespondToMentorshipRequestMutation.mockReturnValue({
      mutateAsync: respondMutateAsync,
      isPending: false,
    });
  });

  it("creates a new slot when tapping an inactive hour", async () => {
    const onChanged = jest.fn();
    const monday = toDateString(getMonday(new Date()));

    const { getByText } = render(
      <EditAvailabilityModal
        visible
        onClose={jest.fn()}
        username="mentor-1"
        slots={[]}
        onChanged={onChanged}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText("09:00 - 10:00"));
    });

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        date: monday,
        startTime: "09:00:00",
        endTime: "10:00:00",
      });
      expect(onChanged).toHaveBeenCalled();
    });
  });

  it("alerts when trying to deactivate a booked slot", () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const monday = toDateString(getMonday(new Date()));

    const { getByText } = render(
      <EditAvailabilityModal
        visible
        onClose={jest.fn()}
        username="mentor-1"
        slots={[
          {
            id: "slot-1",
            date: monday,
            startTime: "09:00:00",
            endTime: "10:00:00",
            is_booked: true,
          },
        ]}
      />,
    );

    fireEvent.press(getByText("09:00 - 10:00"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Cannot Make Slot Unavailable",
      expect.stringContaining("planned session"),
    );
  });
});
